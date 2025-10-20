import localforage from 'localforage';

export type OfflineQueueTask<TPayload = unknown> = {
  id: string;
  type: string;
  payload: TPayload;
  createdAt: number;
  attempts: number;
  metadata?: Record<string, unknown>;
};

export type OfflineQueueProcessor<TPayload = unknown> = (
  task: OfflineQueueTask<TPayload>,
) => Promise<boolean | void> | boolean | void;

export type ProcessQueueResult = {
  processed: number;
  remaining: number;
  failed: number;
};

const QUEUE_KEY = 'offlineQueue';
const isBrowser = typeof window !== 'undefined';

const storage = isBrowser
  ? localforage.createInstance({
      name: 'guestlist-offline',
      storeName: 'queue',
      description: 'Offline task queue for GuestList operations',
    })
  : null;

const memoryQueue: OfflineQueueTask[] = [];

const ensureArray = (
  maybeQueue: OfflineQueueTask[] | null,
): OfflineQueueTask[] => {
  if (!Array.isArray(maybeQueue)) {
    return [];
  }

  return maybeQueue.filter((item): item is OfflineQueueTask =>
    Boolean(item && typeof item.id === 'string' && typeof item.type === 'string'),
  );
};

const readQueue = async <TPayload = unknown>(): Promise<OfflineQueueTask<TPayload>[]> => {
  if (!storage) {
    return [...(memoryQueue as OfflineQueueTask<TPayload>[])];
  }

  const queue = await storage.getItem<OfflineQueueTask<TPayload>[]>(QUEUE_KEY);
  return ensureArray(queue);
};

const writeQueue = async <TPayload = unknown>(queue: OfflineQueueTask<TPayload>[]) => {
  if (!storage) {
    memoryQueue.splice(0, memoryQueue.length, ...queue);
    return;
  }

  await storage.setItem(QUEUE_KEY, queue);
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export const enqueueOfflineTask = async <TPayload = unknown>(
  type: string,
  payload: TPayload,
  metadata?: Record<string, unknown>,
): Promise<OfflineQueueTask<TPayload>> => {
  const queue = await readQueue<TPayload>();
  const task: OfflineQueueTask<TPayload> = {
    id: generateId(),
    type,
    payload,
    createdAt: Date.now(),
    attempts: 0,
    metadata,
  };

  queue.push(task);
  await writeQueue(queue);

  return task;
};

export const getOfflineQueue = async <TPayload = unknown>() => readQueue<TPayload>();

export const removeOfflineTask = async (taskId: string) => {
  const queue = await readQueue();
  const filtered = queue.filter((task) => task.id !== taskId);
  await writeQueue(filtered);
};

export const clearOfflineQueue = async () => {
  await writeQueue([]);
};

export const processOfflineQueue = async <TPayload = unknown>(
  processor: OfflineQueueProcessor<TPayload>,
  options?: { maxAttempts?: number },
): Promise<ProcessQueueResult> => {
  const queue = await readQueue<TPayload>();
  const remaining: OfflineQueueTask<TPayload>[] = [];
  let processedCount = 0;
  let failedCount = 0;

  for (const task of queue) {
    let shouldRetry = true;

    try {
      const result = await processor(task);
      shouldRetry = result === false;
    } catch (error) {
      console.warn('Failed to process offline task', task, error);
      shouldRetry = true;
    }

    if (!shouldRetry) {
      processedCount += 1;
      continue;
    }

    const updatedAttempts = task.attempts + 1;
    const maxAttempts = options?.maxAttempts ?? Infinity;
    if (updatedAttempts >= maxAttempts) {
      failedCount += 1;
      continue;
    }

    remaining.push({ ...task, attempts: updatedAttempts });
  }

  await writeQueue(remaining);

  return {
    processed: processedCount,
    remaining: remaining.length,
    failed: failedCount,
  };
};

export const requeueTask = async <TPayload = unknown>(task: OfflineQueueTask<TPayload>) => {
  const queue = await readQueue<TPayload>();
  const withoutTask = queue.filter((item) => item.id !== task.id);
  withoutTask.push({ ...task, attempts: task.attempts + 1 });
  await writeQueue(withoutTask);
};

export const hasPendingOfflineTasks = async () => {
  const queue = await readQueue();
  return queue.length > 0;
};
