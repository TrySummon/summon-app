import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    appBundleId: "com.yourcompany.electron-shadcn",
    appCategoryType: "public.app-category.developer-tools",
    icon: "./assets/icon",
    // Add update server URL
    // This will be used by electron-updater to check for updates
    // Replace with your actual update server URL
    // extraMetadata: {
    //   repository: {
    //     type: "git",
    //     url: "https://github.com/yourusername/yourrepo.git"
    //   }
    // }
  },
  rebuildConfig: {},
  makers: [
    // Windows installer with auto-update support
    new MakerSquirrel({
      setupIcon: "./assets/icon.ico",
      loadingGif: "./assets/loading.gif",
      // Enable delta updates for faster downloads
      remoteReleases: "https://your-update-server.com/releases",
    }),
    // macOS ZIP
    new MakerZIP({}, ["darwin"]),
    // Linux packages
    new MakerRpm({
      options: {
        homepage: "https://yourwebsite.com",
        description: "Electron Forge with shadcn-ui (Vite + Typescript)",
      }
    }),
    new MakerDeb({
      options: {
        homepage: "https://yourwebsite.com",
        description: "Electron Forge with shadcn-ui (Vite + Typescript)",
        maintainer: "Your Name <your.email@example.com>",
        categories: ["Development"],
      }
    }),
  ],
  // Add publishers for automatic deployment
  publishers: [
    // Example S3 publisher - uncomment and configure when ready
    // Install: npm install @electron-forge/publisher-s3
    // new PublisherS3({
    //   bucket: "your-app-updates-bucket",
    //   region: "us-east-1",
    //   folder: "releases",
    //   public: true,
    // }),
    
    // You can also use GitHub releases, Snapcraft, etc.
    // See: https://www.electronforge.io/config/publishers
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
