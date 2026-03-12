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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  const events = req.body?.events || [];
  // イベントがない場合（LINE検証リクエスト）は200を返す
  if (events.length === 0) {
    return res.status(200).json({ status: "ok" });
  }
  for (const event of events) {
    if (event.type !== "message" || event.message.type !== "text") continue;
    const text = event.message.text.trim();
    const replyToken = event.replyToken;
    const userId = event.source.userId;
    // 「報告」コマンド → 個別コーチング送信
    if (text === "報告" || text === "レポート") {
      try {
        const data = await getSheetData();
        const member = data.members.find((m) => m.lineUserId === userId);
        if (!member) {
          await client.replyMessage({
            replyToken,
            messages: [{ type: "text", text: "メンバー情報が見つかりませんでした。管理者に連絡してください。" }],
          });
          continue;
        }
        const messages = await buildPersonalMessages(member, data);
        await client.replyMessage({ replyToken, messages: messages.slice(0, 5) });
      } catch (err) {
        console.error("報告エラー:", err);
        await client.replyMessage({
          replyToken,
          messages: [{ type: "text", text: "エラーが発生しました。しばらくしてから再試行してください。" }],
        });
      }
    }
    // 「全体」「サマリー」コマンド → チームサマリー送信
    else if (text === "全体" || text === "サマリー") {
      try {
        const data = await getSheetData();
        const dateStr = getJSTDateStr();
        const summaryText = buildTeamSummary(data, dateStr);
        const messages = splitToMessages(summaryText, 10);
        await client.replyMessage({ replyToken, messages: messages.slice(0, 5) });
      } catch (err) {
        console.error("サマリーエラー:", err);
        await client.replyMessage({
          replyToken,
          messages: [{ type: "text", text: "エラーが発生しました。" }],
        });
      }
    }
  }
  return res.status(200).json({ status: "ok" });
}
