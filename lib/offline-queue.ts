import localforage from 'localforage';

export type QueueableRequest = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

interface StoredRequest {
  id: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  timestamp: number;
  retries: number;
}

export type OfflineRequestResult =
  | { status: 'queued'; error?: unknown }
  | { status: 'sent'; response: Response };

const STORAGE_KEY = 'guestlist-offline-queue';
const MAX_RETRIES = 5;

const store = localforage.createInstance({
  name: 'guestlist',
  storeName: 'offlineQueue',
});

let processing = false;
let initialized = false;

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function getQueue(): Promise<StoredRequest[]> {
  const queue = await store.getItem<StoredRequest[]>(STORAGE_KEY);
  return Array.isArray(queue) ? queue : [];
}

async function setQueue(queue: StoredRequest[]): Promise<void> {
  await store.setItem(STORAGE_KEY, queue);
}

function normalizeBody(body: unknown): string | undefined {
  if (body == null) {
    return undefined;
  }

  if (typeof body === 'string') {
    return body;
  }

  try {
    return JSON.stringify(body);
  } catch (error) {
    console.error('Failed to serialize request body for offline queue', error);
    return undefined;
  }
}

async function enqueueRequest(request: QueueableRequest): Promise<void> {
  const queue = await getQueue();
  const stored: StoredRequest = {
    id: generateId(),
    url: request.url,
    method: request.method ?? 'GET',
    headers: request.headers,
    body: normalizeBody(request.body),
    timestamp: Date.now(),
    retries: 0,
  };

  queue.push(stored);
  await setQueue(queue);

  if (typeof window !== 'undefined' && navigator.onLine) {
    void processQueue();
  }
}

export async function processQueue(): Promise<void> {
  if (processing) {
    return;
  }

  if (typeof window !== 'undefined' && !navigator.onLine) {
    return;
  }

  processing = true;

  try {
    const queue = await getQueue();

    if (queue.length === 0) {
      return;
    }

    const remaining: StoredRequest[] = [];

    for (const item of queue) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
        });

        if (!response.ok) {
          if (item.retries + 1 < MAX_RETRIES) {
            remaining.push({ ...item, retries: item.retries + 1 });
          }
          continue;
        }
      } catch (_error) {
        if (item.retries + 1 < MAX_RETRIES) {
          remaining.push({ ...item, retries: item.retries + 1 });
        }
      }
    }

    await setQueue(remaining);
  } finally {
    processing = false;
  }
}

export function initializeOfflineQueue(): void {
  if (initialized) {
    return;
  }

  initialized = true;

  if (typeof window === 'undefined') {
    return;
  }

  window.addEventListener('online', () => {
    void processQueue();
  });

  void processQueue();
}

export async function sendOfflineRequest(request: QueueableRequest): Promise<OfflineRequestResult> {
  const preparedBody = normalizeBody(request.body);

  if (typeof window === 'undefined') {
    const response = await fetch(request.url, {
      method: request.method ?? 'GET',
      headers: request.headers,
      body: preparedBody,
    });

    return { status: 'sent', response };
  }

  const attemptFetch = async () =>
    fetch(request.url, {
      method: request.method ?? 'GET',
      headers: request.headers,
      body: preparedBody,
    });

  if (navigator.onLine) {
    try {
      const response = await attemptFetch();
      return { status: 'sent', response };
    } catch (error) {
      await enqueueRequest({ ...request, body: preparedBody });
      return { status: 'queued', error };
    }
  }

  await enqueueRequest({ ...request, body: preparedBody });
  return { status: 'queued' };
}
