import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = "https://qqewkrdaxwsjzclvspbv.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_KEY) { console.error("Set SUPABASE_SECRET_KEY"); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const TMP_DIR = path.join(__dirname, "..", "uploaded_img", "thumbs_tmp");

async function main() {
  fs.mkdirSync(TMP_DIR, { recursive: true });

  const { data: photos, error } = await supabase.from("photos").select("id, image_url");
  if (error) { console.error(error); return; }

  console.log(`Processing ${photos.length} photos...`);

  for (const photo of photos) {
    // Download original from Supabase
    const origUrl = photo.image_url;
    const tmpOrig = path.join(TMP_DIR, `orig_${photo.id}.jpg`);
    const tmpThumb = path.join(TMP_DIR, `thumb_${photo.id}.jpg`);

    try {
      // Download
      execSync(`curl -sL -o "${tmpOrig}" "${origUrl}"`);

      // Resize with sips
      execSync(`sips -Z 800 -s format jpeg -s formatOptions 70 "${tmpOrig}" --out "${tmpThumb}" 2>/dev/null`);

      const thumbBuffer = fs.readFileSync(tmpThumb);
      const thumbPath = `thumbs/${photo.id}.jpg`;

      // Upload thumb
      const { error: upErr } = await supabase.storage
        .from("photos")
        .upload(thumbPath, thumbBuffer, { contentType: "image/jpeg", upsert: true });

      if (upErr) {
        console.error(`Upload failed ${photo.id}: ${upErr.message}`);
        continue;
      }

      const thumbUrl = `${SUPABASE_URL}/storage/v1/object/public/photos/${thumbPath}`;

      // Update DB
      const { error: updateErr } = await supabase
        .from("photos")
        .update({ thumb_url: thumbUrl })
        .eq("id", photo.id);

      if (updateErr) {
        console.error(`DB update failed: ${updateErr.message}`);
      } else {
        const origSize = fs.statSync(tmpOrig).size;
        const thumbSize = thumbBuffer.length;
        console.log(`OK: ${photo.id} (${(origSize/1024/1024).toFixed(1)}MB -> ${(thumbSize/1024).toFixed(0)}KB)`);
      }

      // Cleanup
      fs.unlinkSync(tmpOrig);
      fs.unlinkSync(tmpThumb);
    } catch (e) {
      console.error(`Error ${photo.id}: ${e.message}`);
    }
  }

  fs.rmdirSync(TMP_DIR, { recursive: true });
  console.log("Done!");
}

main().catch(console.error);
