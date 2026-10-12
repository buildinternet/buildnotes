// chrome.mjs — start headless Chrome and talk to it over the DevTools protocol, with no packages.
// Adapted from the anatomy skill's capture script (github.com/wheresryan22/anatomy, MIT).
//
//   const page = await openPage(url, { width: 1280, height: 800, scale: 2, theme: "dark" });
//   await page.evaluate("document.title");
//   const png = await page.screenshot({ x, y, width, height });   // a Buffer
//   await page.close();
// Set CHROME_PATH if Chrome isn't found.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

export function chromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean);
  // Playwright's downloaded browsers, newest first.
  for (const [dir, subs] of [
    [join(homedir(), "Library/Caches/ms-playwright"), ["chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing", "chrome-mac/Chromium.app/Contents/MacOS/Chromium"]],
    [join(homedir(), ".cache/ms-playwright"), ["chrome-linux64/chrome", "chrome-linux/chrome"]],
  ]) {
    if (!existsSync(dir)) continue;
    for (const d of readdirSync(dir).filter((x) => x.startsWith("chromium-")).sort().reverse()) for (const s of subs) candidates.push(join(dir, d, s));
  }
  return candidates.find((p) => existsSync(p));
}

// Chrome prints its DevTools port on stderr once it is ready.
function portOf(chrome) {
  return new Promise((done, fail) => {
    let text = "";
    const timer = setTimeout(() => fail(new Error("Chrome did not start within 20 s")), 20000);
    chrome.stderr.on("data", (chunk) => {
      text += chunk;
      const m = text.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//);
      if (m) { clearTimeout(timer); done(Number(m[1])); }
    });
    chrome.on("error", (err) => { clearTimeout(timer); fail(err); });
    chrome.on("exit", (code, signal) => { clearTimeout(timer); fail(new Error(`Chrome exited before startup: ${code ?? signal}`)); });
  });
}

export async function openPage(url, { width = 1280, height = 800, scale = 2, theme, reduced = false } = {}) {
  const binary = chromePath();
  if (!binary) throw new Error("no Chrome found; set CHROME_PATH to a Chrome or Chromium binary");
  const profile = mkdtempSync(join(tmpdir(), "build-story-chrome-"));
  const chrome = spawn(binary, [
    "--headless=new", ...(process.platform === "linux" ? ["--no-sandbox"] : []),
    "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--allow-file-access-from-files",
    "about:blank",
  ]);
  const close = () => {
    chrome.kill("SIGKILL");
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
  };
  try {
    const port = await portOf(chrome);
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    let id = 0;
    const pending = new Map();
    const problems = [];
    socket.onmessage = (message) => {
      const data = JSON.parse(message.data);
      if (data.id && pending.has(data.id)) { pending.get(data.id)(data); pending.delete(data.id); }
      else if (data.method === "Runtime.exceptionThrown") problems.push(data.params.exceptionDetails.exception?.description ?? data.params.exceptionDetails.text);
    };
    await new Promise((done, fail) => { socket.onopen = done; socket.onerror = () => fail(new Error("DevTools socket failed")); });
    const send = (method, params = {}) => new Promise((done, fail) => {
      const call = ++id;
      pending.set(call, (data) => (data.error ? fail(new Error(`${method}: ${data.error.message}`)) : done(data.result)));
      socket.send(JSON.stringify({ id: call, method, params }));
    });
    const evaluate = async (expression) => {
      const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result?.value;
    };
    await send("Runtime.enable");
    await send("Page.enable");
    const features = [];
    if (theme) features.push({ name: "prefers-color-scheme", value: theme });
    if (reduced) features.push({ name: "prefers-reduced-motion", value: "reduce" });
    if (features.length) await send("Emulation.setEmulatedMedia", { features });
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: false }); // mobile emulation would lay a page with no viewport meta out at 980px
    const loaded = new Promise((done) => {
      const prev = socket.onmessage;
      socket.onmessage = (m) => { prev(m); if (JSON.parse(m.data).method === "Page.loadEventFired") done(); };
    });
    const nav = await send("Page.navigate", { url });
    if (nav.errorText) throw new Error(`could not open ${url}: ${nav.errorText}`);
    await loaded;
    await evaluate("document.fonts.ready.then(() => true)");
    return {
      send,
      evaluate,
      problems,
      // A PNG of one region of the page, in CSS px (scaled by the device scale factor).
      screenshot: async (clip) => Buffer.from((await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { ...clip, scale: 1 } })).data, "base64"),
      close: async () => { try { socket.close(); } catch {} close(); },
    };
  } catch (err) {
    close();
    throw err;
  }
}
