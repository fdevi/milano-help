# Architecture rules
- Use react-helmet-async under a single provider for route metadata; each route owns its canonical to avoid duplicate canonical tags.
- Public announcement discovery uses a paginated `/annunci` directory and a predev/prebuild sitemap generator; live directory queries discover new listings between publishes.
- Only active announcements are indexable; database read policies preserve unpublished access solely for owners and authorized staff.
- Sitemap entries omit lastmod unless a timestamp represents significant page content changes, not counter updates.