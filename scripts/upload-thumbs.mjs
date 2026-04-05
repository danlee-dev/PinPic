import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = "https://qqewkrdaxwsjzclvspbv.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_KEY) { console.error("Set SUPABASE_SECRET_KEY"); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const THUMB_DIR = path.join(__dirname, "..", "uploaded_img", "thumbs");

async function main() {
  // Get all photos from DB
  const { data: photos, error } = await supabase.from("photos").select("id, image_url");
  if (error) { console.error(error); return; }

  console.log(`Found ${photos.length} photos in DB`);

  for (const photo of photos) {
    // Extract original storage path from URL
    // URL format: .../storage/v1/object/public/photos/photos/1234-abc.jpg
    const match = photo.image_url.match(/\/photos\/(photos\/[^?]+)/);
    if (!match) {
      console.log(`SKIP: ${photo.id} - can't parse URL`);
      continue;
    }

    const origPath = match[1]; // photos/1234-abc.jpg
    const origFilename = path.basename(origPath);

    // Find matching thumb file - thumbs have .jpg extension
    const thumbFiles = fs.readdirSync(THUMB_DIR);

    // Upload thumb with "thumb_" prefix
    const thumbStoragePath = `thumbs/${origFilename.replace(/\.\w+$/, ".jpg")}`;
    const thumbLocalPath = findThumbForOriginal(photo.image_url, thumbFiles);

    if (!thumbLocalPath) {
      console.log(`SKIP: ${photo.id} - no thumb found`);
      continue;
    }

    const filePath = path.join(THUMB_DIR, thumbLocalPath);
    const fileBuffer = fs.readFileSync(filePath);

    const { error: upErr } = await supabase.storage
      .from("photos")
      .upload(thumbStoragePath, fileBuffer, { contentType: "image/jpeg", upsert: true });

    if (upErr) {
      console.error(`Upload failed: ${upErr.message}`);
      continue;
    }

    const thumbUrl = `${SUPABASE_URL}/storage/v1/object/public/photos/${thumbStoragePath}`;

    const { error: updateErr } = await supabase
      .from("photos")
      .update({ thumb_url: thumbUrl })
      .eq("id", photo.id);

    if (updateErr) {
      console.error(`Update failed: ${updateErr.message}`);
    } else {
      console.log(`OK: ${photo.id} -> ${thumbStoragePath} (${(fileBuffer.length / 1024).toFixed(0)}KB)`);
    }
  }

  console.log("Done!");
}

function findThumbForOriginal(imageUrl, thumbFiles) {
  // Try to match by the unique hash in the filename
  for (const tf of thumbFiles) {
    // Extract hash part from original URL
    const urlParts = imageUrl.split("/");
    const origName = urlParts[urlParts.length - 1];
    const origBase = origName.replace(/\.\w+$/, "");

    if (tf.replace(/\.\w+$/, "") === origBase) {
      return tf;
    }
  }
  return null;
}

main().catch(console.error);
