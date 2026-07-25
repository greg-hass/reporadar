// Generates the PWA icons from the RepoRadar logo mark into public/icons/.
// Usage: node scripts/gen-icons.mjs
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9225;
const OUT = new URL("../public/icons/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

// Full-bleed gradient tile with the radar glyph centered (safe for circle/square masks).
const page = (size) => {
  const glyph = Math.round(size * 0.62);
  const html = `<!doctype html><html><body style="margin:0">
    <div style="width:${size}px;height:${size}px;background:linear-gradient(135deg,#7c5cff,#4cc9ff);display:flex;align-items:center;justify-content:center">
      <svg width="${glyph}" height="${glyph}" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="10" fill="none" stroke="#fff" stroke-width="3" opacity="0.9"/>
        <circle cx="16" cy="16" r="3" fill="#fff"/>
        <path d="M16 16 24.5 7.5" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      </svg>
    </div></body></html>`;
  return `data:text/html,${encodeURIComponent(html)}`;
};

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  let targets;
  for (let i = 0; i < 20; i++) {
    await sleep(300);
    try {
      targets = await (await fetch(`http://localhost:${port}/json`)).json();
      if (targets.length) break;
    } catch { /* not up yet */ }
  }
  const pg = targets.find((t) => t.type === "page");
  const ws = new WebSocket(pg.webSocketDebuggerUrl);
  await new Promise((res) => (ws.onopen = res));

  let id = 0;
  const send = (method, params = {}) =>
    new Promise((res) => {
      const mid = ++id;
      const onMsg = (ev) => {
        const m = JSON.parse(ev.data);
        if (m.id === mid) {
          ws.removeEventListener("message", onMsg);
          res(m.result);
        }
      };
      ws.addEventListener("message", onMsg);
      ws.send(JSON.stringify({ id: mid, method, params }));
    });

  const sizes = [
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["apple-touch-icon.png", 180],
  ];
  for (const [name, size] of sizes) {
    await send("Emulation.setDeviceMetricsOverride", { width: size, height: size, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: page(size) });
    await sleep(400);
    const shot = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(OUT + name, Buffer.from(shot.data, "base64"));
    console.log("wrote", name, `${size}x${size}`);
  }
  ws.close();
} finally {
  chrome.kill();
}
