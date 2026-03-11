import { google } from "googleapis";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

export async function getSheetData() {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "報告データ!A:Z",
  });

  const rows = res.data.values || [];
  if (rows.length < 2) return { members: [] };

  const headers = rows[0];
  const members = rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] || "";
    });
    return {
      name: obj["名前"] || "",
      lineUserId: obj["LINE_USER_ID"] || "",
      totalViews: parseInt(obj["総再生数"] || "0", 10),
      postCount: parseInt(obj["投稿数"] || "0", 10),
      todayPosts: parseInt(obj["今日の投稿数"] || "0", 10),
      topVideo: obj["トップ動画URL"] || "",
      topVideoViews: parseInt(obj["トップ動画再生数"] || "0", 10),
      reportNote: obj["報告メモ"] || "",
      // メンバー固有フィールド
      comparisonData: obj["比較データ"] || "",
      highQualityVideo: obj["高品質動画"] || "",
      titleIdeas: obj["タイトル案"] || "",
      viralAnalysis: obj["バズ分析"] || "",
      postingTimes: obj["投稿時間"] || "",
      tvProgress: obj["TV進捗"] || "",
    };
  });

  const totalViews = members.reduce((sum, m) => sum + m.totalViews, 0);
  const activeMembers = members.filter((m) => m.todayPosts > 0).length;

  return { members, totalViews, activeMembers };
}
