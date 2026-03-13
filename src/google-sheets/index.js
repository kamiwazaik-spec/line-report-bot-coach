import { google } from "googleapis";

var SPREADSHEET_ID = process.env.SPREADSHEET_ID;

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export async function getSheetData() {
  var auth = getAuth();
  var sheets = google.sheets({ version: "v4", auth });
  var res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "\u5831\u544a\u30c7\u30fc\u30bf!A:Z",
  });

  var rows = res.data.values || [];
  if (rows.length < 2) {
    return { members: [], totalPosts: 0, activeMembers: 0 };
  }

  var today = new Date().toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  var memberMap = {};
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    var date = row[0] || "";
    var name = row[2] || "";
    var url = row[3] || "";
    if (!name) continue;
    if (!memberMap[name]) {
      memberMap[name] = { name: name, totalPosts: 0, todayPosts: 0, urls: [], todayUrls: [], latestDate: "" };
    }
    memberMap[name].totalPosts++;
    memberMap[name].urls.push(url);
    if (date) memberMap[name].latestDate = date;
    if (date && date.indexOf(today.replace(/\//g, "/")) === 0) {
      memberMap[name].todayPosts++;
      if (url) memberMap[name].todayUrls.push(url);
    }
  }

  var members = Object.values(memberMap);
  var totalPosts = 0;
  var activeMembers = 0;
  for (var j = 0; j < members.length; j++) {
    totalPosts += members[j].totalPosts;
    if (members[j].todayPosts > 0) activeMembers++;
  }

  return { members: members, totalPosts: totalPosts, activeMembers: activeMembers };
}

export async function logMessage(memberName, messageText, sourceType, sourceId) {
  var auth = getAuth();
  var sheets = google.sheets({ version: "v4", auth });

  var now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "\u4f1a\u8a71\u30ed\u30b0!A:E",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[now, memberName, messageText, sourceType, sourceId]],
    },
  });
}
