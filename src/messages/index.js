import {
  getMizukiCoaching,
  getSakuraCoaching,
  getRikiCoaching,
  getShutaCoaching,
  getShizuruCoaching,
  getKiichiCoaching,
} from "./members.js";

// 10行ごとに分割してLINEの5バブル制限に対応
export function splitToMessages(text, linesPerBubble = 10) {
  const lines = text.split("\n");
  const chunks = [];
  for (let i = 0; i < lines.length; i += linesPerBubble) {
    const chunk = lines.slice(i, i + linesPerBubble).join("\n").trim();
    if (chunk) chunks.push(chunk);
  }
  return chunks.slice(0, 5).map((chunk) => ({ type: "text", text: chunk }));
}

// メンバー名からコーチング関数を取得
function getCoachingFn(name) {
  const map = {
    みずき: getMizukiCoaching,
    さくら: getSakuraCoaching,
    りき: getRikiCoaching,
    しゅうた: getShutaCoaching,
    しずる: getShizuruCoaching,
    きいち: getKiichiCoaching,
  };
  return map[name] || null;
}

// 個人向けメッセージ（配列で返す・最大5バブル）
export async function buildPersonalMessages(member, data) {
  const coachingFn = getCoachingFn(member.name);
  if (!coachingFn) return [];

  const header = `━━━━━━━━━━━━
📋 ${member.name}さんの個人レポート
━━━━━━━━━━━━
📊 今日の投稿数: ${member.todayPosts}本
👁 総再生数: ${member.totalViews.toLocaleString()}回
📅 累計投稿数: ${member.postCount}本`;

  const coaching = coachingFn(member);
  const coachingBubbles = splitToMessages(coaching, 10);

  return [{ type: "text", text: header }, ...coachingBubbles].slice(0, 5);
}

// 後方互換（テキストで返す版）
export async function buildPersonalMessage(member, data) {
  const messages = await buildPersonalMessages(member, data);
  return messages.map((m) => m.text).join("\n\n");
}

// チームサマリー生成
export function buildTeamSummary(data, dateStr) {
  const sorted = [...data.members].sort((a, b) => b.totalViews - a.totalViews);
  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣"];

  const ranking = sorted
    .map((m, i) => {
      const medal = medals[i] || `${i + 1}.`;
      return `${medal} ${m.name}: ${m.totalViews.toLocaleString()}回 (${m.todayPosts}本)`;
    })
    .join("\n");

  return `━━━━━━━━━━━━
📊 ${dateStr} 日次レポート
━━━━━━━━━━━━
🏆 再生数ランキング:
${ranking}

━━━━━━━━━━━━
👥 チーム総計
総再生数: ${data.totalViews.toLocaleString()}回
稼働メンバー: ${data.activeMembers}名

💬 「報告」と送ると個別コーチングが届きます！`;
}
