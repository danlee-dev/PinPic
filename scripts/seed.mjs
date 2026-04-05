import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = "https://qqewkrdaxwsjzclvspbv.supabase.co";
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_SECRET) {
  console.error("Set SUPABASE_SECRET_KEY env var");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET);

const IMG_DIR = path.join(__dirname, "..", "uploaded_img");

function parseCSV(text) {
  const lines = [];
  let current = "";
  let inQuote = false;
  for (const char of text) {
    if (char === '"') { inQuote = !inQuote; current += char; }
    else if (char === "\n" && !inQuote) { lines.push(current); current = ""; }
    else { current += char; }
  }
  if (current.trim()) lines.push(current);

  return lines.map((line) => {
    const fields = [];
    let field = "";
    let inQ = false;
    for (const c of line) {
      if (c === '"') inQ = !inQ;
      else if (c === "," && !inQ) { fields.push(field.trim()); field = ""; }
      else field += c;
    }
    fields.push(field.trim());
    return fields;
  });
}

// Manual mapping: CSV nickname -> image filename
const MANUAL_MAP = {
  "asd": "빡센 포스터 - 조영환.png", // test entry by yeonghwan.dev, first submission
  "김성민": "IMG_1330 - 김성민(공과대학 전기전자공학).jpeg",
  "반진현": "inbound8570472347069040457 - 반진현.jpg",
  "배종호": "IMG_6284 - _.jpeg",
  "Lucia": "inbound6045962280898166337 - Lucia An.jpg",
  "zan": "inbound6854518348105315774 - 지안.jpg",
  "맛차": "IMG_4870 - 김서영.jpeg",
  "류노보노": "IMG_6911 - Yeonwoo Lyu.jpeg",
  "dbsk": "IMG_3372 - 손유나.jpeg",
  "주승환": "2026.3.25 연세대6 - 주승환.jpeg",
  "Cryin": "1774445650115 - 허성용(공과대학 기계공학).jpg",
  "성신": "IMG_8104 - 성신.jpeg",
  "김태연": "송도캠퍼스 - 김태연.jpg",
  "돈이 없는 문과생": "사진 연고전_돈이 없는 문과생 - AKIHIRO (일반대학원 사회학과) TAGAWA,.jpg",
};

async function main() {
  console.log("Reading CSV...");
  const csvPath = path.join(IMG_DIR, "[연고전 사진 대결] 참가 신청 폼.csv");
  const csvText = fs.readFileSync(csvPath, "utf-8");
  const rows = parseCSV(csvText);
  console.log(`Found ${rows.length - 1} entries`);

  // Clear existing
  console.log("Clearing existing data...");
  await supabase.from("votes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("photos").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const imageFiles = fs.readdirSync(IMG_DIR).filter((f) => !f.endsWith(".csv"));

  // Skip the test entry (asd)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 6) continue;

    const school = row[2]?.includes("연세") ? "yonsei" : "korea";
    const clubName = row[4] === "없음" ? null : row[4];
    let nickname = row[5];

    // Skip test entry
    if (nickname === "asd") {
      console.log(`SKIP: test entry (asd)`);
      continue;
    }

    const matchedFile = MANUAL_MAP[nickname];
    if (!matchedFile) {
      console.log(`SKIP: ${nickname} - no matched file`);
      continue;
    }

    const filePath = path.join(IMG_DIR, matchedFile);
    if (!fs.existsSync(filePath)) {
      console.log(`SKIP: ${nickname} - file not found: ${matchedFile}`);
      continue;
    }

    const ext = path.extname(matchedFile).toLowerCase();
    const contentType = ext === ".png" ? "image/png" : "image/jpeg";
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const storagePath = `photos/${safeName}`;

    const fileBuffer = fs.readFileSync(filePath);

    console.log(`Uploading ${nickname} (${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB)...`);

    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(storagePath, fileBuffer, { contentType, upsert: true });

    if (uploadError) {
      console.error(`  Upload FAILED: ${uploadError.message}`);
      continue;
    }

    const { data: urlData } = supabase.storage.from("photos").getPublicUrl(storagePath);

    const { error: insertError } = await supabase.from("photos").insert({
      image_url: urlData.publicUrl,
      nickname,
      club: clubName,
      school,
      aspect_ratio: 1.25,
    });

    if (insertError) {
      console.error(`  Insert FAILED: ${insertError.message}`);
    } else {
      console.log(`  OK: ${nickname} (${school})`);
    }
  }

  // Check: IMG_6284 - _.jpeg has no match in CSV. Skip it.
  console.log("\nDone! Remaining unmatched files (skipped):");
  const usedFiles = new Set(Object.values(MANUAL_MAP));
  imageFiles.filter((f) => !usedFiles.has(f)).forEach((f) => console.log(`  ${f}`));
}

main().catch(console.error);
