import 'server-only';

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const MAX_INPUT_LENGTH = 300;
const MAX_HTML_BYTES = 1_500_000;
const REQUEST_TIMEOUT_MS = 8_000;

export type CheckTone = 'good' | 'warn' | 'neutral';

export type CheckFinding = {
  source: 'google' | 'website' | 'hours' | 'status';
  label: string;
  detail: string;
  status: string;
  tone: CheckTone;
};

export type BusinessHoursCheck = {
  name: string;
  checkedUrl?: string;
  findings: CheckFinding[];
};

export type ParsedWebsiteHours = {
  name?: string;
  hours: string[];
  hasStructuredHours: boolean;
  hasLiveStatus: boolean;
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : undefined;
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;|&#8211;/gi, '–')
    .replace(/&mdash;|&#8212;/gi, '—')
    .replace(/&#(d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

function compact(value: string) {
  return decodeHtml(value).replace(/\s+/g, ' ').trim();
}

function dayLabel(value: unknown) {
  const text = typeof value === 'string' ? value : '';
  return text.replace(/^https?:\/\/schema\.org\//i, '').slice(0, 3);
}

function formatSpecification(value: JsonRecord) {
  const days = Array.isArray(value.dayOfWeek) ? value.dayOfWeek : [value.dayOfWeek];
  const dayText = days.map(dayLabel).filter(Boolean).join(', ');
  const opens = typeof value.opens === 'string' ? value.opens : '';
  const closes = typeof value.closes === 'string' ? value.closes : '';
  if (!dayText || (!opens && !closes)) return undefined;
  return `${dayText}: ${opens || '—'}–${closes || '—'}`;
}

function walkJson(value: unknown, visit: (record: JsonRecord) => void) {
  if (Array.isArray(value)) {
    value.forEach((item) => walkJson(item, visit));
    return;
  }
  const record = asRecord(value);
  if (!record) return;
  visit(record);
  Object.values(record).forEach((item) => {
    if (item && typeof item === 'object') walkJson(item, visit);
  });
}

/** Parse published hours without executing any code from the checked website. */
export function parseWebsiteHours(html: string): ParsedWebsiteHours {
  const hours = new Set<string>();
  let name: string | undefined;
  let hasStructuredHours = false;

  for (const match of html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const data: unknown = JSON.parse(match[1].trim());
      walkJson(data, (record) => {
        const rawType = record['@type'];
        const types = Array.isArray(rawType) ? rawType : [rawType];
        const publishesHours =
          record.openingHours !== undefined || record.openingHoursSpecification !== undefined;
        const isBusiness = types.some(
          (type) =>
            typeof type === 'string' && /business|organization|store|restaurant/i.test(type),
        );
        if ((isBusiness || publishesHours) && !name && typeof record.name === 'string')
          name = compact(record.name);

        const rawHours = record.openingHours;
        if (typeof rawHours === 'string') {
          hours.add(compact(rawHours));
          hasStructuredHours = true;
        } else if (Array.isArray(rawHours)) {
          rawHours.forEach((item) => {
            if (typeof item === 'string') hours.add(compact(item));
          });
          hasStructuredHours = rawHours.length > 0 || hasStructuredHours;
        }

        const specifications = Array.isArray(record.openingHoursSpecification)
          ? record.openingHoursSpecification
          : [record.openingHoursSpecification];
        specifications.forEach((item) => {
          const specification = asRecord(item);
          const formatted = specification && formatSpecification(specification);
          if (formatted) {
            hours.add(formatted);
            hasStructuredHours = true;
          }
        });
      });
    } catch {
      // Invalid JSON-LD should not prevent checking visible page content.
    }
  }

  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (!name && title) name = compact(title).split(/\s+[|–—-]\s+/)[0];

  if (hours.size === 0) {
    const textLines = html
      .replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?\s*>|<\/p>|<\/li>|<\/div>|<\/tr>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .split(/\n+/)
      .map(compact)
      .filter(
        (line) =>
          /\b(mon(day)?|tue(sday)?|wed(nesday)?|thu(rsday)?|fri(day)?|sat(urday)?|sun(day)?)\b/i.test(
            line,
          ) && /\b(\d{1,2}(:\d{2})?\s*(am|pm)|\d{1,2}:\d{2}|closed|open 24)/i.test(line),
      );
    textLines.slice(0, 7).forEach((line) => hours.add(line.slice(0, 180)));
  }

  return {
    name,
    hours: [...hours].filter(Boolean).slice(0, 7),
    hasStructuredHours,
    hasLiveStatus:
      /opensync\.ca\/embed|data-(?:view|type)=["']status["']|\b(open now|closed now)\b/i.test(html),
  };
}

function isPrivateAddress(address: string) {
  const normalized = address.toLowerCase().replace(/^::ffff:/, '');
  if (normalized === '::1' || normalized === '::' || normalized.startsWith('fe80:')) return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  const parts = normalized.split('.').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  return (
    parts[0] === 0 ||
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] >= 224
  );
}

async function assertPublicUrl(url: URL) {
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Only public HTTP or HTTPS website URLs can be checked.');
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error('Local websites cannot be checked.');
  }
  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('Private network addresses cannot be checked.');
  }
}

function websiteUrl(input: string) {
  const candidate = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  try {
    const url = new URL(candidate);
    if (!url.hostname.includes('.') && !isIP(url.hostname)) return undefined;
    if (/^(?:www\.)?(?:google\.[^/]+|maps\.app\.goo\.gl)$/i.test(url.hostname)) return undefined;
    url.hash = '';
    return url;
  } catch {
    return undefined;
  }
}

async function readLimitedBody(response: Response) {
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > MAX_HTML_BYTES) throw new Error('The website page is too large to check.');
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new Error('The website page is too large to check.');
    }
    chunks.push(value);
  }
  const body = new Uint8Array(length);
  let offset = 0;
  chunks.forEach((chunk) => {
    body.set(chunk, offset);
    offset += chunk.length;
  });
  return new TextDecoder().decode(body);
}

async function fetchWebsite(startUrl: URL) {
  let current = startUrl;
  for (let redirects = 0; redirects <= 4; redirects += 1) {
    await assertPublicUrl(current);
    const response = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'OpenSync-Hours-Checker/1.0 (+https://opensync.ca/hours-checker)',
      },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('The website returned an invalid redirect.');
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) throw new Error(`The website returned HTTP ${response.status}.`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      throw new Error('The address did not return a web page.');
    }
    return { html: await readLimitedBody(response), url: current };
  }
  throw new Error('The website redirected too many times.');
}

type GooglePlace = {
  displayName?: { text?: string };
  websiteUri?: string;
  googleMapsUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  currentOpeningHours?: { openNow?: boolean; weekdayDescriptions?: string[] };
};

async function findGooglePlace(query: string) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return undefined;
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey,
      'x-goog-fieldmask':
        'places.displayName,places.websiteUri,places.googleMapsUri,places.regularOpeningHours,places.currentOpeningHours',
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
  });
  if (!response.ok) throw new Error(`Google Places returned HTTP ${response.status}.`);
  const data = (await response.json()) as { places?: GooglePlace[] };
  return data.places?.[0] ?? null;
}

function googleSearchQuery(input: string) {
  try {
    const candidate = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    const url = new URL(candidate);
    if (!/(^|\.)google\.[^/]+$|^maps\.app\.goo\.gl$/i.test(url.hostname)) return input;
    const placeName = url.pathname.match(/\/maps\/place\/([^/]+)/i)?.[1];
    if (placeName) return decodeURIComponent(placeName.replace(/\+/g, ' '));
    return url.searchParams.get('q') || url.searchParams.get('query') || input;
  } catch {
    return input;
  }
}

function friendlyError(error: unknown) {
  if (error instanceof Error && error.name === 'TimeoutError')
    return 'The website took too long to respond.';
  if (error instanceof Error && error.message) return error.message;
  return 'The website could not be checked.';
}

export async function checkBusinessHours(rawInput: string): Promise<BusinessHoursCheck> {
  const input = rawInput.trim().slice(0, MAX_INPUT_LENGTH);
  if (!input) throw new Error('Enter a business name or public website URL.');

  let place: GooglePlace | null | undefined;
  let googleError: string | undefined;
  try {
    place = await findGooglePlace(googleSearchQuery(input));
  } catch (error) {
    googleError = friendlyError(error);
  }

  let url = websiteUrl(input);
  if (!url && place?.websiteUri) url = websiteUrl(place.websiteUri);
  const name = place?.displayName?.text || url?.hostname.replace(/^www\./, '') || input;
  const findings: CheckFinding[] = [];

  if (process.env.GOOGLE_PLACES_API_KEY) {
    const googleHours = place?.currentOpeningHours || place?.regularOpeningHours;
    findings.push(
      googleError
        ? {
            source: 'google',
            label: 'Google Maps',
            detail: googleError,
            status: 'Unavailable',
            tone: 'warn',
          }
        : place
          ? {
              source: 'google',
              label: 'Google Maps',
              detail: googleHours?.weekdayDescriptions?.length
                ? `${googleHours.weekdayDescriptions.length} days of hours published`
                : 'Business found, but no regular hours were returned',
              status: googleHours?.weekdayDescriptions?.length ? 'Found' : 'Review',
              tone: googleHours?.weekdayDescriptions?.length ? 'good' : 'warn',
            }
          : {
              source: 'google',
              label: 'Google Maps',
              detail: 'No matching business was found',
              status: 'Not found',
              tone: 'warn',
            },
    );
  } else {
    findings.push({
      source: 'google',
      label: 'Google Maps',
      detail: 'Google comparison is not configured; website results below are still live',
      status: 'Not checked',
      tone: 'neutral',
    });
  }

  if (!url) {
    findings.push({
      source: 'website',
      label: 'Business website',
      detail: 'Enter a website URL to scan its published hours',
      status: 'URL needed',
      tone: 'warn',
    });
    return { name, findings };
  }

  try {
    const page = await fetchWebsite(url);
    const parsed = parseWebsiteHours(page.html);
    const hoursDetail = parsed.hours.length
      ? parsed.hours.slice(0, 2).join(' · ')
      : 'No opening hours were detected on the home page';
    findings.push(
      {
        source: 'website',
        label: 'Business website',
        detail: `Checked ${page.url.hostname}`,
        status: 'Reached',
        tone: 'good',
      },
      {
        source: 'hours',
        label: 'Published website hours',
        detail: hoursDetail,
        status: parsed.hours.length ? 'Found' : 'Review',
        tone: parsed.hours.length ? 'good' : 'warn',
      },
      {
        source: 'status',
        label: 'Machine-readable hours',
        detail: parsed.hasStructuredHours
          ? 'Structured opening-hours data is available to search engines'
          : parsed.hasLiveStatus
            ? 'A live open/closed status was detected'
            : 'No structured hours or live status was detected',
        status: parsed.hasStructuredHours || parsed.hasLiveStatus ? 'Found' : 'Missing',
        tone: parsed.hasStructuredHours || parsed.hasLiveStatus ? 'good' : 'neutral',
      },
    );
    return { name: parsed.name || name, checkedUrl: page.url.href, findings };
  } catch (error) {
    findings.push({
      source: 'website',
      label: 'Business website',
      detail: friendlyError(error),
      status: 'Unavailable',
      tone: 'warn',
    });
    return { name, checkedUrl: url.href, findings };
  }
}
