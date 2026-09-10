# Launch checklist — George's Website

Repo name: `george-website` · Analytics: none · Domain: free `github.io` address
Expected live URL once published: **https://ovisan-1.github.io/george-website/**

This covers where things stand right now (what's already done and verified) and exactly what you still need to do, split into two parts: the launch checklist itself, and the beginner steps for publishing with GitHub Desktop.

## Part 1 — Launch checklist

### SEO

- [x] Every page has a unique `<title>` and meta description.
- [x] Every page has a canonical `<link>` tag pointing at its real URL under `https://ovisan-1.github.io/george-website/`.
- [x] `robots.txt` added at the site root — allows crawling (so link previews and the meta tag below still work) but explains why the site isn't meant to be indexed.
- [ ] **No `sitemap.xml`, on purpose.** Every page currently has `<meta name="robots" content="noindex, nofollow">`, which tells search engines not to index or follow links on the site. That's a deliberate privacy choice for a child's personal page — it won't show up in Google. A sitemap would contradict that, so one hasn't been added. If you ever want the site to be searchable, remove the `noindex, nofollow` line from all 5 pages first, then say the word and a sitemap can be added.
- [ ] **Confirm the GitHub username is actually `ovisan-1`.** It's baked into every canonical URL and Open Graph tag on all 5 pages. If your real username is different, those need a find-and-replace before launch (say so and it can be fixed in seconds).

### Favicon

- [x] A real favicon is in place on every page (a small inline "G" badge in Forest red) — no more default blank-page icon in the browser tab.

### Metadata & Open Graph (link previews)

- [x] All 5 pages have complete Open Graph + Twitter Card tags (title, description, image, type, url) so links shared in WhatsApp, iMessage, Discord etc. show a proper preview card instead of a blank one.
- [x] The preview image uses an **absolute** URL (`https://ovisan-1.github.io/...`), which is required — a relative path silently fails on most platforms.
- [x] Image dimensions (`og:image:width` / `height`) are set so previews don't flash/resize while loading.

### robots.txt

- [x] Added — see SEO section above for the reasoning (allows crawling, no sitemap, works alongside the per-page `noindex`).

### Analytics

- [x] **None added, as requested.** No Google Analytics, no tracking pixel, no third-party script of any kind. This matches the site's privacy-first design (no data is collected from visitors at all).

### Form handling

- [x] There is no data-collecting form anywhere on the site — the "Say hello" section on the About page uses a plain `mailto:` link, so nothing is ever stored or transmitted.
- [ ] **Replace the placeholder email.** `about.html` currently has `mailto:hello@example.com`. Search for that in `about.html`, swap in the real address you want messages to go to.

### Domain configuration

- [x] Using the free `github.io` address, as requested — no custom domain purchase or DNS setup needed.
- [ ] Publish under the exact repo name `george-website` so the URL matches what's already in the code (see the GitHub username note above too).

### HTTPS

- [ ] GitHub Pages provides HTTPS automatically for `github.io` addresses, but the **"Enforce HTTPS"** checkbox in repo Settings → Pages needs to be ticked once it appears (it can take a few minutes to become available after the first deploy). Step-by-step is in Part 2 below.

### Performance

- [x] One shared CSS file and one shared JS file across all pages (downloaded once, cached for every other page).
- [x] Fonts loaded via `<link>` tags with `preconnect` hints (not a slower `@import`).
- [x] No icon fonts or JS frameworks — icons are inline SVG, no build step, minimal JS.
- [x] The one real photo used across pages is compressed WebP (~75KB) with `width`/`height` set so the page doesn't jump around while it loads.

### Accessibility

- [x] Every page has exactly one `<h1>` and a logical heading order (verified, not assumed).
- [x] Skip-to-content link, visible focus states, `aria-current` on the active nav item, `aria-label`s on icon-only or card-style links.
- [x] Text contrast checked with real luminance/contrast-ratio maths (not eyeballed) and fixed anywhere it fell short of WCAG AA — buttons, nav links, tags, captions.
- [x] Animations respect `prefers-reduced-motion`, and content never depends on JavaScript to become visible.

### Mobile testing

- [x] Layout checked from 360px phone width up through desktop.
- [ ] **Worth doing once, yourself, after publishing:** open the live link on George's own phone (or yours) and tap through all 5 pages and the mobile menu — a real device is still the best final check.

### Backups

- [ ] GitHub itself is your backup once pushed (every commit is saved, and you can always undo). Beyond that, keep the original folder on your computer until the first successful publish, and consider keeping the original, uncompressed photo(s) somewhere safe in case you want to re-crop or reuse them later.

### Security

- [x] No third-party scripts at all except Google Fonts' stylesheet — nothing else can track, inject ads, or introduce a supply-chain risk.
- [x] No form, no login, no database — there is nothing on this site an attacker could realistically compromise or extract, since it stores no data.
- [x] `noindex, nofollow` + no sitemap is itself a security-adjacent choice: it keeps the site out of search results and off automated scraper radars, on top of hiding it from search.

### Content still to fill in (not a technical issue — just placeholders waiting on real content)

- [ ] Player names/positions/blurbs on `football.html`, games and scores on `games.html`, achievements on `school.html`.
- [ ] Fun facts, Quick-fire Qs answers, and gallery captions on `about.html`.
- [ ] Real photos to replace the "Photo coming soon" placeholders (players, games, certificates, gallery).
- [ ] Nottingham Forest club badge — deliberately left for you to add (club crests are trademarked, so one wasn't sourced automatically); instructions are in an HTML comment right above the badge placeholder in `football.html`.
- [ ] Every `[Month Year]` "Last updated" footer line.
- [ ] The `mailto:hello@example.com` placeholder (see Form handling above).

None of the above blocks publishing — the site works and looks right with placeholders in. They're just what makes it feel finished once George starts filling it in.

## Part 2 — Publishing with GitHub Desktop (exact steps)

You said you're doing this the same way as before — GitHub Desktop, not the command line. Here's the exact sequence.

1. **Create the repository on GitHub.com first.**
   Go to github.com, sign in, click the **+** in the top-right → **New repository**. Name it exactly `george-website`. Leave it Public (GitHub Pages' free tier needs a public repo, unless you have GitHub Pro/Team). Don't add a README, .gitignore, or license from the web UI — you already have your own files. Click **Create repository**.

2. **Clone it with GitHub Desktop.**
   Open GitHub Desktop → **File → Clone repository**. Pick `george-website` from the list (under your account) → choose a local folder → **Clone**.

3. **Copy your website files into the cloned folder.**
   Copy everything from your `george-website` folder — `index.html`, `football.html`, `games.html`, `school.html`, `about.html`, `robots.txt`, `README.md`, and the `css/`, `js/`, and `assets/` folders — into the folder GitHub Desktop just cloned (replacing/merging, not nesting it inside another subfolder).

4. **Commit.**
   Back in GitHub Desktop, you'll see all the new files listed under "Changes." Type a summary like `Initial site` in the box at the bottom left → **Commit to main**.

5. **Push.**
   Click **Push origin** at the top. This uploads everything to GitHub.

6. **Turn on GitHub Pages.**
   On GitHub.com, open the `george-website` repo → **Settings** tab → **Pages** (left sidebar, under "Code and automation"). Under "Build and deployment," set **Source** to `Deploy from a branch`, then set **Branch** to `main` and the folder to `/ (root)` → **Save**.

7. **Wait for it to deploy.**
   This usually takes 1–3 minutes. Refresh the Pages settings screen — it'll show "Your site is live at https://ovisan-1.github.io/george-website/" once it's ready (the actual URL will use your real GitHub username).

8. **Turn on "Enforce HTTPS."**
   Still on that same Pages settings screen, once the site is live a checkbox for **Enforce HTTPS** will appear — tick it. This makes sure nobody can ever reach the site over an insecure `http://` link.

9. **Check the username matches.**
   Compare the URL GitHub actually gave you in step 7 against `https://ovisan-1.github.io/george-website/`. If your username isn't `ovisan-1`, come back and the canonical/Open Graph tags in all 5 HTML files can be updated to match in one pass.

10. **Visit the live site and click through every page** — Home, Football, Video Games, School Zone, About — on both your phone and a computer, to do the mobile check from the checklist above.

11. **From now on, updating the site** (new scores, new photos, fixed placeholders) is: edit the files locally → GitHub Desktop shows the changes → write a short commit message → **Commit to main** → **Push origin**. The live site updates automatically within a minute or two of pushing, no extra steps needed.

That's the whole path from "files on your computer" to "live, working, private-by-default website."
