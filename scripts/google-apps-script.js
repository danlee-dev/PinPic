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
const SUPABASE_SECRET_KEY = "여기에_키_입력";
const STORAGE_BUCKET = "photos";

/**
 * 폼 제출 시 자동 실행되는 트리거 함수
 */
function onFormSubmit(e) {
  try {
    const response = e.namedValues;

    const school = getFieldValue(response, "학교");
    const clubType = getFieldValue(response, "동아리 소속 여부");
    const clubName = getFieldValue(response, "소속 동아리명");
    const nickname = getFieldValue(response, "닉네임 혹은 이름");

    if (!nickname) {
      Logger.log("닉네임이 없어서 스킵");
      return;
    }

    const schoolCode = school.includes("연세") ? "yonsei" : "korea";
    const club = (clubName === "없음" || !clubName) ? null : clubName;

    const fileUrl = getFieldValue(response, "업로드");
    if (!fileUrl) {
      Logger.log("사진 URL이 없어서 스킵");
      return;
    }

    const fileId = extractFileId(fileUrl);
    if (!fileId) {
      Logger.log("파일 ID 추출 실패: " + fileUrl);
      return;
    }

    // Drive에서 파일 가져오기
    const file = DriveApp.getFileById(fileId);
    const blob = file.getBlob();
    const contentType = blob.getContentType();
    const ext = contentType === "image/png" ? ".png" : ".jpg";
    const uniqueId = Date.now() + "-" + generateId();

    // 이미지 비율 계산
    var aspectRatio = 0.8;
    try {
      var imgSize = getImageSize(fileId);
      if (imgSize) {
        aspectRatio = +(imgSize.width / imgSize.height).toFixed(4);
      }
    } catch (e) {
      Logger.log("비율 계산 실패 (기본값 사용): " + e.toString());
    }

    // 1. 원본 업로드
    const origPath = "photos/" + uniqueId + ext;
    const origResult = uploadToSupabase(origPath, blob.getBytes(), contentType);

    if (!origResult.success) {
      Logger.log("원본 업로드 실패: " + origResult.error);
      return;
    }

    const imageUrl = SUPABASE_URL + "/storage/v1/object/public/" + STORAGE_BUCKET + "/" + origPath;

    // 2. 썸네일 생성 + 업로드
    var thumbUrl = null;
    try {
      var thumbBlob = resizeImage(blob, 800);
      var thumbPath = "thumbs/" + uniqueId + ".jpg";
      var thumbResult = uploadToSupabase(thumbPath, thumbBlob.getBytes(), "image/jpeg");

      if (thumbResult.success) {
        thumbUrl = SUPABASE_URL + "/storage/v1/object/public/" + STORAGE_BUCKET + "/" + thumbPath;
        Logger.log("썸네일 생성 성공");
      } else {
        Logger.log("썸네일 업로드 실패 (원본만 사용): " + thumbResult.error);
      }
    } catch (thumbError) {
      Logger.log("썸네일 생성 실패 (원본만 사용): " + thumbError.toString());
    }

    // 3. DB에 삽입
    var photoData = {
      image_url: imageUrl,
      nickname: nickname,
      club: club,
      school: schoolCode,
      aspect_ratio: aspectRatio,
    };
    if (thumbUrl) {
      photoData.thumb_url = thumbUrl;
    }

    var insertResult = insertPhoto(photoData);

    if (insertResult.success) {
      Logger.log("성공: " + nickname + " (" + schoolCode + ")" + (thumbUrl ? " +thumb" : ""));
      notifyAdmins(nickname, schoolCode, imageUrl);
    } else {
      Logger.log("DB 삽입 실패: " + insertResult.error);
    }

  } catch (error) {
    Logger.log("에러 발생: " + error.toString());
  }
}

/**
 * Drive API로 이미지 크기 가져오기
 */
function getImageSize(fileId) {
  var url = "https://www.googleapis.com/drive/v3/files/" + fileId + "?fields=imageMediaMetadata";
  var response = UrlFetchApp.fetch(url, {
    headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() === 200) {
    var meta = JSON.parse(response.getContentText());
    if (meta.imageMediaMetadata) {
      return { width: meta.imageMediaMetadata.width, height: meta.imageMediaMetadata.height };
    }
  }
  return null;
}

/**
 * 이미지를 Google Drive 썸네일 기능으로 리사이즈
 */
function resizeImage(originalBlob, maxWidth) {
  // Google Drive에 임시 저장 -> 썸네일 URL로 리사이즈된 이미지 가져오기
  var tempFile = DriveApp.createFile(originalBlob.setName("temp_resize.jpg"));
  var tempId = tempFile.getId();

  // Drive API 썸네일 URL 활용
  var thumbUrl = "https://drive.google.com/thumbnail?id=" + tempId + "&sz=w" + maxWidth;

  var response = UrlFetchApp.fetch(thumbUrl, {
    headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });

  // 임시 파일 삭제
  tempFile.setTrashed(true);

  if (response.getResponseCode() === 200) {
    return response.getBlob().setContentType("image/jpeg");
  }

  throw new Error("썸네일 생성 HTTP 에러: " + response.getResponseCode());
}

/**
 * namedValues에서 키워드로 필드값 추출
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
  const match1 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match1) return match1[1];
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
  if (code === 200 || code === 201) return { success: true };
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
  if (code === 200 || code === 201) return { success: true };
  return { success: false, error: response.getContentText() };
}

function generateId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 관리자들에게 새 사진 알림 이메일 전송
 */
function notifyAdmins(nickname, school, imageUrl) {
  try {
    var emails = fetchAdminEmails();
    if (emails.length === 0) return;

    var schoolName = school === "yonsei" ? "연세대" : "고려대";
    var subject = "[PinPic] 새 사진 승인 대기: " + nickname + " (" + schoolName + ")";
    var body = nickname + "님(" + schoolName + ")이 새 사진을 제출했습니다.\n\n"
      + "승인 대기 탭에서 확인해주세요:\n"
      + "https://pinpic.vercel.app\n\n"
      + "(관리자 계정으로 로그인 후 관리 탭 > 승인 대기)";

    emails.forEach(function(email) {
      MailApp.sendEmail(email, subject, body);
    });
    Logger.log("관리자 알림 전송: " + emails.join(", "));
  } catch (e) {
    Logger.log("알림 전송 실패: " + e.toString());
  }
}

/**
 * Supabase admins 테이블에서 관리자 이메일 목록 가져오기
 */
function fetchAdminEmails() {
  var url = SUPABASE_URL + "/rest/v1/admins?select=email";
  var response = UrlFetchApp.fetch(url, {
    method: "get",
    headers: {
      "Authorization": "Bearer " + SUPABASE_SECRET_KEY,
      "apikey": SUPABASE_SECRET_KEY,
    },
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() === 200) {
    var data = JSON.parse(response.getContentText());
    return data.map(function(row) { return row.email; });
  }
  return [];
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

    Logger.log("Processing row " + (i + 1));
    onFormSubmit({ namedValues: namedValues });

    Utilities.sleep(3000);
  }
}
