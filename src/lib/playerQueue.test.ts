import { describe, expect, it } from "vitest";
import { nextQueueIndex, previousQueueIndex, queueAfterRemoval } from "./playerQueue";

describe("player queue rules", () => {
  it("advances, loops, and stops at the expected queue boundaries", () => {
    expect(nextQueueIndex({ length: 3, currentIndex: 0, shuffle: false, repeat: "off" })).toBe(1);
    expect(nextQueueIndex({ length: 3, currentIndex: 2, shuffle: false, repeat: "all" })).toBe(0);
    expect(nextQueueIndex({ length: 3, currentIndex: 2, shuffle: false, repeat: "off" })).toBeNull();
  });

  it("selects a different item when shuffle is available", () => {
    expect(nextQueueIndex({ length: 4, currentIndex: 1, shuffle: true, repeat: "off", random: () => 0 })).toBe(2);
    expect(nextQueueIndex({ length: 4, currentIndex: 1, shuffle: true, repeat: "off", random: () => 0.99 })).toBe(0);
  });

  it("moves backward and loops when repeat-all is enabled", () => {
    expect(previousQueueIndex({ length: 3, currentIndex: 2, repeat: "off" })).toBe(1);
    expect(previousQueueIndex({ length: 3, currentIndex: 0, repeat: "all" })).toBe(2);
  });

  it("keeps the correct selection when an item is removed", () => {
    const queue = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(queueAfterRemoval(queue, 2, "a")).toEqual({ queue: [{ id: "b" }, { id: "c" }], currentIndex: 1 });
    expect(queueAfterRemoval(queue, 1, "b")).toEqual({ queue: [{ id: "a" }, { id: "c" }], currentIndex: 1 });
    expect(queueAfterRemoval([{ id: "a" }], 0, "a")).toEqual({ queue: [], currentIndex: -1 });
  });
});
