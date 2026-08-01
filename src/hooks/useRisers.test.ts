import { describe, expect, it } from "vitest";
import { getNextRisersPage } from "./useRisers";

const page = (count: number, total: number) => ({
  items: Array.from({ length: count }, () => ({}) as never),
  total,
});

describe("getNextRisersPage", () => {
  it("continues when a short first page still has more results", () => {
    expect(getNextRisersPage(page(8, 38), [page(8, 38)])).toBe(2);
  });

  it("stops after the reported total has been loaded", () => {
    expect(getNextRisersPage(page(30, 38), [page(8, 38), page(30, 38)])).toBeUndefined();
  });
});
