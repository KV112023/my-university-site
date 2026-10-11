const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8787;
const ROOT = __dirname;
const SAVE_DIR = path.join(ROOT, "save");
const SAVE_FILE = path.join(SAVE_DIR, "data.json");
const PICTURES_DIR = path.join(ROOT, "pictures");
const MUSIC_DIR = path.join(ROOT, "music");

const PIC_EXT = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg", ".avif"];
const MUSIC_EXT = [".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac"];
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".mp3": "audio/mpeg",
  ".wav": "audio/wav", ".ogg": "audio/ogg", ".m4a": "audio/mp4", ".flac": "audio/flac", ".aac": "audio/aac"
};

[SAVE_DIR, PICTURES_DIR, MUSIC_DIR].forEach((d) => fs.mkdirSync(d, { recursive: true }));

function listDir(dir, exts) {
  try { if (!fs.existsSync(dir)) return []; return fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile() && exts.includes(path.extname(f).toLowerCase())); }
  catch (e) { return []; }
}
function sendJSON(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" });
  res.end(JSON.stringify(obj));
}
function neteaseGet(apiPath) {
  return new Promise((resolve) => {
    const opts = {
      hostname: "music.163.com", path: apiPath, method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        "Referer": "https://music.163.com/", "Accept": "application/json"
      }
    };
    const req = https.request(opts, (res) => {
      let body = ""; res.on("data", (c) => (body += c));
      res.on("end", () => { try { resolve(JSON.parse(body)); } catch (e) { resolve(null); } });
    });
    req.on("error", () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" }); return res.end(); }
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/save" && req.method === "POST") {
    let body = ""; req.on("data", (c) => (body += c));
    req.on("end", () => { try { fs.mkdirSync(SAVE_DIR, { recursive: true }); fs.writeFileSync(SAVE_FILE, JSON.stringify(JSON.parse(body), null, 2), "utf8"); sendJSON(res, 200, { ok: true, file: "save/data.json" }); } catch (err) { sendJSON(res, 400, { ok: false, error: err.message }); } });
    return;
  }
  if (url.pathname === "/api/load" && req.method === "GET") {
    try { if (!fs.existsSync(SAVE_FILE)) return sendJSON(res, 404, { ok: false }); res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }); return res.end(fs.readFileSync(SAVE_FILE, "utf8")); }
    catch (err) { return sendJSON(res, 500, { ok: false, error: err.message }); }
  }
  if (url.pathname === "/api/list-pictures" && req.method === "GET") return sendJSON(res, 200, { ok: true, files: listDir(PICTURES_DIR, PIC_EXT) });
  if (url.pathname === "/api/list-music" && req.method === "GET") return sendJSON(res, 200, { ok: true, files: listDir(MUSIC_DIR, MUSIC_EXT) });

  // 网易云解析：封面 + 歌名 + 歌手 + LRC 歌词（Node 端无 CORS 限制）
  if (url.pathname === "/api/resolve" && req.method === "GET") {
    const id = (url.searchParams.get("id") || "").replace(/[^\d]/g, "");
    if (!id) return sendJSON(res, 400, { ok: false, error: "invalid id" });
    (async () => {
      const [detail, lyric] = await Promise.all([
        neteaseGet(`/api/song/detail?ids=[${id}]`),
        neteaseGet(`/api/song/lyric?id=${id}&lv=1&tv=-1`)
      ]);
      const song = detail && detail.songs && detail.songs[0];
      if (!song) return sendJSON(res, 200, { ok: false, error: "网易云未返回歌曲信息（接口可能受限/需登录）" });
      const lrc = lyric && lyric.lrc && lyric.lrc.lyric ? lyric.lrc.lyric : "";
      sendJSON(res, 200, {
        ok: true,
        name: song.name || "",
        artist: (song.ar || []).map((a) => a.name).filter(Boolean).join(" / "),
        pic: (song.al && (song.al.picUrl || song.al.pic_str)) || "",
        lrc
      });
    })();
    return;
  }

  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const filePath = path.join(ROOT, pathname);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not Found"); }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": `${MIME[ext] || "application/octet-stream"}; charset=utf-8` });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`服务已启动：http://localhost:${PORT}`);
  console.log(`保存路径：${SAVE_FILE}`);
  console.log(`图片目录：${PICTURES_DIR}`);
  console.log(`音乐目录：${MUSIC_DIR}`);
  console.log(`网易云解析：/api/resolve?id=xxxx`);
});