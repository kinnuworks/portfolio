// Content checks: the code shown matches GitHub at its pinned commit, every number in
// the copy comes from the fact list, the owner has confirmed every answer in his voice,
// and the copy avoids stock AI phrasing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => JSON.parse(readFileSync(new URL(`../content/${p}`, import.meta.url)));
const featured = read("featured.json");
const products = read("products.json");
const site = read("site.json");
const facts = read("facts.json");

test("seven featured products, each with a full record", () => {
  assert.equal(featured.length, 7);
  for (const p of featured) {
    for (const k of ["slug", "ranges", "name", "clause", "what", "repo", "sha", "path", "lines", "question", "answer", "caveat", "builtFor", "cache"]) {
      assert.ok(p[k], `${p.slug} is missing ${k}`);
    }
    assert.match(p.sha, /^[0-9a-f]{40}$/, `${p.slug} needs a full commit sha`);
    assert.ok(p.live || p.video, `${p.slug} needs a live link or a video`);
  }
});

test("each cached file equals the file on GitHub at the pinned commit, and the lines exist", async () => {
  await Promise.all(featured.map(async (p) => {
    const url = `https://raw.githubusercontent.com/kinnuworks/${p.repo}/${p.sha}/${p.path}`;
    const res = await fetch(url);
    assert.equal(res.status, 200, `${url} returned ${res.status}`);
    const remote = await res.text();
    const local = readFileSync(new URL(`../content/code/${p.cache}.full`, import.meta.url), "utf8");
    assert.equal(local, remote, `${p.slug}: cached code differs from GitHub`);
    const n = remote.split("\n").length;
    assert.ok(p.lines[0] >= 1 && p.lines[1] <= n && p.lines[0] <= p.lines[1], `${p.slug}: lines out of range`);
  }));
});

test("the owner has confirmed every answer shown in his voice", () => {
  const open = featured.filter((p) => p.confirmed !== true).map((p) => p.name);
  assert.deepEqual(open, [], `answers not yet confirmed by the owner: ${open.join(", ")}`);
});

test("every number in the site copy and product list comes from the fact list", () => {
  const factText = facts.map((f) => f.text).join(" ");
  const copy = JSON.stringify(site) + JSON.stringify(products.map((p) => [p.name, p.what]));
  const stripped = copy.replace(/https?:\/\/[^"\s]+/g, "");
  const numbers = stripped.match(/\d+(\.\d+)?\+?/g) || [];
  const missing = [...new Set(numbers)].filter((n) => !factText.includes(n));
  assert.deepEqual(missing, [], `numbers with no fact: ${missing.join(", ")}`);
  for (const f of facts) assert.match(f.source, /^https:\/\//, `${f.id} needs a source link`);
});

test("copy avoids stock AI phrasing", () => {
  const text = JSON.stringify([site, featured.map((p) => [p.clause, p.what, p.question, p.answer, p.caveat]), products]);
  const banned = ["—", "→", "·", "seamless", "leverage", "cutting-edge", "passionate", "delve", "unlock", "empower", "revolution", "game-chang", "journey", "crafted", "elevate", "robust", "in today's"];
  const hits = banned.filter((b) => text.toLowerCase().includes(b.toLowerCase()));
  assert.deepEqual(hits, [], `banned phrases: ${hits.join(", ")}`);
});

test("30+ products in all, as the hero claims", () => {
  assert.ok(featured.length + products.length >= 30);
});
