import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			{
				test: {
					environment: "node",
					include: ["api/**/*.test.ts", "server/**/*.test.ts"],
				},
			},
			{
				test: {
					environment: "jsdom",
					include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
				},
			},
		],
	},
});
