import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useSavedSearches } from "./useSavedSearches";

const STORAGE_KEY = "reporadar-saved-searches";

afterEach(() => {
  localStorage.clear();
});

describe("useSavedSearches", () => {
  it("migrates older entries and distinguishes activity/topic filters", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: "legacy",
          label: "agents",
          q: "agent",
          language: "",
          minStars: 0,
          createdSinceDays: 7,
          sort: "best-match",
        },
      ]),
    );

    const { result } = renderHook(() => useSavedSearches());
    expect(result.current.saved[0]).toMatchObject({ topics: "", pushedSinceDays: 0 });

    act(() => {
      result.current.save({
        label: "agents",
        q: "agent",
        language: "",
        topics: "agents",
        minStars: 0,
        createdSinceDays: 7,
        pushedSinceDays: 30,
        sort: "best-match",
      });
    });

    expect(result.current.saved).toHaveLength(2);
    expect(result.current.saved[0]?.id).toContain(":agents:0:7:30:");
  });
});
