// Apply the stored theme before first paint to avoid a flash of the wrong theme.
(function () {
	try {
		var theme = localStorage.getItem("reporadar-theme") || "aurora";
		var attr = ["gh-dark", "tokyo-night", "midnight", "dracula", "nord", "light"].includes(theme)
			? theme
			: null;
		var root = document.documentElement;
		if (attr) root.setAttribute("data-theme", attr);
		if (attr !== "light") root.classList.add("dark");
	} catch (_) {
		// Storage may be disabled; the default theme still renders correctly.
	}
})();
