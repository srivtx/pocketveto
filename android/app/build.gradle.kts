plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "dev.pocketveto.android"
    compileSdk = 35

    defaultConfig {
        // v1.5.4: the applicationId changed on purpose (was
        // dev.pocketveto.android). Play Protect caches its verdict per
        // (package name + signing certificate): this app was flagged in the
        // v1.4.0/1.4.1 SMS-receiver era, and every later release re-matched
        // the SAME identity — code fixes can never clear a cached verdict.
        // New package + new signing key (see below) = a genuinely new app
        // identity with no history. The Kotlin namespace stays
        // dev.pocketveto.android so no code changes; every component check
        // in the shell already uses the runtime packageName, so a split
        // namespace/applicationId is safe here (audited v1.5.4).
        applicationId = "dev.pocketveto.app"
        // targetSdk 34 on purpose: 35 forces edge-to-edge, and this shell's
        // single WebView has no inset handling yet. Sideload-only for now.
        targetSdk = 34
        minSdk = 26
        versionCode = 10
        versionName = "1.5.4"
    }

    buildFeatures {
        buildConfig = true
    }

    signingConfigs {
        // v1.5.4: the release key is PRIVATE now and lives only in GitHub
        // Actions secrets (PV_*), decoded by the workflow at build time —
        // the previous key was committed publicly and its identity had a
        // cached Play Protect "harmful" verdict attached, so it is retired.
        // Local builds: export PV_STORE_FILE / PV_STORE_PASSWORD /
        // PV_KEY_ALIAS / PV_KEY_PASSWORD (path relative to android/) or
        // build assembleDebug. Without the envs, assembleRelease produces
        // an unsigned APK (app-release-unsigned.apk) instead of failing.
        create("release") {
            System.getenv("PV_STORE_FILE")?.let { storeFile = rootProject.file(it) }
            System.getenv("PV_STORE_PASSWORD")?.let { storePassword = it }
            System.getenv("PV_KEY_ALIAS")?.let { keyAlias = it }
            System.getenv("PV_KEY_PASSWORD")?.let { keyPassword = it }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    // WebViewAssetLoader — serves the bundled web export over a virtual
    // https origin (appassets.androidplatform.net) so IndexedDB and the
    // PWA behave like a real site, no file:// quirks.
    implementation("androidx.webkit:webkit:1.12.1")
}
