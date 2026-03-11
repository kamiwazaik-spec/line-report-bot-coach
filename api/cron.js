import { messagingApi } from "@line/bot-sdk";
import { getSheetData } from "../src/google-sheets/index.js";
import {
  buildPersonalMessages,
  buildTeamSummary,
  splitToMessages,
} from "../src/messages/index.js";

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

const GROUP_ID = process.env.LINE_GROUP_ID;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function truncate(text, max = 4900) {
  return text.length > max ? text.slice(0, max) + "\n...(省略)" : text;
}

function isAuthorized(req) {
  const authHeader = req.headers.authorization;
  const querySecret = req.query?.secret;
  const secret = process.env.CRON_SECRET;
  return (
    authHeader === `Bearer ${secret}` || querySecret === secret
  );
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

export default async function handler(req, res) {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const data = await getSheetData();
    const dateStr = getJSTDateStr();

    // グループへのサマリー送信
    const summaryText = buildTeamSummary(data, dateStr);
    const summaryMessages = splitToMessages(truncate(summaryText), 10);
    await client.pushMessage({
      to: GROUP_ID,
      messages: summaryMessages,
    });

    await sleep(700);

    // メンバーへの個別DM
    const dmSent = [];
    const dmFailed = [];

    for (const member of data.members) {
      if (!member.lineUserId) continue;
      try {
        const messages = await buildPersonalMessages(member, data);
        if (messages.length === 0) continue;
        const trimmed = messages.map((m) => ({
          ...m,
          text: truncate(m.text),
        }));
        await client.pushMessage({
          to: member.lineUserId,
          messages: trimmed,
        });
        dmSent.push(member.name);
        await sleep(700);
      } catch (err) {
        console.error(`DM失敗 [${member.name}]:`, err.message);
        dmFailed.push(member.name);
      }
    }

    console.log(`✅ 送信完了 | DM成功: ${dmSent.join(",")} | 失敗: ${dmFailed.join(",") || "なし"}`);

    return res.status(200).json({
      status: "ok",
      date: dateStr,
      groupMessage: true,
      dmSent,
      dmFailed,
      sent: data.members.length,
    });
  } catch (err) {
    console.error("CRON ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
