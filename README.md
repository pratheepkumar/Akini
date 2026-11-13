# Akini

Hi-tech live wallpapers for Android, plus a mode that animates your own photos.
Open source. **No ads, no trackers, no permissions, and no internet access.**

![Built-in scenes](docs/scenes.jpg)

## Features

- **66 live designs in five categories**, all drawn in real time on the GPU (no video files, no downloads):
  - **Cosmic (15):** Event Horizon, Nebula Drift, Star Nursery, Milky Way, Spiral Galaxy, Andromeda, Barred Spiral,
    Galaxy Merger, Constellations, Saturn Rise, Blue Planet, Supernova, Pulsar, Wormhole, Aurora Night
  - **Modern (13):** Liquid Chrome, Neon Grid, Holo Core, Data Stream, Code Rain, Cyber Rain, Circuit Board,
    Hex Shield, Synthwave, Warp Speed, Flow Lines, Laser Show, Neon Tunnel
  - **Abstract (14):** Colour Splash, Acrylic Pour, Ripple, Gold Marble, White Marble, Gradient Blobs, Voronoi Glass,
    Op Art, Kaleidoscope, Silk, Lava Lamp, Contours, Bokeh, Fractal Bloom
  - **Vintage (10):** Classic Car, Giza Sunset, Paris 1889, Agra Dawn, Steam Express, Lighthouse, Vinyl Record,
    Art Deco, Silent Film, Roman Ruins
  - **Religious (14):** Om, Diya Lights, Lotus Bloom, Sri Yantra, Rangoli, Temple Gopuram, Stained Glass, Holy Cross,
    Candlelight, Star of Bethlehem, Dharma Wheel, Bodhi Leaf, Lantern Festival, Zen Garden
- **My Photo**: animate your own picture. Motion: Still, Drift, Tilt. Effects: Particles, Holo sweep, Glitch,
  Edge scan, Vintage film.
- **Daily shuffle**: a new design each day, from the same category or from everything. Checked when the
  wallpaper is shown, with no alarms or background work.
- **Resolution**: HD, Full HD (default) or 4K (supersampled for extra-fine detail).
- **Smart battery** (on by default): each design runs only at the frame rate it needs (16 fps for film-style
  designs, up to 30 for fast ones). It drops to 15 fps and HD in Battery Saver or when the phone is warm.
  A still photo is drawn once and then uses no power. Everything pauses when the wallpaper isn't visible.
- **Different home and lock screen** wallpapers. Samsung runs one live wallpaper on both screens, so Akini
  switches pictures when you unlock.
- Tilt parallax, touch ripples.

![Built-in scenes](docs/scenes.jpg)

## Install

1. On your phone, open the [latest release](../../releases/latest) and download **Akini.apk**.
2. Open the file. If Android asks, allow your browser or file manager to **install unknown apps**.
3. Open Akini, pick a scene, then tap **SET AS WALLPAPER**.
4. On the preview screen, tap **Set wallpaper** and choose **Home and lock screens**.

Changing scenes or settings in the app afterwards updates the wallpaper instantly. There's no need to apply it again.

## Privacy

The app declares no permissions at all. Without the internet permission, it physically cannot load ads or send data anywhere.
Photos are picked with the system photo picker, and a downscaled copy is stored privately inside the app.

## How it's built

- Kotlin, using only Android framework APIs. No third-party libraries.
- Scenes are GLSL ES 1.00 fragment shaders in `app/src/main/assets/shaders/`. They share helpers from `common.glsl`.
- `AkiniWallpaperService` hosts a `GLSurfaceView` on the wallpaper surface. `SceneRenderer` draws the selected
  scene, optionally at reduced resolution through an offscreen buffer.
- Every push to `main` builds a signed release APK with GitHub Actions and publishes it as a GitHub release.

### Build locally

```
./gradlew assembleRelease
```

Requires JDK 17 and the Android SDK (API 35).

### Adding a scene

1. Add `your_scene.frag` to `app/src/main/assets/shaders/`. Uniforms available: `uRes`, `uTime`, `uTilt`, `uTouch`,
   plus per-design `uP` (vec4) and `uC1`–`uC3` (colours). End with `gl_FragColor = vec4(finish(tonemap(col)), 1.0);`.
2. Add an entry to `app/src/main/assets/scenes.json` (id, title, category, shader, fps, parameters, colours)
   and a thumbnail at `app/src/main/assets/thumbs/<id>.jpg`.

## Signing

Release APKs are signed with the key in `signing/`. Its password is public, so anyone can build an APK that installs as an update to yours.
For personal use that's fine, as long as you only install APKs from your own Releases page.
To use a private key instead, add these repository secrets: `AKINI_KEYSTORE_BASE64` (the keystore, base64 encoded), `AKINI_KEYSTORE_PASSWORD`, `AKINI_KEY_ALIAS`, `AKINI_KEY_PASSWORD`.
Switching keys means uninstalling the old version once.

## License

MIT
