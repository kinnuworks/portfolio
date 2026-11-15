// The link-preview image is a screenshot of the real first screen, not a drawing.
// Run after a build: node scripts/og.mjs (needs serve.mjs running on 4321).
import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.emulateMedia({ reducedMotion: "reduce" });
await p.goto("http://localhost:4321/");
await p.addStyleTag({ content: ".top{display:none} h1{margin-top:56px} main{max-width:1000px}" });
await p.screenshot({ path: "src/og.png" });
await b.close();
