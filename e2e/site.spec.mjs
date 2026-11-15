// The demo path a judge takes: read the hero, open a clause, see the question,
// the answer and the real code, go to a product page, hit a wrong address.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";

const site = JSON.parse(readFileSync("content/site.json", "utf8"));
const featured = JSON.parse(readFileSync("content/featured.json", "utf8"));

const noSideScroll = async (page) => {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(sw, "page scrolls sideways").toBeLessThanOrEqual(cw);
};

test("home: hero, seven clauses, first three open, no sideways scroll", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText(site.hero);
  const clauses = page.locator("li.clause");
  await expect(clauses).toHaveCount(7);
  for (let i = 0; i < 7; i++) {
    const open = await clauses.nth(i).locator("details").evaluate((d) => d.open);
    expect(open, `clause ${i + 1} open state`).toBe(i < 3);
  }
  await expect(clauses.first().locator("pre .hot").first()).toBeVisible();
  await noSideScroll(page);
});

test("a closed clause opens by keyboard and shows its question, answer and code", async ({ page }) => {
  await page.goto("/");
  const p = featured[3];
  const item = page.locator(`#${p.slug}`);
  await item.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(item.locator(".q")).toHaveText(p.question);
  await expect(item.locator(".a")).toHaveText(p.answer);
  const hot = await item.locator("pre .hot").count();
  const want = p.ranges.reduce((n, [a, b]) => n + b - a + 1, 0);
  expect(hot).toBe(want);
  await expect(item.locator("figcaption a")).toHaveAttribute("href", new RegExp(`${p.repo}/blob/${p.sha}/`));
});

for (const p of featured) {
  test(`product page /work/${p.slug} loads with its code`, async ({ page }) => {
    const res = await page.goto(`/work/${p.slug}`);
    expect(res.status()).toBe(200);
    await expect(page.locator("h1")).toContainText(p.clause);
    await expect(page.locator("pre .hot").first()).toBeVisible();
    await noSideScroll(page);
  });
}

test("an unknown address gives the 404 page with a way back", async ({ page }) => {
  const res = await page.goto("/no-such-page");
  expect(res.status()).toBe(404);
  await expect(page.locator("a[href='/']").first()).toBeVisible();
});

test("no accessibility violations on home or a product page", async ({ page }) => {
  for (const path of ["/", `/work/${featured[0].slug}`, "/no-such-page"]) {
    await page.goto(path);
    await page.locator("details").evaluateAll((ds) => ds.forEach((d) => (d.open = true)));
    const r = await new AxeBuilder({ page }).analyze();
    expect(r.violations.map((v) => `${path}: ${v.id} (${v.nodes.length})`)).toEqual([]);
  }
});

test("nothing sits in the bottom-right corner where the ONEWHO badge goes", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const vp = page.viewportSize();
  const hit = await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    return el && el.closest("a, button, summary, input") ? el.outerHTML.slice(0, 80) : null;
  }, [vp.width - 40, vp.height - 24]);
  expect(hit).toBeNull();
});

test("reduced motion: no animations or transitions run", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const moving = await page.evaluate(() => [...document.querySelectorAll("*")].filter((e) => {
    const s = getComputedStyle(e);
    return s.animationName !== "none" || (s.transitionDuration !== "0s" && s.transitionProperty !== "all");
  }).length);
  expect(moving).toBe(0);
});
