import { act, fireEvent, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRovingKeys } from "./useRovingKeys";

const press = (key: string, target?: Parameters<typeof fireEvent.keyDown>[0]) =>
	act(() => {
		fireEvent.keyDown(target ?? window, { key });
	});

describe("useRovingKeys", () => {
	it("moves selection with j (down) and k (up)", () => {
		const { result } = renderHook(() => useRovingKeys(5, { onOpen: vi.fn() }));
		expect(result.current.sel).toBe(-1);

		press("j");
		expect(result.current.sel).toBe(0);
		press("j");
		press("j");
		expect(result.current.sel).toBe(2);
		press("k");
		expect(result.current.sel).toBe(1);
	});

	it("clamps selection at the ends of the list", () => {
		const { result } = renderHook(() => useRovingKeys(3, { onOpen: vi.fn() }));

		press("j");
		press("j");
		press("j");
		press("j");
		expect(result.current.sel).toBe(2); // never past the last item

		press("k");
		press("k");
		press("k");
		expect(result.current.sel).toBe(0); // never below the first
	});

	it("fires onOpen with the selected index on Enter", () => {
		const onOpen = vi.fn();
		renderHook(() => useRovingKeys(3, { onOpen }));

		press("Enter");
		expect(onOpen).not.toHaveBeenCalled(); // nothing selected yet

		press("j");
		press("j");
		press("Enter");
		expect(onOpen).toHaveBeenCalledExactlyOnceWith(1);
	});

	it("fires onExternal with the selected index on o, only when a handler exists", () => {
		const onOpen = vi.fn();
		const onExternal = vi.fn();
		type Props = { external?: ((i: number) => void) | undefined };
		const { rerender } = renderHook(
			({ external }: Props) =>
				useRovingKeys(3, { onOpen, onExternal: external }),
			{ initialProps: { external: onExternal } as Props },
		);

		press("j");
		press("j");
		press("o");
		expect(onExternal).toHaveBeenCalledExactlyOnceWith(1);

		rerender({ external: undefined });
		press("o");
		expect(onExternal).toHaveBeenCalledTimes(1); // no handler, no call, no throw
	});

	it("ignores keystrokes while typing in form fields", () => {
		const onOpen = vi.fn();
		const { result } = renderHook(() => useRovingKeys(3, { onOpen }));
		const input = document.createElement("input");
		const textarea = document.createElement("textarea");

		press("j", input);
		press("j", textarea);
		expect(result.current.sel).toBe(-1);

		press("j", window);
		expect(result.current.sel).toBe(0);
	});

	it("does nothing when the list is empty or the hook is inactive", () => {
		const onOpen = vi.fn();
		const empty = renderHook(() => useRovingKeys(0, { onOpen }));
		press("j");
		expect(empty.result.current.sel).toBe(-1);

		const inactive = renderHook(() => useRovingKeys(3, { onOpen }, false));
		press("j");
		expect(inactive.result.current.sel).toBe(-1);
	});

	it("reset() clears the selection", () => {
		const { result } = renderHook(() => useRovingKeys(3, { onOpen: vi.fn() }));
		press("j");
		expect(result.current.sel).toBe(0);

		act(() => result.current.reset());
		expect(result.current.sel).toBe(-1);
	});
});
