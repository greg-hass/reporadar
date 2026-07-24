// Dev-only mock API so the frontend can be developed/screenshotted without Postgres or a GitHub token.
// Usage: node scripts/mock-api.mjs   (listens on :4600)
//        VITE_API_BASE=http://localhost:4600/api npm run dev
import express from "express";

const app = express();
app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

const ago = (mins) => new Date(Date.now() - mins * 60_000).toISOString();
const daysAgo = (d) => new Date(Date.now() - d * 86_400_000).toISOString();

const REPOS = [
  { id: 1, fullName: "ghostty-org/ghostty", description: "Fast, native, feature-rich terminal emulator", language: "Zig", starsTotal: 31204, forks: 812, starDelta: 2847, history: [28200, 28550, 28800, 29200, 29750, 30400, 31204], topics: ["terminal", "zig", "gpu"], createdAt: daysAgo(400), license: "MIT" },
  { id: 2, fullName: "astral-sh/uv", description: "An extremely fast Python package installer and resolver", language: "Rust", starsTotal: 45882, forks: 1320, starDelta: 1932, history: [43800, 43950, 44100, 44350, 44700, 45200, 45882], topics: ["python", "packaging"], createdAt: daysAgo(700), license: "Apache-2.0" },
  { id: 3, fullName: "ollama/ollama", description: "Get up and running with large language models locally", language: "Go", starsTotal: 118441, forks: 9800, starDelta: 1655, history: [116500, 116800, 117100, 117450, 117800, 118100, 118441], topics: ["llm", "ai", "local"], createdAt: daysAgo(900), license: "MIT" },
  { id: 4, fullName: "zed-industries/zed", description: "Code at the speed of thought", language: "Rust", starsTotal: 58230, forks: 3900, starDelta: 1204, history: [56800, 57000, 57250, 57500, 57900, 58200, 58230], topics: ["editor", "rust", "gpu"], createdAt: daysAgo(1100), license: "GPL-3.0" },
  { id: 5, fullName: "maybe-finance/maybe", description: "The OS for your personal finances", language: "Ruby", starsTotal: 42017, forks: 3100, starDelta: 986, history: [41000, 41100, 41250, 41400, 41600, 41800, 42017], topics: ["finance", "rails"], createdAt: daysAgo(600), license: "AGPL-3.0" },
  { id: 6, fullName: "tauri-apps/tauri", description: "Build smaller, faster, and more secure desktop applications", language: "Rust", starsTotal: 88340, forks: 2700, starDelta: 874, history: [87400, 87500, 87650, 87800, 88000, 88200, 88340], topics: ["desktop", "rust", "webview"], createdAt: daysAgo(1500), license: "MIT" },
  { id: 7, fullName: "dockur/macos", description: "MacOS inside a Docker container", language: "Shell", starsTotal: 20900, forks: 1100, starDelta: 640, history: [20200, 20350, 20500, 20650, 20750, 20850, 20900], topics: ["docker", "macos", "kvm"], createdAt: daysAgo(410), license: "MIT" },
  { id: 8, fullName: "LadybirdBrowser/ladybird", description: "Truly independent web browser", language: "C++", starsTotal: 40500, forks: 1700, starDelta: 512, history: [39900, 40050, 40150, 40250, 40350, 40450, 40500], topics: ["browser", "serenityos"], createdAt: daysAgo(800), license: "BSD-2-Clause" },
];

const toRepo = (r, withDelta) => ({
  id: r.id,
  fullName: r.fullName,
  description: r.description,
  language: r.language,
  topics: r.topics,
  starsTotal: r.starsTotal,
  forks: r.forks,
  createdAt: r.createdAt,
  pushedAt: ago(60),
  license: r.license,
  ownerAvatar: `https://github.com/${r.fullName.split("/")[0]}.png`,
  htmlUrl: `https://github.com/${r.fullName}`,
  ...(withDelta ? { starDelta: r.starDelta, history: r.history } : {}),
});

app.get("/api/stats", (_req, res) => {
  res.json({ reposTracked: 1284, snapshotsToday: 24, starsGainedToday: 8412, lastSnapshotAt: ago(12) });
});

app.get("/api/risers", (_req, res) => {
  const items = REPOS.map((r) => toRepo(r, true));
  res.json({ items, total: items.length });
});

app.get("/api/search", (req, res) => {
  // "New" page flavour: recent createdAt; search flavour: anything.
  const fresh = req.query.createdSinceDays ? REPOS.map((r, i) => ({ ...r, createdAt: ago(30 + i * 180) })) : REPOS;
  res.json({ items: fresh.map((r) => toRepo(r, false)), total: 164380 });
});

app.get("/api/repos/:id/history", (req, res) => {
  const r = REPOS.find((x) => x.id === Number(req.params.id));
  res.json({ points: r ? r.history : [] });
});

app.listen(4600, () => console.log("mock api on :4600"));
