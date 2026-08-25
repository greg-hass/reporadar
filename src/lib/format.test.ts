import { describe, expect, it } from "vitest";
import { minutesToNextHour, relativeTime } from "./format";

describe("minutesToNextHour", () => {
  it("returns minutes remaining until the top of the hour", () => {
    expect(minutesToNextHour(new Date("2026-08-26T10:00:00Z"))).toBe(60);
    expect(minutesToNextHour(new Date("2026-08-26T10:30:00Z"))).toBe(30);
    expect(minutesToNextHour(new Date("2026-08-26T10:59:59Z"))).toBe(1);
  });
});

describe("relativeTime", () => {
  it("formats coarse elapsed buckets", () => {
    const now = Date.now();
    expect(relativeTime(new Date(now - 5_000).toISOString())).toBe("just now");
    expect(relativeTime(new Date(now - 12 * 60_000).toISOString())).toBe("12 min ago");
    expect(relativeTime(new Date(now - 3 * 3_600_000).toISOString())).toBe("3 h ago");
    expect(relativeTime(new Date(now - 2 * 86_400_000).toISOString())).toBe("2 d ago");
  });
});
