import { afterEach, expect, it } from 'vitest';
import { checkBusinessHours, parseWebsiteHours } from '@/lib/hours-checker';

afterEach(() => {
  delete process.env.GOOGLE_PLACES_API_KEY;
});

it('extracts structured business hours and the business name', () => {
  const result = parseWebsiteHours(`
    <html><head><title>Fallback name</title></head><body>
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "CafeOrCoffeeShop",
          "name": "Juniper &amp; Oak",
          "openingHoursSpecification": [{
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["https://schema.org/Monday", "https://schema.org/Tuesday"],
            "opens": "08:00",
            "closes": "17:00"
          }]
        }
      </script>
    </body></html>
  `);

  expect(result.name).toBe('Juniper & Oak');
  expect(result.hours).toEqual(['Mon, Tue: 08:00–17:00']);
  expect(result.hasStructuredHours).toBe(true);
});

it('falls back to visible hours and detects a live status', () => {
  const result = parseWebsiteHours(`
    <html><head><title>North Star Bakery | Toronto</title></head><body>
      <p>Monday: 9:00 AM - 5:00 PM</p>
      <p>Tuesday: Closed</p>
      <span>Open now</span>
    </body></html>
  `);

  expect(result.name).toBe('North Star Bakery');
  expect(result.hours).toEqual(['Monday: 9:00 AM - 5:00 PM', 'Tuesday: Closed']);
  expect(result.hasStructuredHours).toBe(false);
  expect(result.hasLiveStatus).toBe(true);
});

it('refuses to fetch private network addresses', async () => {
  const result = await checkBusinessHours('http://127.0.0.1:3000');
  const website = result.findings.find((finding) => finding.source === 'website');

  expect(website?.status).toBe('Unavailable');
  expect(website?.detail).toContain('Private network');
});
