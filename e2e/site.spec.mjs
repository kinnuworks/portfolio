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

test("the first screen shows a real line of code, not only words", async ({ page }) => {
  await page.goto("/");
  const pre = page.locator(".hero pre").first();
  await expect(pre).toBeInViewport();
  const n = featured.find((p) => p.heroLine);
  const line = readFileSync(`content/code/${n.cache}.full`, "utf8").split("\n")[n.heroLine - 1].trim();
  await expect(pre).toContainText(line);
});

test("opening a clause lights its enforcing lines in order, and it's over within a second", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const item = page.locator(`#${featured[4].slug}`);
  await item.locator("summary").click();
  const delays = await item.locator(".ln.hot").evaluateAll((els) => els.map((e) => {
    const s = getComputedStyle(e, "::before");
    return [s.animationName, parseFloat(s.animationDelay) * 1000 + parseFloat(s.animationDuration) * 1000];
  }));
  expect(delays.length).toBeGreaterThan(0);
  for (const [name] of delays) expect(name).toBe("mark");
  for (let i = 1; i < delays.length; i++) expect(delays[i][1]).toBeGreaterThanOrEqual(delays[i - 1][1]);
  expect(Math.max(...delays.map((d) => d[1]))).toBeLessThanOrEqual(1000);
});

test("a visitor from a ONEWHO application link is told what that link records", async ({ page, context, baseURL }) => {
  await page.goto("/");
  await expect(page.locator("#via")).toBeHidden();
  await context.addCookies([{ name: "ow_a", value: "unstop", url: baseURL }]);
  await page.goto("/");
  await expect(page.locator("#via")).toBeVisible();
  await expect(page.locator("#via")).toContainText("Unstop application link");
  await context.addCookies([{ name: "ow_a", value: "<img src=x onerror=alert(1)>", url: baseURL }]);
  await page.goto("/");
  expect(await page.locator("#via img").count()).toBe(0);
});

test("a link to one product opens it, even past the first three", async ({ page }) => {
  const p = featured[6];
  await page.goto(`/#${p.slug}`);
  expect(await page.locator(`#${p.slug} details`).evaluate((d) => d.open)).toBe(true);
  await page.goto(`/work/${p.slug}`);
  await page.locator(".crumb a").click();
  expect(await page.locator(`#${p.slug} details`).evaluate((d) => d.open)).toBe(true);
});

test("the 404 page is kept out of search results", async ({ page }) => {
  await page.goto("/no-such-page");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
});

test("every product has a heading, and every code block is a labelled group", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("li.clause summary h3")).toHaveCount(7);
  const unlabelled = await page.locator("pre").evaluateAll((ps) => ps.filter((p) => p.getAttribute("role") !== "group" || !p.getAttribute("aria-label")).length);
  expect(unlabelled).toBe(0);
});

test("every state is reachable with ?state=", async ({ page }) => {
  await page.goto("/?state=via");
  await expect(page.locator("#via")).toContainText("Unstop application link");
  await page.goto("/?state=open");
  expect(await page.locator("li.clause details").evaluateAll((ds) => ds.every((d) => d.open))).toBe(true);
  await page.goto("/?state=closed");
  expect(await page.locator("li.clause details").evaluateAll((ds) => ds.every((d) => !d.open))).toBe(true);
  await page.goto("/");
  await expect(page.locator("#via")).toBeHidden();
});
