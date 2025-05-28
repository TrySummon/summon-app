# Release Guide

This guide covers how to build, distribute, and manage updates for your Electron app.

## ✅ TODO

### Required for First Release
- [ ] Create app icons (`assets/icon.png`, `assets/icon.ico`, etc.)
- [ ] Update `appBundleId` in `forge.config.ts` to your actual bundle ID
- [ ] Update repository URL in `package.json` to your actual GitHub repo
- [ ] Update homepage URL in `package.json`
- [ ] Update author information in `package.json`
- [ ] Test build process on target platforms (Windows, macOS, Linux)

### Optional but Recommended
- [ ] Set up code signing certificates for production
- [ ] Create a proper app description and metadata
- [ ] Add loading animation for Windows installer (`assets/loading.gif`)
- [ ] Set up automated CI/CD for releases
- [ ] Create a changelog system
- [ ] Add crash reporting (e.g., Sentry)
- [ ] Set up analytics (if needed)

### Before Each Release
- [ ] Update version number in `package.json`
- [ ] Test all app functionality
- [ ] Test auto-update process from previous version
- [ ] Prepare release notes

## 🚀 Building for Distribution

### Build Commands

```bash
# Package the app (creates executable but no installer)
npm run package

# Create platform-specific distributables
npm run make

# Publish to configured distribution channels
npm run publish
```

### Generated Files

After running `npm run make`, you'll find distribution files in `out/make/`:

- **Windows**: `.exe` installer with Squirrel updater support
- **macOS**: `.zip` file for manual installation
- **Linux**: `.deb` and `.rpm` packages

## 📦 Distribution Setup

### 1. Website Distribution

1. Upload the generated files to your website
2. Create download links for each platform:
   ```
   https://yourwebsite.com/downloads/
   ├── YourApp-1.0.0-win32.exe
   ├── YourApp-1.0.0-darwin.zip
   ├── YourApp-1.0.0.deb
   └── YourApp-1.0.0.rpm
   ```

### 2. GitHub Releases (Recommended)

1. Update the repository URL in `package.json`:
   ```json
   "repository": {
     "type": "git",
     "url": "https://github.com/yourusername/yourrepo.git"
   }
   ```

2. Create a GitHub release:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. Upload distribution files to the GitHub release

## 🔄 Auto-Updates

### How It Works

- App checks for updates every 4 hours automatically
- Users can manually check via **Help → Check for Updates**
- Updates download in background
- Users are prompted to restart when ready

### Update Server Options

#### Option 1: GitHub Releases (Easiest)
- No additional setup required
- Auto-updater reads from GitHub releases API
- Just ensure `repository` field is set in `package.json`

#### Option 2: Custom Server
Uncomment and configure in `src/helpers/auto-updater.ts`:
```typescript
autoUpdater.setFeedURL({
  provider: "generic",
  url: "https://your-update-server.com/releases"
});
```

Required server file structure:
```
your-server.com/releases/
├── latest.yml (or latest-mac.yml)
├── YourApp-1.0.1.exe
├── YourApp-1.0.1.zip
└── RELEASES (for Windows Squirrel)
```

## 📋 Release Checklist

### Before Release

- [ ] Update version in `package.json`
- [ ] Test the app thoroughly
- [ ] Update `CHANGELOG.md` (if you have one)
- [ ] Ensure all dependencies are up to date

### Building Release

- [ ] Run `npm run make` on each target platform
- [ ] Test the generated installers
- [ ] Verify app icons and metadata

### Publishing

- [ ] Upload files to distribution channel
- [ ] Create release notes
- [ ] Test auto-update from previous version
- [ ] Announce the release

## 🔧 Configuration

### App Metadata

Update these in `forge.config.ts`:
```typescript
packagerConfig: {
  appBundleId: "com.yourcompany.yourapp",
  icon: "./assets/icon",
  // Add your actual URLs and info
}
```

### Code Signing (Production)

For production releases, add code signing:

**macOS:**
```typescript
osxSign: {
  identity: "Developer ID Application: Your Name"
},
osxNotarize: {
  tool: 'notarytool',
  appleId: process.env.APPLE_ID,
  appleIdPassword: process.env.APPLE_PASSWORD,
  teamId: process.env.APPLE_TEAM_ID,
}
```

**Windows:**
```typescript
// In MakerSquirrel options
certificateFile: "path/to/certificate.p12",
certificatePassword: process.env.CERTIFICATE_PASSWORD,
```

## 🧪 Testing Updates

1. Build and distribute version 1.0.0
2. Install the app
3. Increment version to 1.0.1 in `package.json`
4. Build and publish version 1.0.1
5. Open the installed app - it should detect and offer the update

## 📝 Version Management

### Semantic Versioning
- **Major** (1.0.0): Breaking changes
- **Minor** (1.1.0): New features, backward compatible
- **Patch** (1.0.1): Bug fixes, backward compatible

### Update Frequency
- **Critical security fixes**: Immediate
- **Bug fixes**: Weekly/bi-weekly
- **New features**: Monthly/quarterly

## 🔍 Troubleshooting

### Common Issues

1. **Updates not detected**: Check repository URL in `package.json`
2. **Download fails**: Verify server CORS settings
3. **Install fails**: Check code signing certificates
4. **App won't start**: Verify all dependencies are bundled

### Debug Mode

Set environment variable to see update logs:
```bash
DEBUG=electron-updater npm start
```

## 📚 Additional Resources

- [Electron Forge Documentation](https://www.electronforge.io/)
- [electron-updater Documentation](https://www.electron.build/auto-update)
- [Code Signing Guide](https://www.electronjs.org/docs/tutorial/code-signing) 