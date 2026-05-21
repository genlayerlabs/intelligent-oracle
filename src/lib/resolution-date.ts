const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDateOnly(value: string): boolean {
  if (!ISO_DATE_ONLY.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function utcDateOnly(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function addUtcDays(dateString: string, days: number): string | undefined {
  if (!isIsoDateOnly(dateString)) return undefined;
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function latestIsoDateFromText(values: Array<string | null | undefined>): string | undefined {
  let latest: string | undefined;

  for (const value of values) {
    if (!value) continue;
    for (const match of value.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)) {
      const candidate = match[0];
      if (!isIsoDateOnly(candidate)) continue;
      if (!latest || candidate > latest) latest = candidate;
    }
  }

  return latest;
}

const NON_EVENT_DATE_SEGMENT =
  /\b(archive|archived|deadline|earliest|published|posting|resolution|revised|revision|settle|settled|settlement|subsequent)\b/i;

function textSegments(value: string): string[] {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function latestMarketEventIsoDateFromText(values: Array<string | null | undefined>): string | undefined {
  let latest: string | undefined;

  for (const value of values) {
    if (!value) continue;
    for (const segment of textSegments(value)) {
      if (NON_EVENT_DATE_SEGMENT.test(segment)) continue;
      const candidate = latestIsoDateFromText([segment]);
      if (candidate && (!latest || candidate > latest)) latest = candidate;
    }
  }

  return latest;
}

export function getResolutionUnlockDate({
  earliestResolutionDate,
  eventDateTexts = [],
}: {
  earliestResolutionDate?: string | null;
  eventDateTexts?: Array<string | null | undefined>;
}): string | undefined {
  const earliest = earliestResolutionDate?.trim();
  const validEarliest = earliest && isIsoDateOnly(earliest) ? earliest : undefined;
  const latestEventDate = latestIsoDateFromText(eventDateTexts);
  const eventUnlockDate = latestEventDate ? addUtcDays(latestEventDate, 1) : undefined;

  if (validEarliest && eventUnlockDate) {
    return validEarliest > eventUnlockDate ? validEarliest : eventUnlockDate;
  }

  return validEarliest ?? eventUnlockDate;
}

export function isResolutionLocked(
  earliestResolutionDate?: string | null,
  now = new Date(),
  eventDateTexts: Array<string | null | undefined> = [],
): boolean {
  const unlockDate = getResolutionUnlockDate({ earliestResolutionDate, eventDateTexts });
  if (!unlockDate) return false;
  return utcDateOnly(now) < unlockDate;
}
