import { defineConfig } from "astro/config";
import github from "@astrojs/github";

export default defineConfig({
  site: "https://dhu2022-dev.github.io",
  adapter: github(),
});
