import { messagingApi } from "@line/bot-sdk";
import { getSheetData, logMessage, getRecentMessages } from "../src/google-sheets/index.js";
import { google } from "googleapis";

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

const TEAM_GOAL = 1000;
const LINE_GROUP_ID = process.env.LINE_GROUP_ID;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
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

function getJSTDateShort() {
  return new Date().toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getJSTTime() {
  return new Date().toLocaleTimeString("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

async function getMemberName(client, sourceType, sourceUserId, groupId) {
  try {
    if (sourceUserId && groupId && sourceType === "group") {
      var profile = await client.getGroupMemberProfile(groupId, sourceUserId);
      return profile.displayName || "unknown";
    }
    if (sourceUserId) {
      var profile2 = await client.getProfile(sourceUserId);
      return profile2.displayName || "unknown";
    }
  } catch (e) {
    console.error("getProfile error:", e.message);
  }
  return "unknown";
}

function extractUrls(text) {
  var urlRegex = /https?:\/\/[^\s]+/g;
  var matches = text.match(urlRegex);
  return matches || [];
}

async function recordUrls(memberName, urls, sourceType, sourceId) {
  var auth = getAuth();
  var sheets = google.sheets({ version: "v4", auth });
  var dateShort = getJSTDateShort();
  var time = getJSTTime();
  var dateTime = dateShort + " " + time;

  // Get existing data to check duplicates and count
  var res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "\u5831\u544a\u30c7\u30fc\u30bf!A:H",
  });
  var rows = res.data.values || [];

  // Get existing URLs to check duplicates
  var existingUrls = {};
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][3]) existingUrls[rows[i][3]] = true;
  }

  // Count member's total posts
  var memberTotal = 0;
  for (var j = 1; j < rows.length; j++) {
    if (rows[j][2] === memberName) memberTotal++;
  }

  var newRows = [];
  var duplicateUrls = [];
  for (var k = 0; k < urls.length; k++) {
    var url = urls[k];
    var isDuplicate = existingUrls[url] ? "\u91cd\u8907" : "";
    if (isDuplicate) {
      duplicateUrls.push(url);
      continue;
    }
    memberTotal++;
    newRows.push([dateTime, time, memberName, url, memberTotal, sourceType, sourceId, isDuplicate]);
  }

  if (newRows.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "\u5831\u544a\u30c7\u30fc\u30bf!A:H",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: newRows },
    });
  }

  return { recorded: newRows.length, duplicates: duplicateUrls.length, total: memberTotal };
}

function buildMemberReport(member) {
  var text = "\ud83d\udcca " + member.name + " \u3055\u3093\u306e\u72b6\u6cc1\n";
  text += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n";
  text += "\ud83d\udcdd \u7d2f\u8a08\u6295\u7a3f\u6570: " + member.totalPosts + "\u672c\n";
  text += "\ud83d\udd25 \u4eca\u65e5\u306e\u6295\u7a3f: " + member.todayPosts + "\u672c\n";
  if (member.todayUrls && member.todayUrls.length > 0) {
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

  var todayTotal = 0;
  var text = "\ud83d\udccb \u30c1\u30fc\u30e0\u65e5\u6b21\u30ec\u30dd\u30fc\u30c8\n";
  text += dateStr + "\n";
  text += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n";
  text += "\ud83c\udfaf 1000\u672c\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\n";
  text += bar + " " + progress + "% (" + data.totalPosts + "/1000)\n\n";

  var sorted = data.members.slice().sort(function(a, b) { return b.todayPosts - a.todayPosts; });
  for (var s = 0; s < sorted.length; s++) {
    todayTotal += sorted[s].todayPosts;
  }

  text += "\ud83d\udcca \u4eca\u65e5\u306e\u5b9f\u7e3e\n";
  text += "\ud83d\udc65 \u7a3c\u50cd: " + data.activeMembers + "/" + data.members.length + "\u4eba\n";
  text += "\ud83d\udcdd \u6295\u7a3f: " + todayTotal + "\u672c\n\n";

  text += "\u3010\u30e1\u30f3\u30d0\u30fc\u5225\u3011\n";
  var medals = ["\ud83e\udd47", "\ud83e\udd48", "\ud83e\udd49"];
  for (var i = 0; i < sorted.length; i++) {
    var m = sorted[i];
    var medal = i < 3 ? medals[i] : "";
    var icon = m.todayPosts > 0 ? "\u2705" : "\u2b1c";
    text += icon + " " + m.name + medal + ": \u4eca\u65e5" + m.todayPosts + "\u672c (\u7d2f\u8a08" + m.totalPosts + "\u672c)\n";
  }

  text += "\n\ud83d\udca1 \u300c\u63d0\u6848\u300d\u3067AI\u5206\u6790\u304c\u898b\u308c\u307e\u3059\uff01";
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

    var progress = Math.round((data.totalPosts / TEAM_GOAL) * 100);
    text += "\ud83d\udcca \u9032\u6357: " + data.totalPosts + "/" + TEAM_GOAL + "\u672c (" + progress + "%)\n";

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

    text += "\ud83c\udfaf \u6b21\u306b\u3084\u308b\u3079\u304d\u3053\u3068:\n";
    var suggestions = [];
    if (inactiveMemberNames.length > 0) {
      suggestions.push("\u30fb " + inactiveMemberNames.join(", ") + "\u306b\u58f0\u304b\u3051");
    }
    if (progress < 20) {
      suggestions.push("\u30fb \u307e\u305a200\u672c\u3092\u76ee\u6307\u3057\u3066\u30da\u30fc\u30b9UP");
    } else if (progress < 50) {
      suggestions.push("\u30fb \u6298\u308a\u8fd4\u3057\u5730\u70b9\u76ee\u6307\u3057\u3066\u52a0\u901f");
    } else {
      suggestions.push("\u30fb \u3042\u3068" + (TEAM_GOAL - data.totalPosts) + "\u672c\uff01\u30e9\u30b9\u30c8\u30b9\u30d1\u30fc\u30c8");
    }
    suggestions.push("\u30fb \u30c8\u30c3\u30d7\u6295\u7a3f\u8005\u3092\u8912\u3081\u3066\u30e2\u30c1\u30d9UP");
    for (var s = 0; s < suggestions.length; s++) {
      text += suggestions[s] + "\n";
    }
    return text;
  } catch (e) {
    console.error("buildSuggestion error:", e.message);
    return "\u5206\u6790\u30a8\u30e9\u30fc: " + e.message;
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
      if (event.type !== "message" || event.message.type !== "text") continue;

      var sourceType = event.source.type;
      var sourceUserId = event.source.userId || "";
      var groupId = event.source.groupId || LINE_GROUP_ID;
      var userMessage = event.message.text.trim();
      var memberName = await getMemberName(client, sourceType, sourceUserId, groupId);

      // Log all messages
      try {
        await logMessage(memberName, userMessage, sourceType, sourceUserId || groupId || "");
      } catch (logErr) {
        console.error("logMessage error:", logErr.message);
      }

      // Extract URLs and record them
      var urls = extractUrls(userMessage);
      if (urls.length > 0) {
        try {
          var result = await recordUrls(memberName, urls, sourceType, sourceUserId || groupId || "");
          if (event.replyToken) {
            var replyText = "\u2705 " + memberName + "\u3055\u3093\u306e\u5831\u544a\u3092\u8a18\u9332\u3057\u307e\u3057\u305f\uff01\n";
            replyText += "\ud83d\udcdd \u4eca\u56de: " + result.recorded + "\u672c\u8ffd\u52a0";
            if (result.duplicates > 0) {
              replyText += " (\u91cd\u8907" + result.duplicates + "\u4ef6\u30b9\u30ad\u30c3\u30d7)";
            }
            replyText += "\n\ud83c\udfaf \u7d2f\u8a08: " + result.total + "/" + TEAM_GOAL + "\u672c";
            await client.replyMessage({
              replyToken: event.replyToken,
              messages: [{ type: "text", text: replyText }],
            });
          }
          continue;
        } catch (recErr) {
          console.error("recordUrls error:", recErr.message);
        }
      }

      if (!event.replyToken) continue;

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
        helpText += "\ud83d\udcce URL\u3092\u8cbc\u308b \u2192 \u81ea\u52d5\u8a18\u9332\n";
        helpText += "\ud83d\udcca \u300c\u5168\u4f53\u300d\u2192 \u30c1\u30fc\u30e0\u30ec\u30dd\u30fc\u30c8\n";
        helpText += "\ud83d\udca1 \u300c\u63d0\u6848\u300d\u2192 AI\u5206\u6790\u3068\u63d0\u6848\n";
        helpText += "\u2753 \u300c\u30d8\u30eb\u30d7\u300d\u2192 \u3053\u306e\u30e1\u30c3\u30bb\u30fc\u30b8\n\n";
        helpText += "\u203b\u5168\u4f1a\u8a71\u8a18\u9332\u4e2d\u30fbURL\u3067\u81ea\u52d5\u30ab\u30a6\u30f3\u30c8";
        await client.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: "text", text: helpText }],
        });
      } else {
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
