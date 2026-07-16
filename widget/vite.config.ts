import { defineConfig } from "vite";

// Builds the widget as a single self-executing script (widget.js) with
// its CSS inlined, so a Squarespace Code Injection snippet can load it
// with one <script src="widget.js" defer></script> tag.
export default defineConfig({
  build: {
    cssCodeSplit: false,
    lib: {
      entry: "src/main.ts",
      name: "EvergladesLessonFinder",
      formats: ["iife"],
      fileName: () => "widget.js",
    },
    rollupOptions: {
      output: {
        // Keep the CDN artifact filenames stable and predictable.
        assetFileNames: "widget.[ext]",
      },
    },
  },
});
