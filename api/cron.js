import { messagingApi } from "@line/bot-sdk";
import { getSheetData } from "../src/google-sheets/index.js";

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

const GROUP_ID = process.env.LINE_GROUP_ID;
const TEAM_GOAL = 1000;

function truncate(text, max) {
  if (!max) max = 4900;
  return text.length > max ? text.slice(0, max) + "\n...(省略)" : text;
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
  var progress = Math.round((data.totalPosts / TEAM_GOAL) * 100);
  var bar = "";
  for (var i = 0; i < 10; i++) {
    bar += i < Math.round(progress / 10) ? "\u2588" : "\u2591";
  }

  var sorted = data.members.slice().sort(function(a, b) {
    return b.todayPosts - a.todayPosts;
  });

  var todayTotal = 0;
  for (var k = 0; k < sorted.length; k++) {
    todayTotal += sorted[k].todayPosts;
  }

  var text = "\ud83d\udccb \u30c1\u30fc\u30e0\u65e5\u6b21\u30ec\u30dd\u30fc\u30c8\n";
  text += dateStr + "\n";
  text += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n";
  text += "\n\ud83c\udfaf 1000\u672c\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\n";
  text += bar + " " + progress + "% (" + data.totalPosts + "/" + TEAM_GOAL + ")\n";
  text += "\n\ud83d\udcca \u4eca\u65e5\u306e\u5b9f\u7e3e\n";
  text += "\ud83d\udc65 \u7a3c\u50cd: " + data.activeMembers + "/" + data.members.length + "\u4eba\n";
  text += "\ud83d\udcdd \u6295\u7a3f: " + todayTotal + "\u672c\n";
  text += "\n\u3010\u30e1\u30f3\u30d0\u30fc\u5225\u3011\n";
  for (var j = 0; j < sorted.length; j++) {
    var m = sorted[j];
    var rank = "";
    if (j === 0 && m.todayPosts > 0) rank = "\ud83e\udd47";
    else if (j === 1 && m.todayPosts > 0) rank = "\ud83e\udd48";
    else if (j === 2 && m.todayPosts > 0) rank = "\ud83e\udd49";
    var status = m.todayPosts > 0 ? "\u2705" : "\u2b1c";
    text += status + " " + m.name;
    if (rank) text += rank;
    text += ": \u4eca\u65e5" + m.todayPosts + "\u672c (\u7d2f\u8a08" + m.totalPosts + "\u672c)\n";
  }
  text += "\n\ud83d\udcac \u300c\u5831\u544a\u300d\u3068\u9001\u308b\u3068\u8a73\u7d30\u30ec\u30dd\u30fc\u30c8\u304c\u5c4a\u304d\u307e\u3059\uff01";
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
