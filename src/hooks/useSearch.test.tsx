import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSearch } from "../lib/api";
import { useSearch } from "./useSearch";

vi.mock("../lib/api", () => ({
	fetchSearch: vi.fn().mockResolvedValue({ items: [], total: 0 }),
}));

describe("useSearch", () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it("waits until search filters settle before using GitHub", async () => {
		vi.useFakeTimers();
		const client = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		const wrapper = ({ children }: { children: React.ReactNode }) => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
		const { rerender } = renderHook(
			({ q }: { q: string }) => useSearch({ q }, true),
			{ initialProps: { q: "repo" }, wrapper },
		);

		act(() => vi.advanceTimersByTime(200));
		rerender({ q: "repository" });
		act(() => vi.advanceTimersByTime(349));
		expect(fetchSearch).not.toHaveBeenCalled();

		await act(async () => {
			vi.advanceTimersByTime(1);
			await Promise.resolve();
		});
		expect(fetchSearch).toHaveBeenCalledOnce();
		client.clear();
	});
});
