import { COLORS, TITLE_SMALL, TITLE_MAIN } from "./colors.mjs";

// 日本時間で「今日は何日目か」
export function dayIndex(now = new Date()) {
  return Math.floor((now.getTime() + 9 * 3600 * 1000) / 86400000);
}

// 種(たね)から、毎回同じ「ばらばらの順番」を作る
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffledOrder(n, cycle) {
  const arr = Array.from({ length: n }, (_, i) => i);
  const rnd = mulberry32(cycle * 7919 + 13);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
// n個の中から、「今日のひとつ」を選ぶ。一周するまで同じものは出ません。
export function pickIndex(n, d, salt = 0) {
  const cycle = Math.floor(d / n), pos = d % n;
  const order = shuffledOrder(n, cycle + salt * 1000);
  if (cycle > 0 && n > 2) {                   // 前の周の最後と同じなら、入れかえる（その周の間ずっと同じ順番にします）
    const prevLast = shuffledOrder(n, cycle - 1 + salt * 1000)[n - 1];
    if (order[0] === prevLast && n > 1) [order[0], order[1]] = [order[1], order[0]];
  }
  return order[pos];
}

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
export function dateLabel(now = new Date()) {
  const j = new Date(now.getTime() + 9 * 3600 * 1000);
  return `${j.getUTCMonth() + 1}月${j.getUTCDate()}日(${WEEK[j.getUTCDay()]})`;
}

export function todaysColor(now = new Date()) {
  return COLORS[pickIndex(COLORS.length, dayIndex(now), 0)];
}
export function todaysPhoto(photos, now = new Date()) {
  if (!photos.length) return null;
  return photos[pickIndex(photos.length, dayIndex(now), 1)];
}

// LINEに送るカード（Flexメッセージ）
export function buildCard({ now = new Date(), photos = [], baseUrl = "", link = {} } = {}) {
  const c = todaysColor(now);
  const photo = baseUrl ? todaysPhoto(photos, now) : null;
  const bubble = {
    type: "bubble",
    body: {
      type: "box", layout: "vertical", backgroundColor: c.hex, paddingAll: "22px", spacing: "md",
      contents: [
        { type: "text", text: dateLabel(now), size: "sm", color: c.text, align: "center" },
        { type: "text", text: TITLE_SMALL, size: "sm", color: c.text, align: "center" },
        { type: "text", text: TITLE_MAIN, size: "lg", weight: "bold", color: c.text, align: "center", wrap: true },
        { type: "text", text: c.name, size: "4xl", weight: "bold", color: c.text, align: "center", margin: "lg" },
        { type: "text", text: c.note, size: "sm", color: c.text, align: "center", wrap: true, margin: "md" },
      ],
    },
  };
  if (photo) {
    bubble.hero = {
      type: "image", url: `${baseUrl}/photos/${encodeURIComponent(photo)}`,
      size: "full", aspectRatio: "1:1", aspectMode: "fit", backgroundColor: c.hex,
    };
  }
  if (link.label && link.url) {
    bubble.footer = {
      type: "box", layout: "vertical",
      contents: [{ type: "button", style: "link", action: { type: "uri", label: link.label, uri: link.url } }],
    };
  }
  return { type: "flex", altText: `今日のラッキーカラーは「${c.name}」です`, contents: bubble };
}

export const WELCOME_TEXT =
  "友だち追加ありがとうございます😊\n\n" +
  "マモルマヌーの「今日のラッキーカラー」を、毎日お届けします。\n" +
  "何か一言（例：「おはよう」）を送ると、今日の色が届きます。";
