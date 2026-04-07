// ============================================================
// Google Apps Script - PinPic 관심도 데이터 -> 스프레드시트 동기화
// ============================================================
//
// [설정 방법]
// 1. "PinPic 집계" 스프레드시트 > 확장 프로그램 > Apps Script
// 2. 이 코드를 붙여넣기
// 3. SUPABASE_URL, SUPABASE_KEY 확인
// 4. syncAnalytics 함수 실행 (수동 또는 트리거 설정)
// 5. 트리거: 시간 기반 > 매 5분/10분/30분 등
// ============================================================

const SUPABASE_URL = "https://qqewkrdaxwsjzclvspbv.supabase.co";
const SUPABASE_KEY = "여기에_service_role_키_입력";

function syncAnalytics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Fetch data from Supabase
  const views = fetchTable("photo_views", "photo_id,user_id,created_at");
  const clicks = fetchTable("photo_clicks", "photo_id,user_id,created_at");
  const fakeDoorClicks = fetchTable("fake_door_clicks", "photo_id,user_id,source,created_at");
  const photos = fetchTable("photos", "id,nickname,school,status");
  const admins = fetchTable("admins", "user_id");

  const adminIds = new Set(admins.map(function(a) { return a.user_id; }));
  const photoMap = {};
  photos.forEach(function(p) { photoMap[p.id] = p; });

  // Filter out admins
  var safeViews = views.filter(function(v) { return !v.user_id || !adminIds.has(v.user_id); });
  var safeClicks = clicks.filter(function(c) { return !c.user_id || !adminIds.has(c.user_id); });
  var safeFakeDoor = fakeDoorClicks.filter(function(f) { return !f.user_id || !adminIds.has(f.user_id); });

  // === Sheet 1: 전체 통계 ===
  var summarySheet = getOrCreateSheet(ss, "전체 통계");
  summarySheet.clear();
  summarySheet.getRange(1, 1, 1, 3).setValues([["총 조회수", "총 스팟 클릭수", "전환율"]]);
  var rate = safeViews.length > 0 ? Math.round((safeClicks.length / safeViews.length) * 100) + "%" : "0%";
  summarySheet.getRange(2, 1, 1, 3).setValues([[safeViews.length, safeClicks.length, rate]]);
  summarySheet.getRange(1, 1, 1, 3).setFontWeight("bold");

  // === Sheet 2: 사진별 ===
  var photoSheet = getOrCreateSheet(ss, "사진별");
  photoSheet.clear();
  photoSheet.getRange(1, 1, 1, 5).setValues([["닉네임", "학교", "조회수", "스팟 클릭수", "전환율"]]);
  photoSheet.getRange(1, 1, 1, 5).setFontWeight("bold");

  var photoStats = {};
  safeViews.forEach(function(v) {
    if (!photoStats[v.photo_id]) photoStats[v.photo_id] = { views: 0, clicks: 0 };
    photoStats[v.photo_id].views++;
  });
  safeClicks.forEach(function(c) {
    if (!photoStats[c.photo_id]) photoStats[c.photo_id] = { views: 0, clicks: 0 };
    photoStats[c.photo_id].clicks++;
  });

  var photoRows = Object.keys(photoStats).map(function(pid) {
    var p = photoMap[pid] || { nickname: "?", school: "?" };
    var s = photoStats[pid];
    var r = s.views > 0 ? Math.round((s.clicks / s.views) * 100) + "%" : "0%";
    return [p.nickname, p.school === "yonsei" ? "연세대" : "고려대", s.views, s.clicks, r];
  }).sort(function(a, b) { return b[2] - a[2]; });

  if (photoRows.length > 0) {
    photoSheet.getRange(2, 1, photoRows.length, 5).setValues(photoRows);
  }

  // === Sheet 3: 사용자별 ===
  var userSheet = getOrCreateSheet(ss, "사용자별");
  userSheet.clear();
  userSheet.getRange(1, 1, 1, 4).setValues([["사용자 ID", "조회수", "스팟 클릭수", "전환율"]]);
  userSheet.getRange(1, 1, 1, 4).setFontWeight("bold");

  var userStats = {};
  safeViews.forEach(function(v) {
    if (!v.user_id) return;
    if (!userStats[v.user_id]) userStats[v.user_id] = { views: 0, clicks: 0 };
    userStats[v.user_id].views++;
  });
  safeClicks.forEach(function(c) {
    if (!c.user_id) return;
    if (!userStats[c.user_id]) userStats[c.user_id] = { views: 0, clicks: 0 };
    userStats[c.user_id].clicks++;
  });

  // Resolve emails
  var emailMap = fetchUserEmails(Object.keys(userStats));

  var userRows = Object.keys(userStats).map(function(uid) {
    var s = userStats[uid];
    var r = s.views > 0 ? Math.round((s.clicks / s.views) * 100) + "%" : "0%";
    return [emailMap[uid] || uid.substring(0, 8) + "...", s.views, s.clicks, r];
  }).sort(function(a, b) { return b[1] - a[1]; });

  if (userRows.length > 0) {
    userSheet.getRange(2, 1, userRows.length, 4).setValues(userRows);
  }

  // === Sheet 4: Raw 조회 로그 ===
  var viewLogSheet = getOrCreateSheet(ss, "조회 로그");
  viewLogSheet.clear();
  viewLogSheet.getRange(1, 1, 1, 4).setValues([["시간", "사진", "학교", "사용자 ID"]]);
  viewLogSheet.getRange(1, 1, 1, 4).setFontWeight("bold");

  var viewRows = safeViews.map(function(v) {
    var p = photoMap[v.photo_id] || { nickname: "?", school: "?" };
    return [v.created_at, p.nickname, p.school === "yonsei" ? "연세대" : "고려대", v.user_id ? (emailMap[v.user_id] || v.user_id.substring(0, 8) + "...") : "비로그인"];
  }).sort(function(a, b) { return a[0] > b[0] ? -1 : 1; });

  if (viewRows.length > 0) {
    viewLogSheet.getRange(2, 1, viewRows.length, 4).setValues(viewRows);
  }

  // === Sheet 5: Raw 클릭 로그 ===
  var clickLogSheet = getOrCreateSheet(ss, "클릭 로그");
  clickLogSheet.clear();
  clickLogSheet.getRange(1, 1, 1, 4).setValues([["시간", "사진", "학교", "사용자 ID"]]);
  clickLogSheet.getRange(1, 1, 1, 4).setFontWeight("bold");

  var clickRows = safeClicks.map(function(c) {
    var p = photoMap[c.photo_id] || { nickname: "?", school: "?" };
    return [c.created_at, p.nickname, p.school === "yonsei" ? "연세대" : "고려대", c.user_id ? (emailMap[c.user_id] || c.user_id.substring(0, 8) + "...") : "비로그인"];
  }).sort(function(a, b) { return a[0] > b[0] ? -1 : 1; });

  if (clickRows.length > 0) {
    clickLogSheet.getRange(2, 1, clickRows.length, 4).setValues(clickRows);
  }

  // === Sheet 6: 페이크 도어 전체 ===
  var fdSummary = getOrCreateSheet(ss, "페이크도어 전체");
  fdSummary.clear();
  fdSummary.getRange(1, 1, 1, 4).setValues([["총 클릭", "고유 로그인", "비로그인", "고유 사진"]]);
  fdSummary.getRange(1, 1, 1, 4).setFontWeight("bold");
  var loggedInUsers = {}, anonCount = 0, photoSet = {};
  safeFakeDoor.forEach(function(f) {
    if (f.user_id) loggedInUsers[f.user_id] = true; else anonCount++;
    if (f.photo_id) photoSet[f.photo_id] = true;
  });
  fdSummary.getRange(2, 1, 1, 4).setValues([[
    safeFakeDoor.length,
    Object.keys(loggedInUsers).length,
    anonCount,
    Object.keys(photoSet).length,
  ]]);

  // === Sheet 7: 페이크 도어 소스별 ===
  var fdSource = getOrCreateSheet(ss, "페이크도어 소스별");
  fdSource.clear();
  fdSource.getRange(1, 1, 1, 2).setValues([["소스", "클릭 수"]]);
  fdSource.getRange(1, 1, 1, 2).setFontWeight("bold");
  var sourceCounts = {};
  safeFakeDoor.forEach(function(f) {
    sourceCounts[f.source] = (sourceCounts[f.source] || 0) + 1;
  });
  var sourceRows = Object.keys(sourceCounts)
    .map(function(s) { return [s, sourceCounts[s]]; })
    .sort(function(a, b) { return b[1] - a[1]; });
  if (sourceRows.length > 0) {
    fdSource.getRange(2, 1, sourceRows.length, 2).setValues(sourceRows);
  }

  // === Sheet 8: 페이크 도어 사진별 ===
  var fdPhoto = getOrCreateSheet(ss, "페이크도어 사진별");
  fdPhoto.clear();
  fdPhoto.getRange(1, 1, 1, 3).setValues([["닉네임", "학교", "클릭 수"]]);
  fdPhoto.getRange(1, 1, 1, 3).setFontWeight("bold");
  var fdPhotoCounts = {};
  safeFakeDoor.forEach(function(f) {
    if (!f.photo_id) return;
    fdPhotoCounts[f.photo_id] = (fdPhotoCounts[f.photo_id] || 0) + 1;
  });
  var fdPhotoRows = Object.keys(fdPhotoCounts).map(function(pid) {
    var p = photoMap[pid] || { nickname: "?", school: "?" };
    return [p.nickname, p.school === "yonsei" ? "연세대" : "고려대", fdPhotoCounts[pid]];
  }).sort(function(a, b) { return b[2] - a[2]; });
  if (fdPhotoRows.length > 0) {
    fdPhoto.getRange(2, 1, fdPhotoRows.length, 3).setValues(fdPhotoRows);
  }

  // === Sheet 9: 페이크 도어 사용자별 ===
  var fdUser = getOrCreateSheet(ss, "페이크도어 사용자별");
  fdUser.clear();
  fdUser.getRange(1, 1, 1, 2).setValues([["사용자", "클릭 수"]]);
  fdUser.getRange(1, 1, 1, 2).setFontWeight("bold");
  var fdUserCounts = {};
  safeFakeDoor.forEach(function(f) {
    if (!f.user_id) return;
    fdUserCounts[f.user_id] = (fdUserCounts[f.user_id] || 0) + 1;
  });
  var fdUserRows = Object.keys(fdUserCounts)
    .map(function(uid) {
      return [emailMap[uid] || uid.substring(0, 8) + "...", fdUserCounts[uid]];
    })
    .sort(function(a, b) { return b[1] - a[1]; });
  if (fdUserRows.length > 0) {
    fdUser.getRange(2, 1, fdUserRows.length, 2).setValues(fdUserRows);
  }

  // === Sheet 10: 페이크 도어 Raw 로그 ===
  var fdLog = getOrCreateSheet(ss, "페이크도어 로그");
  fdLog.clear();
  fdLog.getRange(1, 1, 1, 5).setValues([["시간", "사진", "학교", "사용자", "소스"]]);
  fdLog.getRange(1, 1, 1, 5).setFontWeight("bold");
  var fdLogRows = safeFakeDoor.map(function(f) {
    var p = f.photo_id ? (photoMap[f.photo_id] || { nickname: "?", school: "?" }) : { nickname: "-", school: "-" };
    return [
      f.created_at,
      p.nickname,
      p.school === "yonsei" ? "연세대" : (p.school === "korea" ? "고려대" : "-"),
      f.user_id ? (emailMap[f.user_id] || f.user_id.substring(0, 8) + "...") : "비로그인",
      f.source,
    ];
  }).sort(function(a, b) { return a[0] > b[0] ? -1 : 1; });
  if (fdLogRows.length > 0) {
    fdLog.getRange(2, 1, fdLogRows.length, 5).setValues(fdLogRows);
  }

  Logger.log("동기화 완료: " + safeViews.length + " views, " + safeClicks.length + " clicks, " + safeFakeDoor.length + " fake door clicks");
}

function fetchTable(table, select) {
  var allRows = [];
  var pageSize = 1000;
  var offset = 0;

  while (true) {
    var url = SUPABASE_URL + "/rest/v1/" + table + "?select=" + select
      + "&limit=" + pageSize + "&offset=" + offset;
    var response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: {
        "Authorization": "Bearer " + SUPABASE_KEY,
        "apikey": SUPABASE_KEY,
      },
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() !== 200) {
      Logger.log("Fetch 실패 (" + table + "): " + response.getContentText());
      break;
    }

    var rows = JSON.parse(response.getContentText());
    allRows = allRows.concat(rows);

    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  return allRows;
}

function fetchUserEmails(userIds) {
  var emailMap = {};
  if (userIds.length === 0) return emailMap;

  // Supabase Auth admin API로 유저 목록 조회
  var url = SUPABASE_URL + "/auth/v1/admin/users?per_page=1000";
  var response = UrlFetchApp.fetch(url, {
    method: "get",
    headers: {
      "Authorization": "Bearer " + SUPABASE_KEY,
      "apikey": SUPABASE_KEY,
    },
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() === 200) {
    var data = JSON.parse(response.getContentText());
    var users = data.users || data;
    if (Array.isArray(users)) {
      users.forEach(function(u) {
        if (userIds.indexOf(u.id) !== -1) {
          emailMap[u.id] = u.email || u.id.substring(0, 8) + "...";
        }
      });
    }
  }

  return emailMap;
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}
