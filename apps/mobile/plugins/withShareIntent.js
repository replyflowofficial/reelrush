const {
  withAndroidManifest,
  withMainActivity,
  withInfoPlist,
  withEntitlementsPlist,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Adds Android Share Sheet (ACTION_SEND text/plain) intent-filter to MainActivity
 */
function withAndroidShareSheetManifest(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;
    const application = manifest.application?.[0];
    if (!application || !application.activity) {
      return modConfig;
    }

    const mainActivity = application.activity.find(
      (act) =>
        act.$?.['android:name'] === '.MainActivity' ||
        act.$?.['android:name']?.endsWith('.MainActivity')
    );

    if (!mainActivity) {
      return modConfig;
    }

    // Ensure singleTask launchMode so warm share intents trigger onNewIntent
    mainActivity.$['android:launchMode'] = 'singleTask';
    mainActivity['intent-filter'] = mainActivity['intent-filter'] || [];

    const hasSendFilter = mainActivity['intent-filter'].some((filter) =>
      filter.action?.some(
        (a) => a.$?.['android:name'] === 'android.intent.action.SEND'
      )
    );

    if (!hasSendFilter) {
      mainActivity['intent-filter'].push({
        action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
        category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
        data: [{ $: { 'android:mimeType': 'text/plain' } }],
      });
    }

    return modConfig;
  });
}

/**
 * Bridges Android ACTION_SEND (Intent.EXTRA_TEXT) into a deep link URI
 * (`reelrush://share?text=...`) inside MainActivity.kt so Expo Linking / Expo Router
 * receives shared Instagram URLs natively on both cold start and warm resume.
 */
function withAndroidMainActivityShareBridge(config, { urlScheme = 'reelrush' }) {
  return withMainActivity(config, (modConfig) => {
    if (modConfig.modResults.language !== 'kt') {
      return modConfig;
    }

    let contents = modConfig.modResults.contents;

    if (contents.includes('transformShareIntentIfNeeded')) {
      return modConfig;
    }

    // Add android.content.Intent and android.net.Uri imports if not present
    if (!contents.includes('import android.content.Intent')) {
      contents = contents.replace(
        /package\s+[\w.]+\n/,
        (match) =>
          `${match}import android.content.Intent\nimport android.net.Uri\n`
      );
    }

    const helperMethods = `
  override fun onNewIntent(intent: Intent) {
    val transformed = transformShareIntentIfNeeded(intent)
    setIntent(transformed)
    super.onNewIntent(transformed)
  }

  private fun transformShareIntentIfNeeded(intent: Intent?): Intent? {
    if (intent == null) return null
    if (Intent.ACTION_SEND == intent.action && intent.type?.startsWith("text/") == true) {
      val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
      if (!sharedText.isNullOrBlank()) {
        val encoded = Uri.encode(sharedText)
        intent.action = Intent.ACTION_VIEW
        intent.data = Uri.parse("${urlScheme}://share?text=" + encoded)
      }
    }
    return intent
  }
`;

    // Hook into onCreate before super.onCreate(null)
    if (contents.includes('super.onCreate(')) {
      contents = contents.replace(
        /super\.onCreate\([^)]*\)/,
        (match) => `intent = transformShareIntentIfNeeded(intent)\n    ${match}`
      );
    }

    // Insert helper methods before final closing brace of MainActivity
    const lastBraceIndex = contents.lastIndexOf('}');
    if (lastBraceIndex !== -1) {
      contents =
        contents.slice(0, lastBraceIndex) +
        helperMethods +
        '\n}\n';
    }

    modConfig.modResults.contents = contents;
    return modConfig;
  });
}

/**
 * Configures iOS Info.plist & Entitlements for Share Extension + App Group + URL Scheme
 */
function withIosShareExtensionConfig(
  config,
  { iosAppGroup = 'group.com.reelrush.app', urlScheme = 'reelrush' }
) {
  config = withEntitlementsPlist(config, (modConfig) => {
    const existingGroups =
      modConfig.modResults['com.apple.security.application-groups'] || [];
    if (!existingGroups.includes(iosAppGroup)) {
      existingGroups.push(iosAppGroup);
    }
    modConfig.modResults['com.apple.security.application-groups'] =
      existingGroups;
    return modConfig;
  });

  config = withInfoPlist(config, (modConfig) => {
    modConfig.modResults.AppGroup = iosAppGroup;
    const urlTypes = modConfig.modResults.CFBundleURLTypes || [];
    const hasScheme = urlTypes.some((entry) =>
      entry.CFBundleURLSchemes?.includes(urlScheme)
    );
    if (!hasScheme) {
      urlTypes.push({
        CFBundleURLName: config.ios?.bundleIdentifier || 'com.reelrush.app',
        CFBundleURLSchemes: [urlScheme],
      });
    }
    modConfig.modResults.CFBundleURLTypes = urlTypes;
    return modConfig;
  });

  // Copy native iOS Share Extension Swift controller & Info.plist into ios/ShareExtension on prebuild
  config = withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      const iosRoot = modConfig.modRequest.platformProjectRoot;
      const extDir = path.join(iosRoot, 'ReelRushShareExtension');
      await fs.promises.mkdir(extDir, { recursive: true });

      const templateDir = path.join(__dirname, 'ios-share-extension');
      const swiftSrc = path.join(templateDir, 'ShareViewController.swift');
      const plistSrc = path.join(templateDir, 'Info.plist');

      if (fs.existsSync(swiftSrc)) {
        await fs.promises.copyFile(
          swiftSrc,
          path.join(extDir, 'ShareViewController.swift')
        );
      }
      if (fs.existsSync(plistSrc)) {
        await fs.promises.copyFile(
          plistSrc,
          path.join(extDir, 'Info.plist')
        );
      }
      return modConfig;
    },
  ]);

  return config;
}

module.exports = function withShareIntent(config, options = {}) {
  const opts = {
    iosAppGroup: options.iosAppGroup || 'group.com.reelrush.app',
    urlScheme: options.urlScheme || 'reelrush',
  };

  config = withAndroidShareSheetManifest(config);
  config = withAndroidMainActivityShareBridge(config, opts);
  config = withIosShareExtensionConfig(config, opts);

  return config;
};
