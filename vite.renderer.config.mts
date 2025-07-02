import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      tailwindcss(),
      react({
        babel: {
          plugins: [["babel-plugin-react-compiler"]],
        },
      }),
    ],
    resolve: {
      preserveSymlinks: true,
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      "process.env.VITE_PUBLIC_POSTHOG_KEY": JSON.stringify(
        env.VITE_PUBLIC_POSTHOG_KEY,
      ),
      "process.env.VITE_PUBLIC_POSTHOG_HOST": JSON.stringify(
        env.VITE_PUBLIC_POSTHOG_HOST,
      ),
      "process.env.DISABLE_ANALYTICS": JSON.stringify(env.DISABLE_ANALYTICS),
      "process.env.SENTRY_DSN": JSON.stringify(env.SENTRY_DSN),
      "process.env.PUBLIC_SUMMON_HOST": JSON.stringify(env.PUBLIC_SUMMON_HOST),
    },
  };
});
