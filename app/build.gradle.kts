plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Values can be supplied by the CI build; blank values fall back to the defaults.
fun env(name: String, default: String): String =
    System.getenv(name)?.takeIf { it.isNotBlank() } ?: default

android {
    namespace = "io.github.pratheepkumar.akini"
    compileSdk = 35

    defaultConfig {
        applicationId = "io.github.pratheepkumar.akini"
        minSdk = 26
        targetSdk = 35
        versionCode = env("AKINI_VERSION_CODE", "1").toInt()
        versionName = env("AKINI_VERSION_NAME", "1.0.0")
    }

    signingConfigs {
        create("release") {
            // A private key can be supplied through GitHub secrets (see README).
            // Otherwise the project's published key in /signing is used.
            storeFile = file(env("AKINI_KEYSTORE", "../signing/akini-release.jks"))
            storePassword = env("AKINI_KEYSTORE_PASSWORD", "akini-open-source")
            keyAlias = env("AKINI_KEY_ALIAS", "akini")
            keyPassword = env("AKINI_KEY_PASSWORD", "akini-open-source")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
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

    // Keep the APK free of Google's encrypted dependency report.
    dependenciesInfo {
        includeInApk = false
        includeInBundle = false
    }

    lint {
        checkReleaseBuilds = false
        abortOnError = false
    }
}
