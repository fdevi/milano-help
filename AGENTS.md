# Architecture rules
- Page metadata (title, description, og:*, canonical) is set in each route's TanStack `head()` and rendered server-side so social crawlers and search engines see it; the root route holds only sitewide defaults and never a canonical or og:url.
- Public announcement discovery uses a paginated `/annunci` directory and a predev/prebuild sitemap generator; live directory queries discover new listings between publishes.
- Only active announcements are indexable; database read policies preserve unpublished access solely for owners and authorized staff.
- Sitemap entries omit lastmod unless a timestamp represents significant page content changes, not counter updates.- Routes live under `src/routes` (one file per page, auth guards wrap the page inside the route file); legacy react-router call sites go through `src/lib/router-compat.tsx` until rewritten natively.
- Announcement share previews come from the `/annuncio/$id` route loader reading only active announcements; non-active ones expose no details.
- Homepage events use a shared query filtering active, not-ended events before chronological ordering and limiting results; missing end dates use the start day's local end to match event status badges.
- Event share metadata uses a public server function with active-only reads; sitemap generation and the existing scheduled submission include active events and announcements, with live XML proxied under the verified site domain and canonical production event share URLs.
