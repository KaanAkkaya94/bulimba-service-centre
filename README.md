# Bulimba Service Centre

The website for Bulimba Service Centre, 41 Michael Street, Bulimba QLD 4171.

It is one page of plain HTML, CSS and JavaScript — no framework, no build step, no
database. What is in this repository is exactly what the browser receives. That is
deliberate: it loads fast, costs nothing to host, and anyone who knows HTML can
maintain it without learning anything first.

**Live at:** https://bulimbaservicecentre.com.au

---

## Looking at it before you change it

```bash
node dev-server.mjs          # then open http://localhost:4173
```

Needs Node (any recent version). The page reloads itself whenever you save a file.

---

## Making a change

Everything a business usually needs to update is in `index.html`. Search for the
current value and replace it.

| To change | Search `index.html` for | Appears |
|---|---|---|
| Phone number | `07 3395 5905` | header, hero, contact, footer |
| Phone link | `tel:+61733955905` | alongside each of the above |
| Email | `info@bulimbaservicecentre.com` | hero, contact |
| Opening hours | `8:00 — 17:00` | contact table, footer |
| Address | `41 Michael Street` | hero, contact, footer, map link |
| The services list | `class="part"` | services section |
| Headline | `A mechanic` | hero |

The phone number appears in several places and the `tel:` links are formatted
differently to the visible text. Change both.

### ⚠️ The phone, address and hours appear twice

Near the top of `index.html` there is a `<script type="application/ld+json">`
block. It repeats the address, phone number and opening hours in a form Google
reads directly, which is what lets search results show the hours and a call
button. It is invisible on the page, so it is easy to forget.

**If you change the hours, the phone or the address, change them there too.**
Out-of-date details there are worse than none, because Google will publish them.

Then:

```bash
git add -A && git commit -m "Update opening hours" && git push
```

It is live about a minute later. GitHub Pages rebuilds on every push to `main`.

### If you add an image or a video

Put it in `assets/img/` or `assets/video/`. Keep images under about 250 KB and
videos under about 1 MB — the whole page is currently around 4 MB and it should
stay that way. `ffmpeg` and `sips` were used for the existing files:

```bash
# shrink a photo
sips -s format jpeg -s formatOptions 82 -Z 1600 big.heic --out assets/img/new.jpg

# strip metadata (phone photos carry GPS coordinates)
ffmpeg -i assets/img/new.jpg -map_metadata -1 -q:v 3 assets/img/clean.jpg
```

Always strip the metadata on anything taken with a phone.

---

## How it is hosted

GitHub Pages serves the `main` branch. The custom domain is set by the `CNAME`
file at the root of the repository, containing one line:

```
bulimbaservicecentre.com.au
```

DNS points the domain at GitHub with four A records
(`185.199.108.153` through `.111.153`) and a `www` CNAME pointing at the
GitHub Pages address for this account.

### ⚠️ The mail records are not ours — do not touch them

Email runs on **Microsoft 365** and has nothing to do with this repository or
with GitHub. In the DNS zone, leave these alone:

- the `MX` record pointing at `mail.protection.outlook.com`
- the `TXT` record beginning `v=spf1`
- the `TXT` record beginning `MS=`
- the `autodiscover` CNAME

Changing the A records affects the website. Changing those four stops his email.
`dns-backup/` holds a snapshot of the whole zone as it was before the site moved,
so anything can be restored exactly.

---

## About the pictures

Nearly all the imagery and all the video is **generated, not photographed**. It is
brand mood, not a record of the premises — the workshop in the About section is
not his workshop, and the cars are not cars he has worked on.

The exception is the red R32 GT-R, which belongs to the owner. Those four
photographs are his own, supplied by him.

If real photographs of the workshop ever become available they should replace the
generated ones. The layout takes them without changes.

---

## What the folders are

| Path | What it is |
|---|---|
| `index.html` | the site — everything a visitor sees |
| `assets/` | stylesheet, script, images, video |
| `dev-server.mjs` | local preview with live reload |
| `snapshot.mjs` | freezes the current site into `versions/` |
| `versions/` | design alternatives shown to the owner while deciding |
| `clips/` | the generated footage, with notes on each |
| `dns-backup/` | the DNS zone as it was before the site moved |

`versions/` and `clips/` are working material, kept for reference. They are not
linked from the site and `robots.txt` keeps them out of search results. Deleting
them would do no harm.

---

## Things worth knowing

**The copy was written for the mock-up.** Lines like "Trained, qualified hands on
every job" were drafted to fill the design and approved by the owner rather than
written by him. If anything reads wrong, it can simply be changed.

**There is no contact form or chat.** That was a deliberate decision — the owner
had one on the previous site and did not monitor it, so enquiries went unanswered.
Everything now points at the phone number and the email address instead. Do not
add a form unless somebody has agreed to read it.

**The hero video autoplays** using the native `autoplay muted playsinline`
attributes. Do not remove any of those three — without them, mobile browsers
refuse to play it and visitors see a still frame.

**The page title and the shared-link title differ on purpose.** `<title>` names
the trade and the suburb because that is what people type into Google.
`og:title` keeps "A mechanic you can trust" because that is what appears when
somebody shares the link in a message. Do not make them the same again.

**The biggest lever for being found is not in this repository.** For a local
workshop, a claimed Google Business Profile — hours, photos, reviews — does far
more than anything in the page head. If that is not set up, start there.
