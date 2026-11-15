// Builds the static site from content/*.json into dist/. No dependencies, no client framework.
import { readFileSync, writeFileSync, mkdirSync, rmSync, statSync, readdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL(".", import.meta.url).pathname;
const read = (p) => JSON.parse(readFileSync(join(root, "content", p), "utf8"));
const site = read("site.json");
const featured = read("featured.json");
const products = read("products.json");
const out = join(root, "dist");
const BASE = process.env.SITE_URL || "https://dhirajkavuri.isonewho.codes";
// The deploy host serves og.png whether or not the ONEWHO address is connected yet.
const IMG_BASE = process.env.IMG_URL || "https://dhiraj-kavuri.vercel.app";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const css = readFileSync(join(root, "src", "style.css"), "utf8").replace(/\s*\n\s*/g, "\n").trim();

const codeUrl = (p) => `https://github.com/kinnuworks/${p.repo}/blob/${p.sha}/${p.path}#L${p.lines[0]}-L${p.lines[1]}`;
const repoUrl = (repo) => `https://github.com/kinnuworks/${repo}`;

function codeBlock(p, pad = 0) {
  const all = readFileSync(join(root, "content", "code", `${p.cache}.full`), "utf8").split("\n");
  const hot = (n) => p.ranges.some(([a, b]) => n >= a && n <= b);
  const rows = [];
  let k = 0;
  p.ranges.forEach(([a, b], i) => {
    const from = Math.max(1, a - pad);
    const to = Math.min(all.length, b + pad);
    if (i > 0) rows.push(`<span class="ln gap"><span class="no" aria-hidden="true">⋮</span><span class="sr">lines skipped</span></span>`);
    for (let n = from; n <= to; n++) {
      rows.push(`<span class="ln${hot(n) ? " hot" : ""}"${hot(n) ? ` style="--i:${Math.min(k++, 10)}"` : ""}><span class="no" aria-hidden="true">${n}</span>${esc(all[n - 1]) || " "}</span>`);
    }
  });
  const spans = p.ranges.map(([a, b]) => `${a}–${b}`).join(" and ");
  const label = `${p.path}, lines ${spans.replace(/–/g, " to ")}, at commit ${p.sha.slice(0, 7)}`;
  return `<figure class="code">
<figcaption><a href="${codeUrl(p)}">${esc(p.repo)}/${esc(p.path)}</a> <span class="at">lines ${spans} at ${p.sha.slice(0, 7)}</span></figcaption>
<pre tabindex="0" role="group" aria-label="${esc(label)}, the enforcing lines highlighted"><code>${rows.join("")}</code></pre>
</figure>`;
}

function links(p) {
  const l = [];
  if (p.live) l.push(`<a href="${esc(p.live)}">Try ${esc(p.name)}</a>`);
  if (p.repo) l.push(`<a href="${repoUrl(p.repo)}">Code<span class="sr"> for ${esc(p.name)}</span></a>`);
  if (p.video) l.push(`<a href="${esc(p.video)}">Demo video<span class="sr"> of ${esc(p.name)}</span></a>`);
  return l.join("");
}

function featuredBody(p, pad, h = 4) {
  return `<div class="qa">
<h${h} class="label">The question</h${h}>
<p class="q">${esc(p.question)}</p>
<h${h} class="label">My answer</h${h}>
<p class="a">${esc(p.answer)}</p>
</div>
<h${h} class="label">The lines that make it true</h${h}>
${codeBlock(p, pad)}
<h${h} class="label">What it doesn't do</h${h}>
<p class="caveat">${esc(p.caveat)}</p>`;
}

function clause(p, i) {
  return `<li class="clause" id="${p.slug}">
<details${i < 3 ? " open" : ""}>
<summary>
<span class="who">${esc(site.first)} is one who</span>
<h3 class="does">${esc(p.clause)}.</h3>
<span class="what"><strong>${esc(p.name)}</strong> ${esc(p.what)}</span>
</summary>
${featuredBody(p, 0)}
<p class="more"><a href="/work/${p.slug}">More on ${esc(p.name)}</a>${links(p)}</p>
</details>
</li>`;
}

function page({ title, description, path, body, noindex = false }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${BASE}${path}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:image" content="${IMG_BASE}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#ffffff">${noindex ? '\n<meta name="robots" content="noindex">' : ""}
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23111'/%3E%3Ctext x='16' y='22' font-family='Georgia,serif' font-size='18' fill='%23fff' text-anchor='middle'%3ED%3C/text%3E%3C/svg%3E">
<style>${css}</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top"><a href="/" class="home">${esc(site.name)}</a></header>
<main id="main">
${body}
</main>
<footer class="foot">
<p>Acadable's manifesto says: <q>${esc(site.colophonRule)}</q>. <a href="${site.colophonSource}">Read it</a>.</p>
<p>${esc(site.footerBuilt).replace("{kb}", "__KB__")}</p>
</footer>
<script>(function(){var st=(location.search.match(/[?&]state=([\\w-]+)/)||[])[1];if(st==="open"||st==="closed")document.querySelectorAll("details").forEach(function(d){d.open=st==="open";});function o(){var h=decodeURIComponent(location.hash.slice(1));if(!h)return;var el=document.getElementById(h);var d=el&&el.querySelector("details");if(d)d.open=true;}o();addEventListener("hashchange",o);})();</script>
</body>
</html>
`;
}

const heroFrom = featured.find((p) => p.heroLine);
function heroProof(p) {
  const line = readFileSync(join(root, "content", "code", `${p.cache}.full`), "utf8").split("\n")[p.heroLine - 1].trim();
  const url = `https://github.com/kinnuworks/${p.repo}/blob/${p.sha}/${p.path}#L${p.heroLine}`;
  return `<figure class="proof">
<pre tabindex="0" role="group" aria-label="${esc(p.path)}, line ${p.heroLine}"><code><span class="ln hot" style="--i:4"><span class="no" aria-hidden="true">${p.heroLine}</span>${esc(line)}</span></code></pre>
<figcaption>${esc(p.heroCaption)} <a href="${url}">${esc(p.path)}, line ${p.heroLine}</a></figcaption>
</figure>`;
}

const home = page({
  title: `${site.name}: AI that stops and asks`,
  description: site.intro,
  path: "/",
  body: `<section class="hero">
<h1>${esc(site.hero)}</h1>
${heroFrom ? heroProof(heroFrom) : ""}
<p class="intro">${esc(site.intro)}</p>
<p class="howto">${esc(site.howto)}</p>
<p class="via" id="via" role="note" hidden></p>
<script>(function(){try{var m=document.cookie.match(/(?:^|; )ow_a=([^;]+)/);if(/[?&]state=via\\b/.test(location.search))m=[0,"unstop"];if(!m)return;var a=decodeURIComponent(m[1]).replace(/[^\\p{L}\\p{N} ._-]/gu,"").replace(/[-_]+/g," ").trim();if(!a)return;a=a.charAt(0).toUpperCase()+a.slice(1);var el=document.getElementById("via");el.textContent=${JSON.stringify(site.via)}.replace("{app}",a);el.hidden=false;}catch(e){}})();</script>
</section>
<section aria-labelledby="featured-h">
<h2 id="featured-h">${esc(site.featuredHeading)}</h2>
<ol class="clauses">
${featured.map(clause).join("\n")}
</ol>
</section>
<section aria-labelledby="rest-h">
<h2 id="rest-h">${esc(site.restHeading)}</h2>
<p class="sub">${esc(site.restIntro)}</p>
<ul class="rest">
${products.map((p) => `<li><h3>${esc(p.name)}</h3><p>${esc(p.what)}</p>${p.builtFor ? `<p class="built">Built for ${esc(p.builtFor)}</p>` : ""}<p class="links">${links(p)}</p></li>`).join("\n")}
</ul>
</section>
<section aria-labelledby="outside-h">
<h2 id="outside-h">${esc(site.outsideHeading)}</h2>
<ul class="outside">
${site.outside.map((o) => `<li><h3>${esc(o.title)}</h3><p>${esc(o.text)}</p>${o.link ? `<p class="links"><a href="${esc(o.link)}">${esc(o.linkText)}</a></p>` : ""}</li>`).join("\n")}
</ul>
</section>
<section aria-labelledby="contact-h">
<h2 id="contact-h">${esc(site.contactHeading)}</h2>
<p class="links contact">${site.contact.map((c) => `<a href="${esc(c.href)}">${esc(c.text)}</a>`).join("")}</p>
</section>`,
});

const workPage = (p) => page({
  title: `${p.name}: ${site.name} is one who ${p.clause}`,
  description: p.what,
  path: `/work/${p.slug}`,
  body: `<article class="work">
<p class="crumb"><a href="/#${p.slug}">Back to all seven</a></p>
<h1><span class="who">${esc(site.name)} is one who</span> ${esc(p.clause)}.</h1>
<p class="intro"><strong>${esc(p.name)}</strong> ${esc(p.what)}</p>
<p class="built">Built for ${esc(p.builtFor)}.</p>
<p class="links">${links(p)}</p>
${featuredBody(p, 6, 2)}
</article>`,
});

const notFound = page({
  title: `Not found: ${site.name}`,
  description: site.intro,
  path: "/404",
  noindex: true,
  body: `<section class="hero">
<h1>Nothing at this address.</h1>
<p class="intro">These pages exist:</p>
<ul class="plain"><li><a href="/">Home</a></li>${featured.map((p) => `<li><a href="/work/${p.slug}">${esc(p.name)}</a></li>`).join("")}</ul>
</section>`,
});

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "work"), { recursive: true });
const files = [["index.html", home], ["404.html", notFound], ...featured.map((p) => [join("work", p.slug, "index.html"), workPage(p)])];
for (const [f] of files) mkdirSync(join(out, f, ".."), { recursive: true });
// Write once to measure, then fill in the real size of the whole site.
for (const [f, html] of files) writeFileSync(join(out, f), html);
const size = (dir) => readdirSync(dir, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? size(join(dir, e.name)) : statSync(join(dir, e.name)).size), 0);
const kb = Math.round(size(out) / 1024);
for (const [f, html] of files) writeFileSync(join(out, f), html.replace("__KB__", kb));
copyFileSync(join(root, "src", "og.png"), join(out, "og.png"));
writeFileSync(join(out, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`);
writeFileSync(join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${["/", ...featured.map((p) => `/work/${p.slug}`)].map((u) => `<url><loc>${BASE}${u}</loc></url>`).join("\n")}\n</urlset>\n`);
console.log(`built ${files.length} pages, ${kb} KB`);
