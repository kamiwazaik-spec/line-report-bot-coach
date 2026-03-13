import { messagingApi } from "@line/bot-sdk";
import { getSheetData, logMessage, getRecentMessages } from "../src/google-sheets/index.js";

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

async function getMemberName(client, sourceType, sourceUserId) {
  try {
    if (sourceUserId) {
      var profile = await client.getProfile(sourceUserId);
      return profile.displayName || "unknown";
    }
  } catch (e) {
    console.error("getProfile error:", e.message);
  }
  return "unknown";
}

function buildMemberReport(member) {
  var text = "\ud83d\udcca " + member.name + " \u3055\u3093\u306e\u72b6\u6cc1\n";
  text += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n";
  text += "\ud83d\udcdd \u7d2f\u8a08\u6295\u7a3f\u6570: " + member.totalPosts + "\u672c\n";
  text += "\ud83d\udd25 \u4eca\u65e5\u306e\u6295\u7a3f: " + member.todayPosts + "\u672c\n";
  if (member.todayUrls.length > 0) {
    text += "\n\ud83d\udcce \u4eca\u65e5\u306e\u6295\u7a3fURL:\n";
    for (var i = 0; i < member.todayUrls.length; i++) {
      text += (i + 1) + ". " + member.todayUrls[i] + "\n";
    }
  }
  return text;
}

function buildTeamReport(data) {
  var dateStr = getJSTDateStr();
  var progress = Math.round((data.totalPosts / TEAM_GOAL) * 100);
  var barLen = 10;
  var filled = Math.round((progress / 100) * barLen);
  var bar = "";
  for (var b = 0; b < barLen; b++) {
    bar += b < filled ? "\u2588" : "\u2591";
  }

  var text = "\ud83d\udccb \u30c1\u30fc\u30e0\u65e5\u6b21\u30ec\u30dd\u30fc\u30c8\n";
  text += dateStr + "\n";
  text += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n";
  text += "\ud83c\udfaf 1000\u672c\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\n";
  text += bar + " " + progress + "% (" + data.totalPosts + "/1000)\n\n";
  text += "\ud83d\udcca \u4eca\u65e5\u306e\u5b9f\u7e3e\n";
  text += "\ud83d\udc65 \u7a3c\u50cd: " + data.activeMembers + "/" + data.members.length + "\u4eba\n\n";

  var sorted = data.members.slice().sort(function(a, b) { return b.todayPosts - a.todayPosts; });
  text += "\u3010\u30e1\u30f3\u30d0\u30fc\u5225\u3011\n";
  var medals = ["\ud83e\udd47", "\ud83e\udd48", "\ud83e\udd49"];
  for (var i = 0; i < sorted.length; i++) {
    var m = sorted[i];
    var medal = i < 3 ? medals[i] : "";
    var icon = m.todayPosts > 0 ? "\u2705" : "\u2b1c";
    text += icon + " " + m.name + medal + ": \u4eca\u65e5" + m.todayPosts + "\u672c (\u7d2f\u8a08" + m.totalPosts + "\u672c)\n";
  }

  text += "\n\ud83d\udcac \u300c\u5168\u4f53\u300d\u3067\u30e1\u30f3\u30d0\u30fc\u8a73\u7d30\u3082\u898b\u308c\u307e\u3059\uff01";
  return text;
}

async function buildSuggestion() {
  try {
    var messages = await getRecentMessages(30);
    var data = await getSheetData();

    if (messages.length === 0 && data.totalPosts === 0) {
      return "\ud83d\udca1 \u307e\u3060\u30c7\u30fc\u30bf\u304c\u3042\u308a\u307e\u305b\u3093\u3002\u307e\u305a\u306f\u30e1\u30f3\u30d0\u30fc\u304c\u6295\u7a3f\u3084\u4f1a\u8a71\u3092\u59cb\u3081\u307e\u3057\u3087\u3046\uff01";
    }

    var text = "\ud83d\udca1 AI\u5206\u6790\u30ec\u30dd\u30fc\u30c8\n";
    text += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n";

    // Progress analysis
    var progress = Math.round((data.totalPosts / TEAM_GOAL) * 100);
    text += "\ud83d\udcca \u9032\u6357\u72b6\u6cc1: " + data.totalPosts + "/" + TEAM_GOAL + "\u672c (" + progress + "%)\n";

    // Activity analysis
    var activeMemberNames = [];
    var inactiveMemberNames = [];
    for (var i = 0; i < data.members.length; i++) {
      if (data.members[i].todayPosts > 0) {
        activeMemberNames.push(data.members[i].name);
      } else {
        inactiveMemberNames.push(data.members[i].name);
      }
    }
    text += "\ud83d\udc65 \u4eca\u65e5\u7a3c\u50cd: " + activeMemberNames.length + "/" + data.members.length + "\u4eba\n\n";

    // Recent messages summary
    if (messages.length > 0) {
      text += "\ud83d\udcac \u6700\u8fd1\u306e\u4f1a\u8a71 (" + messages.length + "\u4ef6)\n";
      var memberMsgCount = {};
      for (var j = 0; j < messages.length; j++) {
        var mn = messages[j].memberName;
        if (!memberMsgCount[mn]) memberMsgCount[mn] = 0;
        memberMsgCount[mn]++;
      }
      var msgEntries = Object.keys(memberMsgCount);
      for (var k = 0; k < msgEntries.length; k++) {
        text += "  " + msgEntries[k] + ": " + memberMsgCount[msgEntries[k]] + "\u4ef6\n";
      }
      text += "\n";
    }

    // Suggestions
    text += "\ud83c\udfaf \u6b21\u306b\u3084\u308b\u3079\u304d\u3053\u3068:\n";
    var suggestions = [];

    if (inactiveMemberNames.length > 0) {
      suggestions.push("\u30fb \u672a\u7a3c\u50cd\u30e1\u30f3\u30d0\u30fc(" + inactiveMemberNames.join(", ") + ")\u306b\u58f0\u304b\u3051\u3059\u308b");
    }

    if (progress < 20) {
      suggestions.push("\u30fb \u307e\u305a\u306f200\u672c\u3092\u76ee\u6307\u3057\u3066\u30da\u30fc\u30b9\u3092\u4e0a\u3052\u308b");
    } else if (progress < 50) {
      suggestions.push("\u30fb \u6298\u308a\u8fd4\u3057\u5730\u70b9\u3092\u76ee\u6307\u3057\u3066\u52a0\u901f\u3059\u308b");
    } else {
      suggestions.push("\u30fb \u3042\u3068" + (TEAM_GOAL - data.totalPosts) + "\u672c\uff01\u30e9\u30b9\u30c8\u30b9\u30d1\u30fc\u30c8\u3092\u304b\u3051\u308b");
    }

    if (data.members.length < 8) {
      suggestions.push("\u30fb \u65b0\u30e1\u30f3\u30d0\u30fc\u3092\u52df\u96c6\u3057\u3066\u30c1\u30fc\u30e0\u3092\u62e1\u5927\u3059\u308b");
    }

    suggestions.push("\u30fb \u30c8\u30c3\u30d7\u6295\u7a3f\u8005\u3092\u8912\u3081\u3066\u30e2\u30c1\u30d9\u30fc\u30b7\u30e7\u30f3\u3092\u4e0a\u3052\u308b");

    for (var s = 0; s < suggestions.length; s++) {
      text += suggestions[s] + "\n";
    }

    return text;
  } catch (e) {
    console.error("buildSuggestion error:", e.message);
    return "\u5206\u6790\u4e2d\u306b\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f: " + e.message;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    var body = req.body;
    if (!body || !body.events) {
      return res.status(200).json({ message: "No events" });
    }

    for (var i = 0; i < body.events.length; i++) {
      var event = body.events[i];

      // Log all messages to spreadsheet
      if (event.type === "message" && event.message.type === "text") {
        var senderName = await getMemberName(client, event.source.type, event.source.userId);
        try {
          await logMessage(senderName, event.message.text, event.source.type, event.source.userId || event.source.groupId || "");
        } catch (logErr) {
          console.error("logMessage error:", logErr.message);
        }
      }

      if (event.type !== "message" || event.message.type !== "text" || !event.replyToken) {
        continue;
      }

      var userMessage = event.message.text.trim();

      if (userMessage === "\u5168\u4f53" || userMessage === "\u30ec\u30dd\u30fc\u30c8") {
        var data = await getSheetData();
        var reportText = buildTeamReport(data);
        await client.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: "text", text: reportText }],
        });
      } else if (userMessage === "\u63d0\u6848" || userMessage === "\u5206\u6790") {
        var suggestionText = await buildSuggestion();
        await client.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: "text", text: suggestionText }],
        });
      } else if (userMessage === "\u30d8\u30eb\u30d7" || userMessage === "help") {
        var helpText = "\ud83e\udd16 \u30b3\u30de\u30f3\u30c9\u4e00\u89a7\n";
        helpText += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n";
        helpText += "\ud83d\udcca \u300c\u5168\u4f53\u300d- \u30c1\u30fc\u30e0\u30ec\u30dd\u30fc\u30c8\n";
        helpText += "\ud83d\udca1 \u300c\u63d0\u6848\u300d- AI\u5206\u6790\u3068\u63d0\u6848\n";
        helpText += "\u2753 \u300c\u30d8\u30eb\u30d7\u300d- \u3053\u306e\u30e1\u30c3\u30bb\u30fc\u30b8\n\n";
        helpText += "\u203b\u5168\u3066\u306e\u4f1a\u8a71\u306f\u8a18\u9332\u3055\u308c\u307e\u3059\u3002";
        await client.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: "text", text: helpText }],
        });
      } else {
        var memberName = await getMemberName(client, event.source.type, event.source.userId);
        var data2 = await getSheetData();
        var found = null;
        for (var j = 0; j < data2.members.length; j++) {
          if (data2.members[j].name === memberName) {
            found = data2.members[j];
            break;
          }
        }
        if (found) {
          var personalReport = buildMemberReport(found);
          await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{ type: "text", text: personalReport }],
          });
        }
      }
    }

    return res.status(200).json({ message: "OK" });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: err.message });
  }
}
