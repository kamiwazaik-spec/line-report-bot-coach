// メンバーごとの個別コーチングメッセージ生成

export function getMizukiCoaching(member) {
  const comp = member.comparisonData || "データなし";
  return `【みずきへのコーチング】
📊 比較分析:
${comp}

✅ 今日のアクション:
・先週との再生数を比較して、伸びた動画の共通点を1つ見つけよう
・その共通点を明日の動画に必ず1つ取り入れること
・夜の報告に「先週より上手くなった点」を添えてね`;
}

export function getSakuraCoaching(member) {
  const video = member.highQualityVideo || "未報告";
  return `【さくらへのコーチング】
🎬 高品質動画分析:
今日のベスト動画: ${video}

✅ 深掘りポイント:
・なぜこの動画が一番クオリティ高いと思った？
・サムネイル・冒頭3秒・テンポの3点を自己採点してみて
・明日の動画に活かせる改善点を1つだけ決めよう`;
}

export function getRikiCoaching(member) {
  const titles = member.titleIdeas || "未投稿";
  return `【りきへのコーチング】
📝 タイトル判定:
今日の提案: ${titles}

✅ タイトル改善ポイント:
・数字を入れると再生数が上がりやすい（例: 「3つの方法」）
・「〇〇する人必見」より「〇〇だと失敗する理由」の方が刺さる
・明日は3パターン全部で「なぜ見たくなるか」を説明してみて`;
}

export function getShutaCoaching(member) {
  const analysis = member.viralAnalysis || "未分析";
  return `【しゅうたへのコーチング】
📈 バズ分析:
${analysis}

✅ 分析を深めよう:
・その動画がバズった理由は「感情」「情報」「共感」のどれ？
・同じジャンルでバズっている他の動画と比較してみて
・来週の動画にそのエッセンスを入れる具体的な計画を立てよう`;
}

export function getShizuruCoaching(member) {
  const times = member.postingTimes || "未記録";
  return `【しずるへのコーチング】
⏰ 投稿時間分析:
今日の投稿時間: ${times}

✅ 最適化アドバイス:
・TikTokのゴールデンタイムは18:00〜21:00
・朝7:00〜9:00も通勤タイムで伸びやすい
・記録した時間と再生数を照らし合わせて、自分のベスト時間を見つけよう`;
}

export function getKiichiCoaching(member) {
  const tv = member.tvProgress || "未報告";
  return `【きいちへのコーチング】
📺 TVショート進捗:
${tv}

✅ 今日のフォローアップ:
・スキルプラスTV用ショートは5本できた？
・TVコンテンツとSNSショートの違いを意識できてる？
・創太さんへの報告は具体的な数字を入れて送ろう`;
}
