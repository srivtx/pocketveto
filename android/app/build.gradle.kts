plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "dev.pocketveto.android"
    compileSdk = 35

    defaultConfig {
        applicationId = "dev.pocketveto.android"
        // targetSdk 34 on purpose: 35 forces edge-to-edge, and this shell's
        // single WebView has no inset handling yet. Sideload-only for now.
        targetSdk = 34
        minSdk = 26
        versionCode = 5
        versionName = "1.4.4"
    }

    buildFeatures {
        buildConfig = true
    }

    signingConfigs {
        // A sideload key, committed on purpose — see android/README.md.
        // It exists for update continuity (installs upgrade in place),
        // not for secrecy. This app is not distributed via Play Store.
        create("release") {
            storeFile = rootProject.file("keystore/pocketveto.jks")
            storePassword = "pocketveto"
            keyAlias = "pocketveto"
            keyPassword = "pocketveto"
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
