// Records the core loop on the real page for the README: open a clause, the lines that
// stop the AI light up. Run after a build with serve.mjs on 4321: node scripts/gif.mjs
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const dir = mkdtempSync(join(tmpdir(), "gif-"));
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 900, height: 620 }, recordVideo: { dir, size: { width: 900, height: 620 } } });
const p = await ctx.newPage();
await p.goto("http://localhost:4321/");
await p.waitForTimeout(1200);
const target = p.locator("#tollgate");
await target.evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 40 }));
await p.waitForTimeout(700);
await target.locator("summary").click();
await p.waitForTimeout(2600);
await ctx.close();
await b.close();
const video = join(dir, readdirSync(dir)[0]);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", video, "-vf", "fps=10,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse", "docs/core-loop.gif"]);
console.log("docs/core-loop.gif");
