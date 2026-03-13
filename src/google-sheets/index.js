import { google } from "googleapis";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

function getAuth() {
    return new google.auth.JWT({
          email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
          scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
}

function getTodayJST() {
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return jst.toISOString().slice(0, 10).replace(/-/g, "/");
}

export async function getSheetData() {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "報告データ!A:Z",
  });

  const rows = res.data.values || [];
    if (rows.length < 2) return { members: [], totalPosts: 0, activeMembers: 0 };

  const headers = rows[0];
    const dataRows = rows.slice(1).map((row) => {
          const obj = {};
          headers.forEach((h, i) => {
                  obj[h] = row[i] || "";
          });
          return obj;
    });

  const today = getTodayJST();

  const memberMap = {};
    for (const row of dataRows) {
          const name = row["メンバー"] || "不明";
          if (!memberMap[name]) {
                  memberMap[name] = {
                            name,
                            totalPosts: 0,
                            todayPosts: 0,
                            urls: [],
                            todayUrls: [],
                            latestDate: "",
                  };
          }
          const m = memberMap[name];
          m.totalPosts++;
          const url = row["URL"] || "";
          if (url) m.urls.push(url);

      const rowDate = (row["日付"] || "").slice(0, 10);
          if (rowDate === today) {
                  m.todayPosts++;
                  if (url) m.todayUrls.push(url);
          }
          if (rowDate > m.latestDate) m.latestDate = rowDate;
    }

  const members = Object.values(memberMap);
    const totalPosts = members.reduce((sum, m) => sum + m.totalPosts, 0);
    const activeMembers = members.filter((m) => m.todayPosts > 0).length;

  return { members, totalPosts, activeMembers };
}
