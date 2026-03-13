import { messagingApi } from "@line/bot-sdk";
import { getSheetData } from "../src/google-sheets/index.js";

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

const TEAM_GOAL = 1000;

function getJSTDateStr() {
  return new Date().toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function buildMemberReport(member) {
  var text = "\ud83d\udcca " + member.name + "\u3055\u3093\u306e\u72b6\u6cc1\n";
  text += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n";
  text += "\ud83d\udcdd \u7d2f\u8a08\u6295\u7a3f\u6570: " + member.totalPosts + "\u672c\n";
  text += "\ud83d\udd25 \u4eca\u65e5\u306e\u6295\u7a3f: " + member.todayPosts + "\u672c\n";
  if (member.todayUrls.length > 0) {
    text += "\n\ud83d\udcce \u4eca\u65e5\u306e\u6295\u7a3fURL:\n";
    member.todayUrls.slice(0, 5).forEach(function(url, i) {
      text += (i + 1) + ". " + url + "\n";
    });
  }
  if (member.latestDate) {
    text += "\n\ud83d\udcc5 \u6700\u7d42\u5831\u544a: " + member.latestDate;
  }
  return text;
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
  text += "\n\ud83d\udcac \u300c\u5168\u4f53\u300d\u3067\u30e1\u30f3\u30d0\u30fc\u8a73\u7d30\u3082\u898b\u308c\u307e\u3059\uff01";
  return text;
}

function buildHelpMessage() {
  var text = "\ud83d\udcd6 \u30b3\u30de\u30f3\u30c9\u4e00\u89a7\n";
  text += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n";
  text += "\ud83d\udccb \u300c\u5831\u544a\u300d \u2192 \u30c1\u30fc\u30e0\u30ec\u30dd\u30fc\u30c8\n";
  text += "\ud83d\udcca \u300c\u5168\u4f53\u300d \u2192 \u30ec\u30dd\u30fc\u30c8+\u30e1\u30f3\u30d0\u30fc\u8a73\u7d30\n";
  text += "\u2753 \u300c\u30d8\u30eb\u30d7\u300d \u2192 \u3053\u306e\u30e1\u30c3\u30bb\u30fc\u30b8\n";
  text += "\n\u6bce\u665a21\u6642\u306b\u65e5\u6b21\u30ec\u30dd\u30fc\u30c8\u304c\u81ea\u52d5\u9001\u4fe1\u3055\u308c\u307e\u3059\uff01";
  return text;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const events = req.body?.events || [];
  if (events.length === 0) {
    return res.status(200).json({ status: "ok" });
  }

  for (const event of events) {
    if (event.type !== "message" || event.message.type !== "text") continue;

    const text = event.message.text.trim();
    const replyToken = event.replyToken;

    if (text === "\u5831\u544a" || text === "\u30ec\u30dd\u30fc\u30c8") {
      try {
        const data = await getSheetData();
        const dateStr = getJSTDateStr();
        const summaryText = buildTeamSummary(data, dateStr);
        await client.replyMessage({
          replyToken,
          messages: [{ type: "text", text: summaryText }],
        });
      } catch (err) {
        console.error("\u5831\u544a\u30a8\u30e9\u30fc:", err);
        await client.replyMessage({
          replyToken,
          messages: [{ type: "text", text: "\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f\u3002\u3057\u3070\u3089\u304f\u3057\u3066\u304b\u3089\u518d\u8a66\u884c\u3057\u3066\u304f\u3060\u3055\u3044\u3002" }],
        });
      }
    } else if (text === "\u5168\u4f53" || text === "\u30b5\u30de\u30ea\u30fc") {
      try {
        const data = await getSheetData();
        const dateStr = getJSTDateStr();
        var messages = [];
        messages.push({ type: "text", text: buildTeamSummary(data, dateStr) });
        for (var k = 0; k < Math.min(data.members.length, 4); k++) {
          messages.push({ type: "text", text: buildMemberReport(data.members[k]) });
        }
        await client.replyMessage({ replyToken, messages: messages.slice(0, 5) });
      } catch (err) {
        console.error("\u30b5\u30de\u30ea\u30fc\u30a8\u30e9\u30fc:", err);
        await client.replyMessage({
          replyToken,
          messages: [{ type: "text", text: "\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f\u3002" }],
        });
      }
    } else if (text === "\u30d8\u30eb\u30d7" || text === "\u4f7f\u3044\u65b9") {
      try {
        await client.replyMessage({
          replyToken,
          messages: [{ type: "text", text: buildHelpMessage() }],
        });
      } catch (err) {
        console.error("\u30d8\u30eb\u30d7\u30a8\u30e9\u30fc:", err);
      }
    }
  }

  return res.status(200).json({ status: "ok" });
}
