// Lighthouse, mobile, against the local build. Fails below the bar set in the plan.
// Each page runs three times and the median counts, as Lighthouse's own docs advise,
// because this machine runs other jobs and a single run is noisy.
import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";

const bar = { performance: 0.95, accessibility: 1, "best-practices": 0.95, seo: 0.95 };
const pages = ["/", "/work/concord"];
mkdirSync("test-results", { recursive: true });
let failed = false;
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
for (const path of pages) {
  const runs = [];
  for (let i = 0; i < 3; i++) {
  const out = `test-results/lh${path.replace(/\W+/g, "-")}-${i}.json`;
  execFileSync("npx", ["--yes", "lighthouse@13.6.0", `http://localhost:4321${path}`, "--quiet", "--output=json", `--output-path=${out}`,
    "--chrome-flags=--headless=new --no-sandbox", "--form-factor=mobile"], { env: { ...process.env, CHROME_PATH: chromium.executablePath() }, stdio: "inherit" });
  runs.push(JSON.parse(readFileSync(out, "utf8")));
  }
  const scores = Object.fromEntries(Object.keys(bar).map((k) => [k, median(runs.map((r) => r.categories[k].score))]));
  const low = Object.entries(bar).filter(([k, v]) => scores[k] < v);
  console.log(`lighthouse ${path}: ${Object.entries(scores).map(([k, v]) => `${k} ${Math.round(v * 100)}`).join(", ")}`);
  if (low.length) { failed = true; console.error(`  below the bar: ${low.map(([k]) => k).join(", ")}`); }
}
process.exit(failed ? 1 : 0);
