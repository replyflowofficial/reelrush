# ReelRush

**Fast. Clean. No Ads.**

ReelRush is a production-quality, 100% ad-free Instagram public video and Reel downloader built with **React Native**, **Expo**, **TypeScript**, **Expo Router**, **NativeWind (Tailwind CSS)**, **Lucide Icons**, and a lightweight **Node.js + Express + yt-dlp** processing backend.

---

## Architecture Overview

```text
/reelrush
├── packages/
│   └── shared/                 # Shared Zod schemas, URL normalizer, SSRF guards & TypeScript types
├── apps/
│   ├── server/                 # Node.js + Express + TypeScript temporary yt-dlp processing API
│   │   └── src/
│   │       ├── controllers/    # Express request handlers & file streaming
│   │       ├── routes/         # API route definitions (/api/download, /api/download/:id)
│   │       ├── services/       # Isolated ytDlpService (spawn/execFile, progress, TTL cleanup)
│   │       ├── utils/          # Rate limiter, config, path-confined temporary file sweeper
│   │       └── server.ts       # Express server entrypoint
│   └── mobile/                 # Expo + React Native + Expo Router + NativeWind v4 mobile app
│       ├── app/                # Expo Router screens (/, /download, /history, /settings)
│       ├── plugins/            # Custom Expo Config Plugin for Android & iOS Share Sheet
│       └── src/
│           ├── components/     # Reusable Reanimated & NativeWind UI components
│           ├── context/        # Theme, Settings & local AsyncStorage History state
│           ├── hooks/          # Event-driven clipboard detection & native share-intent listener
│           └── services/       # API client, MediaLibrary downloader & AsyncStorage persistence
└── .env.example                # Environment configuration template
```

---

## 1. Requirements

- **Operating System:** Windows, macOS, or Linux
- **Node.js:** `v20.0.0` or newer (tested on `v20 LTS` / `v22` / `v24`)
- **npm:** `v10+` (uses npm workspaces)
- **Python 3.9+** or standalone **yt-dlp** binary
- **FFmpeg** (recommended for merging separate high-definition video/audio streams when needed)
- **Android Studio** (for Android Emulator / native prebuild) or **Xcode** (for iOS Simulator / Share Extension build on macOS)

---

## 2. Node Version

Use Node.js `>= 20.0.0`:

```bash
node -v
# v20.x or v22.x or v24.x
```

---

## 3. Expo & Monorepo Setup

From the repository root (`/reelrush`), install all workspace dependencies and build the shared validation package:

```bash
npm install
npm run build:shared
```

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

---

## 4. yt-dlp Installation

The backend's [`ytDlpService.ts`](file:///c:/zaker/reelrush/apps/server/src/services/ytDlpService.ts) automatically detects `yt-dlp` via `YTDLP_PATH`, system `PATH`, or `python -m yt_dlp`.

### Install via Python `pip` (Cross-Platform)
```bash
python -m pip install -U yt-dlp
```

### Or Install Standalone Binary
- **macOS (Homebrew):**
  ```bash
  brew install yt-dlp
  ```
- **Windows (Winget):**
  ```bash
  winget install yt-dlp.yt-dlp
  ```
- **Linux:**
  ```bash
  sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
  sudo chmod a+rx /usr/local/bin/yt-dlp
  ```

Verify availability:
```bash
yt-dlp --version
# or
python -m yt_dlp --version
```

---

## 5. FFmpeg Installation

While Instagram Reels often provide pre-merged progressive MP4 streams (`best[ext=mp4]`), having `ffmpeg` installed allows `yt-dlp` to merge separate DASH video + audio tracks (`bestvideo[ext=mp4]+bestaudio[ext=m4a]`) into a single MP4 container when progressive streams are lower resolution.

- **macOS:** `brew install ffmpeg`
- **Windows:** `winget install Gyan.FFmpeg`
- **Ubuntu/Debian:** `sudo apt update && sudo apt install -y ffmpeg`

---

## 6. Starting the Backend

Start the Express + `yt-dlp` backend in development mode (default port `4000`):

```bash
npm run dev:server
```

Verify the server and `yt-dlp` integration:
```bash
curl http://localhost:4000/api/health
```

---

## 7. Starting the Expo Mobile App

In a second terminal, start the Expo development server:

```bash
npm run dev:mobile
```

---

## 8. Android Development

### Using Android Emulator (AVD)
Android emulators map the host computer's `localhost` to `10.0.2.2`.
In `.env` (or `apps/mobile/.env`):
```env
BACKEND_URL=http://10.0.2.2:4000
EXPO_PUBLIC_BACKEND_URL=http://10.0.2.2:4000
```

Run on Android:
```bash
npm run android
```

### Using a Physical Android Device
Find your development machine's local Wi-Fi LAN IP (e.g., `192.168.1.45` via `ipconfig` on Windows or `ipconfig getifaddr en0` on macOS) and set:
```env
BACKEND_URL=http://192.168.1.45:4000
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.45:4000
```
Ensure both your computer and phone are on the same Wi-Fi network and port `4000` is allowed through your local firewall.

---

## 9. iOS Development

### iOS Simulator (macOS)
The iOS Simulator shares `localhost` with your Mac:
```env
BACKEND_URL=http://localhost:4000
EXPO_PUBLIC_BACKEND_URL=http://localhost:4000
```

Run on iOS Simulator:
```bash
npm run ios
```

### Physical iPhone
Set `EXPO_PUBLIC_BACKEND_URL=http://<YOUR_MAC_LAN_IP>:4000` in `.env`.

---

## 10. Native Share Intent Setup (Instagram → Share → ReelRush)

Standard Expo Go runs inside a generic host container and cannot register ReelRush in the OS Share Sheet. To enable native **Instagram → Share → ReelRush** integration, ReelRush includes a custom Expo Config Plugin ([`apps/mobile/plugins/withShareIntent.js`](file:///c:/zaker/reelrush/apps/mobile/plugins/withShareIntent.js)).

### Generate Native Android & iOS Directories
```bash
cd apps/mobile
npx expo prebuild --clean
```

### How It Works on Android
1. `withShareIntent.js` registers an `android.intent.action.SEND` (`text/plain`) `<intent-filter>` and `android:launchMode="singleTask"` on `.MainActivity` in `AndroidManifest.xml`.
2. It injects `transformShareIntentIfNeeded` into `MainActivity.kt` (`onCreate` and `onNewIntent`) to convert incoming `Intent.EXTRA_TEXT` payloads from Instagram into `reelrush://share?text=<encoded>`.
3. `useShareIntentListener()` in the app extracts and normalizes the Instagram URL and opens `/download` automatically.
4. Build and install the native Android dev client:
   ```bash
   npx expo run:android
   ```

### How It Works on iOS
1. `withShareIntent.js` configures the `reelrush://` URL scheme and `group.com.reelrush.app` App Group entitlement in `Info.plist` and `Entitlements.plist`.
2. It scaffolds the native Swift Share Extension (`ios/ReelRushShareExtension/ShareViewController.swift` and `Info.plist`) supporting `NSExtensionActivationSupportsWebURLWithMaxCount = 1` and `NSExtensionActivationSupportsText = true`.
3. In Xcode, ensure the `ReelRushShareExtension` target is signed with the same team and `group.com.reelrush.app` App Group capability, then run:
   ```bash
   npx expo run:ios
   ```

---

## 11. Production Build

### Backend Server
```bash
npm run build:shared
npm run build:server
NODE_ENV=production npm run start:server
```

### Mobile App (EAS Build)
```bash
cd apps/mobile
npx eas build --platform android --profile production
npx eas build --platform ios --profile production
```

---

## 12. Security & Legal Considerations

- **Zero Command Injection:** `ytDlpService.ts` strictly executes `yt-dlp` using `child_process.spawn` and `child_process.execFile` with argument arrays and `shell: false`. User input is never interpolated into shell strings, and `--` is passed before the normalized URL argument.
- **SSRF Prevention:** Both client and server validate URLs using `@reelrush/shared`. Only `instagram.com` and `www.instagram.com` over `http`/`https` with valid `/reel/`, `/p/`, or `/tv/` shortcodes are accepted. Private/loopback IPs, custom ports, and embedded credentials are rejected.
- **Resource & DoS Protection:**
  - Sliding-window IP rate limiting (`RATE_LIMIT_MAX_REQUESTS`)
  - Concurrent `yt-dlp` process cap (`MAX_CONCURRENT_DOWNLOADS`)
  - Hard child-process execution timeout (`DOWNLOAD_TIMEOUT_MS`) with `SIGKILL` termination
  - Maximum file size enforcement (`--max-filesize` + post-download byte verification)
- **Zero Permanent Cloud Storage:** Videos are written to isolated per-job folders in the OS temporary directory, streamed directly to the user's device, and deleted automatically upon download completion or TTL expiration (`TEMP_FILE_TTL_MS`).
- **Authorized Public Content Only:** ReelRush only processes publicly accessible Instagram links without credentials, cookies, private-account bypass, or DRM circumvention.
