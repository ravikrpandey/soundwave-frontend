export type RepeatMode = "off" | "all" | "one";

export function nextQueueIndex({
  length,
  currentIndex,
  shuffle,
  repeat,
  random = Math.random,
}: {
  length: number;
  currentIndex: number;
  shuffle: boolean;
  repeat: RepeatMode;
  random?: () => number;
}) {
  if (!length) return null;
  if (shuffle && length > 1) {
    const offset = 1 + Math.floor(random() * (length - 1));
    return (Math.max(currentIndex, 0) + offset) % length;
  }
  const next = currentIndex + 1;
  if (next < length) return next;
  return repeat === "all" ? 0 : null;
}

export function previousQueueIndex({ length, currentIndex, repeat }: { length: number; currentIndex: number; repeat: RepeatMode }) {
  if (!length) return null;
  if (currentIndex > 0) return currentIndex - 1;
  return repeat === "all" ? length - 1 : Math.max(currentIndex, 0);
}

export function queueAfterRemoval<T extends { id: string }>(queue: T[], currentIndex: number, trackId: string) {
  const removeIndex = queue.findIndex(track => track.id === trackId);
  if (removeIndex < 0) return { queue, currentIndex };
  const nextQueue = queue.filter((_, index) => index !== removeIndex);
  if (!nextQueue.length) return { queue: nextQueue, currentIndex: -1 };
  if (removeIndex < currentIndex) return { queue: nextQueue, currentIndex: currentIndex - 1 };
  if (removeIndex === currentIndex) return { queue: nextQueue, currentIndex: Math.min(removeIndex, nextQueue.length - 1) };
  return { queue: nextQueue, currentIndex };
}
