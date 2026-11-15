// Every outside link on the site answers below 400. Free-tier hosts can be slow to wake, so each gets three tries.
import { readFileSync } from "node:fs";
const html = ["index.html", ...JSON.parse(readFileSync("content/featured.json", "utf8")).map((p) => `work/${p.slug}/index.html`)]
  .map((f) => readFileSync(`dist/${f}`, "utf8")).join("\n");
const urls = [...new Set([...html.matchAll(/href="(https:\/\/[^"#]+)/g)].map((m) => m[1].replace(/&amp;/g, "&")))];
const skip = (u) => u.startsWith("https://dhirajkavuri.isonewho.codes"); // canonical, live only after ONEWHO is connected
async function check(u) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(u, { redirect: "follow", signal: AbortSignal.timeout(25_000), headers: { "user-agent": "Mozilla/5.0 link-check" } });
      // LinkedIn answers 999 to every script; that status means the page exists but refuses robots.
      if (r.status < 400 || (u.includes("linkedin.com") && r.status === 999)) return null;
      if (i === 2) return `${r.status} ${u}`;
    } catch (e) { if (i === 2) return `${e.name} ${u}`; }
  }
}
const bad = (await Promise.all(urls.filter((u) => !skip(u)).map(check))).filter(Boolean);
console.log(`links: ${urls.length} checked, ${bad.length} broken`);
bad.forEach((b) => console.error("  " + b));
process.exit(bad.length ? 1 : 0);
