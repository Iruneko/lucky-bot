// ライブラリなし（Node.js だけ）で動くLINE Botです。
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { buildCard, WELCOME_TEXT } from "./card.mjs";

const channelSecret = process.env.LINE_CHANNEL_SECRET;
const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const API_BASE = process.env.LINE_API_BASE || "https://api.line.me";
if (!channelSecret || !channelAccessToken) {
  console.error("LINE_CHANNEL_SECRET と LINE_CHANNEL_ACCESS_TOKEN を設定してください。");
  process.exit(1);
}

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
// photosフォルダがあればそこ、なければ同じ場所に置いた写真を使います
const PHOTO_DIR = fs.existsSync(path.join(ROOT_DIR, "photos")) ? path.join(ROOT_DIR, "photos") : ROOT_DIR;
// 公開URL（Renderなら自動で入ります。うまくいかないときだけ PUBLIC_URL に書きます）
const BASE_URL = (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");
// 「兄の動画を見る」などのボタン（空なら出ません）
const link = { label: process.env.LINK_LABEL || "", url: process.env.LINK_URL || "" };

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };
function listPhotos() {
  try {
    return fs.readdirSync(PHOTO_DIR).filter((f) => MIME[path.extname(f).toLowerCase()] && !f.startsWith("icon")).sort();
  } catch { return []; }
}

function validSignature(rawBody, signature) {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", channelSecret).update(rawBody).digest("base64");
  const a = Buffer.from(expected), b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function reply(replyToken, messages) {
  const res = await fetch(`${API_BASE}/v2/bot/message/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${channelAccessToken}` },
    body: JSON.stringify({ replyToken, messages }),
  });
  if (!res.ok) console.error("reply_failed", res.status, await res.text());
}

const card = () => buildCard({ now: new Date(), photos: listPhotos(), baseUrl: BASE_URL, link });

async function handleEvent(event) {
  if (event.type === "follow") {
    return reply(event.replyToken, [{ type: "text", text: WELCOME_TEXT }, card()]);
  }
  if (event.type === "message" && event.message?.type === "text") {
    return reply(event.replyToken, [card()]); // 何を送っても、今日の色を返します
  }
}

function servePhoto(req, res) {
  const name = path.basename(decodeURIComponent(req.url.replace(/^\/photos\//, "").split("?")[0]));
  const file = path.join(PHOTO_DIR, name);
  const type = MIME[path.extname(name).toLowerCase()];
  if (!type || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "public, max-age=86400" });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url.startsWith("/photos/")) return servePhoto(req, res);
  if (req.method === "GET") { res.writeHead(200); return res.end("OK"); } // 動作確認用
  if (req.method !== "POST" || req.url !== "/webhook") { res.writeHead(404); return res.end(); }

  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", async () => {
    const raw = Buffer.concat(chunks);
    if (!validSignature(raw, req.headers["x-line-signature"])) { res.writeHead(401); return res.end(); }
    res.writeHead(200); res.end();
    try {
      const { events = [] } = JSON.parse(raw.toString("utf8"));
      for (const ev of events) {
        try { await handleEvent(ev); } catch (e) { console.error("event_failed", e?.message); }
      }
    } catch (e) { console.error("bad_json", e?.message); }
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log("Bot is running on port " + port + " / photos: " + listPhotos().length);
  if (listPhotos().length && !BASE_URL) console.warn("PUBLIC_URL が未設定のため、写真は表示されません。");
});
