import { defineConfig } from "wxt";
import tailwindPlugin from "@tailwindcss/vite";

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    permissions: ["storage", "tabs", "tabCapture", "activeTab", "nativeMessaging"],
  },
  vite: () => ({
    plugins: [tailwindPlugin()],
  }),
  modules: ["@wxt-dev/module-react"],
});
