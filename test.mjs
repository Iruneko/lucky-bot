import assert from "node:assert";
import { buildCard, dayIndex, pickIndex, todaysColor, dateLabel } from "./card.mjs";
import { COLORS } from "./colors.mjs";

const day = (s) => new Date(`${s}T08:00:00+09:00`);

// 色の定義が正しい
for (const c of COLORS) {
  assert.match(c.hex, /^#[0-9A-Fa-f]{6}$/); assert.match(c.text, /^#[0-9A-Fa-f]{6}$/);
  assert.ok(c.name && c.note);
}
// 同じ日は、いつ見ても同じ（全員同じ色）
assert.equal(todaysColor(day("2026-11-01")).name, todaysColor(new Date("2026-11-01T14:59:00Z")).name);
// 日本時間の0時で切りかわる
assert.equal(dayIndex(new Date("2026-10-31T14:59:00Z")) + 1, dayIndex(new Date("2026-10-31T15:00:00Z")));
// 一周する間は、同じ色が出ない / 連続して同じ色にならない
const n = COLORS.length, seen = new Set();
const base = Math.floor(20000 / n) * n;
for (let i = 0; i < n; i++) seen.add(pickIndex(n, base + i));
assert.equal(seen.size, n);
let prev = -1;
for (let i = 0; i < 2000; i++) { const x = pickIndex(n, 20000 + i); assert.notEqual(x, prev); prev = x; }
// 写真も同様
const ph = ["a.jpg", "b.jpg", "c.jpg"];
for (let i = 0; i < 300; i++) assert.notEqual(pickIndex(3, 20000 + i, 1), pickIndex(3, 20001 + i, 1) );
// カードの形
const c1 = buildCard({ now: day("2026-11-01"), photos: ph, baseUrl: "https://x.onrender.com", link: { label: "動画を見る", url: "https://youtube.com/@x" } });
assert.equal(c1.type, "flex"); assert.match(c1.altText, /ラッキーカラー/);
assert.match(c1.contents.hero.url, /^https:\/\/x\.onrender\.com\/photos\/[a-c]\.jpg$/);
assert.equal(c1.contents.hero.backgroundColor, c1.contents.body.backgroundColor); // 写真の背景は、今日の色
assert.ok(c1.contents.footer);
assert.equal(dateLabel(day("2026-11-01")), "11月1日(日)");
// 写真なし・URLなしでも壊れない
const c2 = buildCard({ now: day("2026-11-01"), photos: ph, baseUrl: "" });
assert.ok(!c2.contents.hero && !c2.contents.footer);
const c3 = buildCard({ now: day("2026-11-01") });
assert.ok(c3.contents.body.contents.length === 5);
console.log("全部OK", { colors: COLORS.length });
