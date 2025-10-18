import { useEffect, useState } from "react";

import { GuestListResponse, GuestRecord } from "../types/Guest";

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}

export function updateRecordInPages(
  pages: GuestListResponse[],
  nextRecord: GuestRecord,
  previousRecord: GuestRecord
): GuestListResponse[] {
  const deltaArrived =
    (nextRecord.guestCheckIn ? 1 : 0) + (nextRecord.plusOneCheckIn ? 1 : 0) -
    ((previousRecord.guestCheckIn ? 1 : 0) + (previousRecord.plusOneCheckIn ? 1 : 0));
  const deltaGifts = (nextRecord.farewellGift ? 1 : 0) - (previousRecord.farewellGift ? 1 : 0);

  return pages.map((page, index) => {
    const records = page.records.map((record) =>
      record.id === nextRecord.id ? nextRecord : record
    );

    if (index !== 0) {
      return { ...page, records };
    }

    return {
      ...page,
      records,
      metrics: {
        ...page.metrics,
        arrivedTotal: Math.max(page.metrics.arrivedTotal + deltaArrived, 0),
        giftsGiven: Math.max(page.metrics.giftsGiven + deltaGifts, 0),
      },
    };
  });
}
