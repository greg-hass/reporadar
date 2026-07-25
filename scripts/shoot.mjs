// CDP screenshot with proper mobile emulation (the --screenshot flag enforces a min window width).
// Usage: node scripts/shoot.mjs <url> <outfile> [width] [height] [scale] [scroll]
//   scroll=1 → scroll to the bottom twice (triggers infinite scroll) before capturing.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const [url, out, wArg, hArg, sArg, scrollArg] = process.argv.slice(2);
const width = Number(wArg || 390);
const height = Number(hArg || 844);
const scale = Number(sArg || 2);
const scroll = scrollArg === "1";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9224;

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
  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
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

  await send("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: scale, mobile: width < 500,
  });
  await send("Page.navigate", { url });
  await sleep(3500);
  if (scroll) {
    for (let i = 0; i < 3; i++) {
      await send("Runtime.evaluate", { expression: "window.scrollTo(0, document.body.scrollHeight)" });
      await sleep(1500);
    }
  }
  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(out, Buffer.from(shot.data, "base64"));
  console.log("saved", out);
  ws.close();
} finally {
  chrome.kill();
}
