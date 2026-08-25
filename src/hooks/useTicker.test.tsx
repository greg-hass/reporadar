import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTicker } from "./useTicker";

function TickProbe({ intervalMs }: { intervalMs?: number }) {
  const tick = useTicker(intervalMs);
  return <span data-testid="tick">{tick}</span>;
}

describe("useTicker", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("increments on each interval and cleans up on unmount", () => {
    const { unmount } = render(<TickProbe intervalMs={1000} />);
    expect(screen.getByTestId("tick").textContent).toBe("0");

    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByTestId("tick").textContent).toBe("1");

    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByTestId("tick").textContent).toBe("5");

    unmount();
    act(() => vi.advanceTimersByTime(10_000));
  });
});
