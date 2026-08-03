import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePulse } from "./usePulse";

const generatedAt = "2026-07-01T01:00:00.000Z";
const response = {
  items: [],
  since: "2026-06-30T01:00:00.000Z",
  generatedAt,
  stats: {
    reposTracked: 2,
    snapshotsToday: 2,
    starsGainedToday: 4,
    snapshotCount: 6,
    trackedSince: "2026-06-20T01:00:00.000Z",
    lastSnapshotAt: generatedAt,
  },
};

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("usePulse", () => {
  it("fetches the recent Pulse window and persists the read timestamp", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(response), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => usePulse(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current.data).toEqual(response));
    expect(result.current.hasSeen).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/pulse?"));

    act(() => result.current.markSeen());

    expect(result.current.hasSeen).toBe(true);
    expect(localStorage.getItem("reporadar-pulse-last-seen")).toBe(generatedAt);
  });
});
