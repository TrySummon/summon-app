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
      // TODO: enable this when we open source
      // remoteReleases: "https://github.com/AgentPort-Labs/toolman",
    }),
    new MakerDMG({}),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  publishers: [
    new PublisherGithub({
      repository: {
        owner: "AgentPort-Labs",
        name: "toolman",
      },
      // This will be the default if ELECTRON_FORGE_PUBLISH_PRERELEASE is not set.
      // In CI, the environment variable will override this.
      prerelease: false,
      // Since the CI trigger is on a 'published' release, the release is not a draft.
      // Setting this to false aligns with that. If Forge were creating the release,
      // this would determine if it's created as a draft.
      draft: false,
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
