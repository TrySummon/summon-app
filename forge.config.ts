import { config as dotenvConfig } from "dotenv";
dotenvConfig();
import type { ForgeConfig } from "@electron-forge/shared-types";
import { PublisherGithub } from "@electron-forge/publisher-github";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    appBundleId: "com.trysummon.summon-app",
    appCategoryType: "public.app-category.developer-tools",
    extraResource: ["app-update.yml"],
    icon: "images/icon",
    osxSign: {},
    osxNotarize: {
      appleApiKey: process.env.APPLE_API_KEY_PATH!,
      appleApiKeyId: process.env.APPLE_API_KEY_ID!,
      appleApiIssuer: process.env.APPLE_API_ISSUER!,
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      remoteReleases: "https://github.com/TrySummon/summon-app",
      iconUrl: "./images/icon.ico",
      setupIcon: "./images/icon.ico",
    }),
    new MakerDMG({
      icon: "./images/icon.icns",
      background: undefined,
    }),
    new MakerRpm({
      options: {
        icon: "./images/icon.png",
      },
    }),
    new MakerDeb({
      options: {
        icon: "./images/icon.png",
      },
    }),
  ],
  publishers: [
    new PublisherGithub({
      repository: {
        owner: "TrySummon",
        name: "summon-app",
      },
      draft: false,
      prerelease: false,
    }),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.mts",
        },
      ],
    }),

    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
