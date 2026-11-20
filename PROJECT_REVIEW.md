# Project Review

## Project Overview

“내 옷장” is a browser-based outfit planner that helps users answer “오늘 뭐 입지?” with their registered wardrobe and the weather across an outing. It preserves the existing wardrobe experience and adds optional user-uploaded outfit references. The service uses deterministic rules, not an AI model.

Primary flow: open the app → see today's selected-city weather → request an outfit → review the actual closet items, reasons and preparation items → choose an outfit combination.

## Main User Flow

1. A fresh browser starts with an empty closet. Existing saved closet records are loaded from the existing `my-closet-mvp-v1` key and are not overwritten.
2. Users can register or delete closet items, or explicitly choose “샘플 옷장으로 체험하기”. Sample items use the `demo-` ID namespace and append to existing items without replacement. They are labeled in closet cards and recommendation results.
3. The compact home shows “오늘 뭐 입지?”, a current weather summary for the selected city, and a prominent “오늘의 코디 추천받기” action.
4. City, date, departure/return times and purpose remain editable under a collapsed settings row. Those preferences are stored with existing localStorage data. Browser location stays optional and is only requested on explicit action.
5. The recommendation uses actual registered items plus hourly Open-Meteo data across the outing. Same-day and overnight intervals are supported.
6. Optional reference looks are uploaded from PNG/JPG/WEBP files. Users manually enter only the visible clothing category, color and style. No image analysis or SNS integration is claimed.

## File Structure

```text
src/
  App.tsx                         Home flow, closet, outing form, reference upload and results
  App.test.tsx                    React interactions for empty state, sample merge, selected item and reference upload
  index.css                       White/charcoal/electric-blue responsive fashion UI
  main.tsx                         React entry point
  lib/
    recommendation.ts             Pure wardrobe, reference and outing recommendation functions
    recommendation.test.ts        Rule, edge-case, alternative and stable-order tests
    weather.ts                     Domestic city data, Open-Meteo client and demo forecasts
    weather.test.ts                Weather request and scenario tests
  imageStore.ts                  IndexedDB Blob save/load/delete operations
  imageStore.test.ts             IndexedDB persistence tests
  sampleImages.ts                 Maps stable sample IDs to bundled crop coordinates
  sampleImages.test.ts            Verifies all 18 products have unique image mappings
ai-images/
  closet-tops-outerwear.png       Generated 3x2 apparel product sheet
  closet-bottoms-shoes-a.png      Generated 3x2 bottoms and footwear sheet
  closet-shoes-accessories.png   Generated 3x2 shoes and accessories sheet
  closet-trench-coat.png         Generated standalone trench-coat image
    sampleImages.ts                 Stable mapping from all 18 sample IDs to bundled product crops
    sampleImages.test.ts            Image mapping count, uniqueness and scarf/trench mapping checks
ai-images/
  closet-tops-outerwear.png         Generated 3x2 product-photo sheet
  closet-bottoms-shoes-a.png        Generated 3x2 product-photo sheet
  closet-shoes-accessories.png     Generated 3x2 product-photo sheet
  closet-trench-coat.png           Generated isolated trench-coat product cutout
index.html                         App shell and preview bridge
vite.config.ts                     Vite, React and Tailwind configuration
PROJECT_REVIEW.md                  This architecture and test report
```

## Preserved Existing Data and Features

- Keeps the current localStorage key and reads existing closet items without deleting or reseeding them.
- Fresh browser state is empty. Sample outfits are opt-in and merged with existing closet items under unique `demo-` IDs.
- Keeps category, color, style, custom “기타” category, warmth, weather tags, registration/deletion, filters, settings and reset.
- The design layer now uses white `#FFFFFF`, surface `#F5F5F5`, text `#151515`, and blue `#3155E7` with Pretendard-first typography. Desktop wardrobe/catalog grids use four columns; mobile rules use two.
- Wardrobe, mini-closet, catalog and recommendation image frames use a consistent 4:5 crop. All 18 catalog sample IDs retain their IDs and metadata and map to an individual generated product tile; the trench coat has its own generated product image.
- Sample contact sheets are bundled assets imported through Vite, so production builds emit local hashed image files rather than relying on remote image hosts. Crop cell positions are unique and covered by tests.
- Existing user `imageUrl` values take precedence. Seven exact legacy Unsplash URLs that came from the previous built-in sample catalog are recognized as old catalog placeholders and replaced visually by the corrected bundled product image without mutating saved data. Uploaded/reference blobs remain in IndexedDB untouched.
- Adds optional saved outing preferences while retaining older records that do not have that field.
- `resetData` is user-confirmed and clears closet/reference metadata and reference image blobs.
- Existing pre-registered reference outfits are no longer shown as user-facing sample outfit cards. They are not presented as image-grounded observations.

## Recommendation Algorithm

There are no numeric fit scores and no hidden rank ordering.

### Outing

- `selectOutingForecast` selects forecast points in the chosen date/time interval. If the return time is equal to or earlier than departure, return is interpreted as the following day.
- `recommendForOuting` is a pure function receiving the closet, hourly forecast and purpose. It returns base items, up to three alternatives, extra preparation items, missing categories, reasons, and unknown-data notes.
- Base outfit categories are top, bottom and shoes. It selects only registered items, stable by ID. Missing categories are reported, never synthesized.
- Purpose preferences are limited and explicit: daily uses stable ID order; date prefers romantic/classic; travel prefers casual/sporty; outdoor activity prefers sporty/casual. If no preferred style exists, it uses the stable fallback and says what it selected.
- Additional combinations are generated deterministically from actual registered options and exclude the primary combination.
- Warm/cold/rain heuristics are centralized in `outingRecommendationRules`. They are approximate app guidance, not official weather warnings.
- Unknown warmth or waterproof/cold metadata is never inferred from item name, category, color, or reference imagery.
- Adding/deleting a closet item recalculates the result from the current closet and forecast.

### Uploaded Reference Image

- `matchReferenceGarments` receives only user-entered reference garment rows and the actual closet.
- It first filters by exact category, then deterministically orders candidates by normalized color family, exact style, and stable ID.
- Each row explains the concrete matching reason or says no closet item exists for that category.
- An uploaded image may contain zero annotations; no unseen garment is inferred or required.

## Weather and Demo Behavior

- Real weather uses Open-Meteo without an API key. Manually selected domestic city coordinates are used by default. For Seoul, the request coordinates are `37.5665,126.978`; Open-Meteo reports the snapped model grid at `37.55,127` in its response.
- Every forecast request explicitly sets `timezone=Asia/Seoul`. The home weather card reads `current.temperature_2m`, `daily.temperature_2m_min/max`, and the hourly `precipitation_probability` corresponding to the current API hour. It shows the API date/time, selected city and Open-Meteo source. Outing weather remains separately labeled as the selected outing forecast.
- Missing/non-finite current, daily, or current-hour rain values throw an error and show “날씨 정보를 불러올 수 없어요”; no zero fallback is substituted.
- Root cause of the previous mismatch: the home card chose the first hourly forecast after the browser clock and rounded it to an integer, while also calculating daily high/low and rain probability from hourly arrays. That later hour was labeled “current” and daily bounds could differ from the API's daily fields. It now uses the API's dedicated current and daily fields and identifies the rain probability's hour.
- Live validation at `2026-11-20T17:45` Asia/Seoul: requested Seoul coordinates `37.5665,126.978`; Open-Meteo responded on model grid `37.55,127` with `current.temperature_2m=0.1`, daily `min=-3.1`, `max=1.4`, and precipitation probability `0` for `17:00`. The browser showed `0.1°`, `-3.1° / 1.4°`, and `17시 강수확률 0%` respectively. The old `0°` was not a default fallback, but it represented a rounded later-hour value rather than the API's actual current field.
- Current location remains optional. The app asks for browser permission only after explicit user action, sends the coordinates to the weather provider, and does not persist them.
- Today's summary is requested for the selected city. The primary action requests the selected outing forecast; city changes trigger the matching summary/forecast coordinates.
- Overnight intervals request forecasts for both calendar dates and select across midnight. Dates are bounded to the provider forecast horizon.
- Weather failures are shown as unavailable; the closet and reference features remain usable.
- Demo scenarios are inside Settings rather than the ordinary outing form. Successful simulated weather is labeled as sample, not real forecast. “No suitable closet” and “warmth missing” operate on a temporary analysis input and do not alter the stored closet.

## Image Upload and Storage

- Accepted formats: PNG, JPG/JPEG, and WEBP. Uploads over 10 MB are rejected.
- The preview uses a temporary object URL. On save, image Blob data is persisted in IndexedDB; reference title, key, and manually entered garment rows are stored in localStorage.
- On load, the Blob is read from IndexedDB and displayed beside candidate closet items. Missing or unavailable image data gets a clear placeholder.
- Deleting a reference deletes its IndexedDB image and localStorage metadata.
- Unsupported browsers/storage failures report an error instead of pretending the image was saved.
- No image recognition, crawling, external AI upload, virtual try-on, or social account integration is included.

## Test Results

Latest automated results:

- `npm run build`: passed.
- `npm test`: 44 tests passed across 5 test files.
- Recommendation tests cover exact/partial/empty matching, stable deterministic ordering, purpose style preference, alternatives, cold/rain preparation, missing warmth, no suitable items and overnight forecast selection.
- Weather tests cover demo scenarios, explicit Seoul timezone, coordinate query, Open-Meteo current/daily/hourly field mapping, missing-value failure and API failure.
- Image-map tests confirm the 18 unchanged sample closet IDs resolve to unique generated product image crops; scarf, umbrella and trench use their matching silhouettes.
- Sample image tests confirm all 18 original sample IDs map to unique bundled sheet cells or the separate trench asset, including a scarf image cell.
- IndexedDB tests cover Blob save, load and delete.
- React integration tests cover fresh empty state, sample wardrobe merge without overwriting a user item, selected catalog card state and persistence, reference file selection/manual annotation/metadata persistence, and rejection of unsupported file types.
- Browser checks exercised compact home, today's live Seoul weather, outing recommendation, sample wardrobe and the catalog modal. The displayed Seoul values at verification time matched a direct Open-Meteo response: current `0.1°C` at `17:45`, daily minimum `-3.1°C`, maximum `1.4°C`, and `0%` precipitation probability for the `17:00` hour. The live call returned timezone `Asia/Seoul`; its model grid was `37.55,127` for the requested Seoul coordinates.
- The catalog and closet browser screenshot showed different generated product images for shirt, striped tee, knit and hoodie; automated mapping checks cover all 18 items. Browser runtime errors and failed image/API requests were 0 in checked flows.
- Selected-city changes were verified in the React integration test: selecting Busan triggered another weather request with Busan's coordinates and the UI region label updated.

Validation boundaries:

- The reference-upload React test uses a browser-like in-memory File. It verifies the upload flow and metadata; the actual physical device file picker and image codec rendering were not manually exercised in the headless browser.
- The mobile layout is responsive by CSS with two-column cards and a scrollable modal. The available browser-check tool only exposed its default desktop viewport in this session, so a separate narrow-viewport rendered screenshot is not claimed.

## Known Limits and Follow-ups

- The selected city uses city-center coordinates, not neighborhood geocoding. GPS results show “현재 위치 주변” rather than a reverse-geocoded district.
- Purpose is a simple style preference, not semantic activity or formality understanding.
- Outfit decisions remain heuristic, not AI styling advice. Weather forecasts can change.
- The 18 built-in sample garments use generated ecommerce-style product images, clearly marked “체험용”; they are not actual user-owned garments. User-owned closet photos are not auto-recognized or inferred.
- Before public launch, review Open-Meteo usage terms and privacy notices for location transfer and browser storage. No secrets or personal data are included in this review file.
- Authentication, sync, body measurements, AI image recognition, and virtual try-on remain out of scope.

## Main Modified Files

- `src/App.tsx`
- `src/index.css`
- `src/lib/recommendation.ts`
- `src/lib/recommendation.test.ts`
- `src/lib/weather.ts`
- `src/lib/weather.test.ts`
- `src/lib/sampleImages.ts` / `src/lib/sampleImages.test.ts`
- `src/lib/weather.ts` / `src/lib/weather.test.ts`
- `ai-images/closet-tops-outerwear.png`
- `ai-images/closet-bottoms-shoes-a.png`
- `ai-images/closet-shoes-accessories.png`
- `ai-images/closet-trench-coat.png`
- `src/lib/imageStore.ts`
- `src/lib/imageStore.test.ts`
- `src/App.test.tsx`
- `package.json` / lockfile for the IndexedDB and React integration test dependencies
- `PROJECT_REVIEW.md`
