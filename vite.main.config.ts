import { defineConfig, loadEnv } from "vite";
import path from "path";

// https://vitejs.dev/config
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      "process.env.SENTRY_DSN": JSON.stringify(env.SENTRY_DSN),
      "process.env.PUBLIC_SUMMON_HOST": JSON.stringify(env.PUBLIC_SUMMON_HOST),
    },
  };
});
