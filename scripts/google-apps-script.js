// ============================================================
// Google Apps Script - 구글 폼 응답 -> Supabase 자동 연동
// ============================================================
//
// [설정 방법]
// 1. 구글 폼과 연결된 스프레드시트 열기
// 2. 확장 프로그램 > Apps Script
// 3. 이 코드 전체를 복사해서 붙여넣기
// 4. SUPABASE_URL, SUPABASE_SECRET_KEY 값 설정
// 5. 저장 후 "트리거" 메뉴에서:
//    - 함수: onFormSubmit
//    - 이벤트: 스프레드시트에서 > 양식 제출 시
//    - 저장
// ============================================================

const SUPABASE_URL = "https://qqewkrdaxwsjzclvspbv.supabase.co";
const SUPABASE_SECRET_KEY = "여기에_시크릿키_입력"; // sb_secret_...
const STORAGE_BUCKET = "photos";

/**
 * 폼 제출 시 자동 실행되는 트리거 함수
 */
function onFormSubmit(e) {
  try {
    const response = e.namedValues;

    // 폼 필드 매핑 (폼 질문 제목 기준)
    const school = getFieldValue(response, "학교");
    const clubType = getFieldValue(response, "동아리 소속 여부");
    const clubName = getFieldValue(response, "소속 동아리명");
    const nickname = getFieldValue(response, "닉네임 혹은 이름");

    if (!nickname) {
      Logger.log("닉네임이 없어서 스킵");
      return;
    }

    // 학교 구분
    const schoolCode = school.includes("연세") ? "yonsei" : "korea";

    // 동아리명 처리
    const club = (clubName === "없음" || !clubName) ? null : clubName;

    // 첨부 파일 가져오기
    const fileUrl = getFieldValue(response, "사진");
    if (!fileUrl) {
      Logger.log("사진 URL이 없어서 스킵");
      return;
    }

    // Google Drive 파일 ID 추출
    const fileId = extractFileId(fileUrl);
    if (!fileId) {
      Logger.log("파일 ID 추출 실패: " + fileUrl);
      return;
    }

    // Drive에서 파일 가져오기
    const file = DriveApp.getFileById(fileId);
    const blob = file.getBlob();
    const fileName = file.getName();
    const contentType = blob.getContentType();
    const ext = contentType === "image/png" ? ".png" : ".jpg";

    // Supabase Storage에 업로드
    const storagePath = "photos/" + Date.now() + "-" + generateId() + ext;
    const uploadResult = uploadToSupabase(storagePath, blob.getBytes(), contentType);

    if (!uploadResult.success) {
      Logger.log("업로드 실패: " + uploadResult.error);
      return;
    }

    // Public URL 생성
    const imageUrl = SUPABASE_URL + "/storage/v1/object/public/" + STORAGE_BUCKET + "/" + storagePath;

    // photos 테이블에 삽입
    const insertResult = insertPhoto({
      image_url: imageUrl,
      nickname: nickname,
      club: club,
      school: schoolCode,
      aspect_ratio: 1.25,
    });

    if (insertResult.success) {
      Logger.log("성공: " + nickname + " (" + schoolCode + ")");
    } else {
      Logger.log("DB 삽입 실패: " + insertResult.error);
    }

  } catch (error) {
    Logger.log("에러 발생: " + error.toString());
  }
}

/**
 * namedValues에서 키워드로 필드값 추출 (폼 질문이 정확히 안 맞을 수 있으므로 부분 매칭)
 */
function getFieldValue(namedValues, keyword) {
  for (const key in namedValues) {
    if (key.includes(keyword)) {
      const val = namedValues[key];
      return Array.isArray(val) ? val[0] : val;
    }
  }
  return null;
}

/**
 * Google Drive URL에서 파일 ID 추출
 */
function extractFileId(url) {
  // https://drive.google.com/u/0/open?usp=forms_web&id=FILE_ID
  const match1 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match1) return match1[1];

  // https://drive.google.com/file/d/FILE_ID/view
  const match2 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match2) return match2[1];

  return null;
}

/**
 * Supabase Storage에 파일 업로드
 */
function uploadToSupabase(path, bytes, contentType) {
  const url = SUPABASE_URL + "/storage/v1/object/" + STORAGE_BUCKET + "/" + path;

  const options = {
    method: "post",
    headers: {
      "Authorization": "Bearer " + SUPABASE_SECRET_KEY,
      "apikey": SUPABASE_SECRET_KEY,
      "Content-Type": contentType,
    },
    payload: bytes,
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();

  if (code === 200 || code === 201) {
    return { success: true };
  }
  return { success: false, error: response.getContentText() };
}

/**
 * Supabase photos 테이블에 데이터 삽입
 */
function insertPhoto(data) {
  const url = SUPABASE_URL + "/rest/v1/photos";

  const options = {
    method: "post",
    headers: {
      "Authorization": "Bearer " + SUPABASE_SECRET_KEY,
      "apikey": SUPABASE_SECRET_KEY,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    },
    payload: JSON.stringify(data),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();

  if (code === 200 || code === 201) {
    return { success: true };
  }
  return { success: false, error: response.getContentText() };
}

/**
 * 랜덤 ID 생성
 */
function generateId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ============================================================
// 수동 테스트용 함수 - 기존 스프레드시트 데이터를 일괄 처리
// ============================================================
function syncAllExisting() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const namedValues = {};
    headers.forEach((h, j) => {
      namedValues[h] = [row[j].toString()];
    });

    Logger.log("Processing row " + (i + 1) + ": " + namedValues);
    onFormSubmit({ namedValues: namedValues });

    // Rate limit 방지
    Utilities.sleep(2000);
  }
}
