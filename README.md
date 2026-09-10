# George's Website — build notes

## What's here

```
george-website/
├── index.html          Home
├── football.html        Football page
├── games.html            Video Games page
├── school.html            School Zone page
├── about.html              About Me / Gallery / FAQ
├── css/
│   └── styles.css          One shared stylesheet (Garibaldi Grid design system)
├── js/
│   └── main.js              Shared behaviour: mobile nav, scroll reveal, card rendering
└── assets/
    └── images/
        ├── players/         Football player + club badge photos
        ├── games/            Game cover art / screenshots
        ├── school/            Certificate / achievement photos
        └── gallery/           About page photos
```

Every page links to the same `css/styles.css` and `js/main.js`, so the browser only downloads them once no matter how many pages someone visits.

## How to add real content (no coding needed)

Each of the three interest pages (`football.html`, `games.html`, `school.html`) has a small block near the bottom of the file, inside a `<script>` tag, that looks like this:

```js
const FOOTBALL_PLAYERS = [
  { title: '[Player name]', meta: '[Position]', description: '[Why I rate him]', photoAlt: 'Player photo' },
  ...
];
```

To update the site: edit the text inside the quotes, save the file, refresh the page. You never need to touch the HTML layout or the CSS to add a new player, game, or achievement — just add or remove one of these `{ ... }` entries.

Anywhere else in the pages you'll see square-bracket placeholders like `[Month Year]` or `[Insert...]` — those are plain text, not code. Find and replace them directly in the HTML.

## Adding real photos

Right now every photo is a dashed placeholder box so nothing looks broken. To swap one in:

1. Put the image file in the matching `assets/images/...` folder (e.g. a player photo goes in `assets/images/players/`).
2. Find the `<div class="photo-slot">...</div>` you want to replace — there's an HTML comment directly above or below most of them showing the exact `<img>` tag to paste in, for example:
   ```html
   <img src="assets/images/players/forest-badge.png" alt="Nottingham Forest badge" style="width:96px;height:96px;">
   ```
3. Replace the `photo-slot` div with that `<img>` tag.

Keep photos reasonably small (under ~300KB each, saved as `.webp` or `.jpg`) so the site stays fast on a phone.

## A note on privacy

Per the site's privacy guideline from the blueprint: first name only, no school name, no home area, and get sign-off on any photo before it goes live — this matters more once the site is public on GitHub Pages.

## About the "form"

There's deliberately no data-collecting contact form anywhere on the site — it's a personal page for a child, not a business, so there's nothing here that stores or transmits anyone's details. The About page has a plain `mailto:` link instead ("Email us"), which just opens whoever's email app with no data going anywhere else. Update the address in `about.html` (search for `mailto:hello@example.com`).

## Deploying to GitHub Pages (same approach as GeoSon Game Zone)

Repo name: **george-website**. Once it's pushed and Pages is switched on, the live site will be:

**https://ovisan-1.github.io/george-website/**

(That URL is already baked into every page's canonical link and Open Graph tags — if the GitHub username ends up being anything other than `ovisan-1`, those tags need updating to match. See `LAUNCH-CHECKLIST.md` for the full step-by-step and a pre-launch checklist.)

1. Create a new GitHub repository named `george-website` (or a folder in an existing one).
2. Copy everything in this `george-website` folder into the repo, keeping the folder structure exactly as it is.
3. Push to GitHub.
4. In the repo's Settings → Pages, set the source to the branch you pushed (usually `main`) and the root folder.
5. GitHub gives you a URL like `https://<username>.github.io/<repo-name>/` — that's the live site.

## Checked before handoff

- Every page: responsive from 360px phone width up to desktop, single shared nav/footer, `lang="en-GB"`, meta description + page title, Open Graph tags for link previews.
- Keyboard: skip-to-content link, visible focus states on links/buttons/cards, mobile menu button has `aria-expanded`.
- Motion: hero glow, card hover-lift, and the "live" badge pulse all switch off automatically for anyone with reduced-motion turned on in their OS.
- Performance: two font families (five weights total) loaded once via Google Fonts with `preconnect`, no JS framework, no icon font (icons are inline SVG), single CSS file.
