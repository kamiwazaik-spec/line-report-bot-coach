import { messagingApi } from "@line/bot-sdk";
import { getSheetData } from "../src/google-sheets/index.js";

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

const GROUP_ID = process.env.LINE_GROUP_ID;

function truncate(text, max) {
  if (!max) max = 4900;
  return text.length > max ? text.slice(0, max) + "\n...(\u7701\u7565)" : text;
}

function isAuthorized(req) {
  var authHeader = req.headers.authorization;
  var secret = process.env.CRON_SECRET;
  return authHeader === "Bearer " + secret;
}

function getJSTDateStr() {
  return new Date().toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function buildTeamSummary(data, dateStr) {
  var text = "\ud83d\udccb \u30c1\u30fc\u30e0\u65e5\u6b21\u30ec\u30dd\u30fc\u30c8\n";
  text += dateStr + "\n";
  text += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n";
  text += "\ud83d\udc65 \u30e1\u30f3\u30d0\u30fc\u6570: " + data.members.length + "\u4eba\n";
  text += "\ud83d\udd25 \u4eca\u65e5\u7a3c\u50cd: " + data.activeMembers + "\u4eba\n";
  text += "\ud83d\udcdd \u7d2f\u8a08\u6295\u7a3f: " + data.totalPosts + "\u672c\n";
  text += "\n\u3010\u30e1\u30f3\u30d0\u30fc\u5225\u3011\n";
  for (var j = 0; j < data.members.length; j++) {
    var m = data.members[j];
    var status = m.todayPosts > 0 ? "\u2705" : "\u2b1c";
    text += status + " " + m.name + ": \u4eca\u65e5" + m.todayPosts + "\u672c (\u7d2f\u8a08" + m.totalPosts + "\u672c)\n";
  }
  text += "\n\ud83d\udcac \u300c\u5831\u544a\u300d\u3068\u9001\u308b\u3068\u30c1\u30fc\u30e0\u30ec\u30dd\u30fc\u30c8\u304c\u5c4a\u304d\u307e\u3059\uff01";
  return text;
}

export default async function handler(req, res) {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    var data = await getSheetData();
    var dateStr = getJSTDateStr();
    var summaryText = truncate(buildTeamSummary(data, dateStr));

    await client.pushMessage({
      to: GROUP_ID,
      messages: [{ type: "text", text: summaryText }],
    });

    console.log("\u2705 \u9001\u4fe1\u5b8c\u4e86 | \u30e1\u30f3\u30d0\u30fc: " + data.members.length + "\u4eba | \u7d2f\u8a08: " + data.totalPosts + "\u672c");

    return res.status(200).json({
      status: "ok",
      date: dateStr,
      members: data.members.length,
      totalPosts: data.totalPosts,
      activeMembers: data.activeMembers,
    });
  } catch (err) {
    console.error("CRON ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
