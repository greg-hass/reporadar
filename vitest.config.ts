import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		environmentMatchGlobs: [
			// Frontend tests exercise React hooks/components, so they need a DOM.
			["src/**", "jsdom"],
		],
		include: [
			"api/**/*.test.ts",
			"server/**/*.test.ts",
			"src/**/*.test.ts",
			"src/**/*.test.tsx",
		],
	},
});
