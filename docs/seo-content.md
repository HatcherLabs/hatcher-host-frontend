# Public content SEO

Tutorials have a catalog at `/tutorials` and one primary video page at
`/tutorials/[slug]`. Existing hash bookmarks still select the catalog player.

- Keep publication dates in `lib/tutorials.ts` tied to the original release.
- Add a written companion guide in `lib/tutorial-guides.ts` for each video.
- Only label text as a transcript when it comes from that exact recording.
  The models tutorial captions were matched to the released MP4 by SHA-256.
- The catalog emits ItemList; each watch page emits VideoObject and breadcrumbs.
- Both the regular sitemap and `/video-sitemap.xml` discover watch pages.
  robots.txt advertises both sitemaps.

`contentLocales` in `lib/seo.ts` is the shared policy for primary content language.
English editorial content stays accessible with localized navigation, but its
canonical and sitemap entry point to English. Only declare another language when
the primary content has actually been translated. next-intl's automatic Link
header is disabled because it cannot express these per-route exceptions.

Global structured data is limited to Organization and WebSite. SoftwareApplication
appears on `/platform`, and its offer names/prices use the same shared TIERS catalog
as the visible platform table. Do not duplicate numeric prices in JSON-LD.

After a production build, run:

```sh
npm test -- __tests__/seo.test.ts __tests__/tutorials.test.ts __tests__/localeHeader.test.ts
./scripts/test-production-root-route.sh
```

The runtime check invokes `scripts/smoke-seo.mjs`, including every sitemap URL,
matching canonicals, indexability, localized content exceptions, video schemas,
missing-page HTTP status, private exclusions and the www redirect. The existing
CI runtime step already calls this check. It can also target a running preview:

```sh
node scripts/smoke-seo.mjs http://127.0.0.1:3000
CI=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test e2e/seo.spec.ts --project=chromium-public
```

These checks prove crawlability and metadata consistency, not that Google has
indexed a URL. Use Search Console to inspect indexing, query impressions, clicks,
and validation after recrawling. Field Core Web Vitals require actual user data;
do not infer them from a successful build or a local browser smoke test.
