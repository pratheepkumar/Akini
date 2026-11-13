package io.github.pratheepkumar.akini

import android.content.Context
import android.content.SharedPreferences
import java.io.File

/** Which screen a wallpaper setting applies to. */
object Screen {
    const val LOCK = 0
    const val HOME = 1
}

/** Everything needed to draw one screen's wallpaper. */
data class ScreenConfig(
    val scene: String,
    val motion: Int,
    val overlay: Int,
    val photoVersion: Long,
    val photoFile: File,
)

/**
 * All user settings. The wallpaper and the app run in one process and share these.
 *
 * When [separate] is off, both screens use the base keys. When it is on, the lock screen
 * keeps the base keys and the home screen uses keys prefixed with "home_".
 */
class Prefs(context: Context) {

    private val appContext: Context = context.applicationContext
    val sp: SharedPreferences = appContext.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    /** Different wallpapers on the lock and home screens. */
    var separate: Boolean
        get() = sp.getBoolean(KEY_SEPARATE, false)
        set(value) {
            if (value && !sp.contains(HOME_PREFIX + KEY_SCENE)) copyLockToHome()
            sp.edit().putBoolean(KEY_SEPARATE, value).apply()
        }

    /** Which screen the app is currently editing (only matters when [separate] is on). */
    var editing: Int
        get() = sp.getInt(KEY_EDITING, Screen.LOCK)
        set(value) = sp.edit().putInt(KEY_EDITING, value).apply()

    /** The screen whose settings the app's controls change right now. */
    val editTarget: Int
        get() = if (separate) editing else Screen.LOCK

    var fps: Int
        get() = sp.getInt(KEY_FPS, 30)
        set(value) = sp.edit().putInt(KEY_FPS, value).apply()

    /** 0 = battery saver, 1 = balanced, 2 = maximum */
    var quality: Int
        get() = sp.getInt(KEY_QUALITY, 1)
        set(value) = sp.edit().putInt(KEY_QUALITY, value).apply()

    var parallax: Boolean
        get() = sp.getBoolean(KEY_PARALLAX, true)
        set(value) = sp.edit().putBoolean(KEY_PARALLAX, value).apply()

    var touch: Boolean
        get() = sp.getBoolean(KEY_TOUCH, true)
        set(value) = sp.edit().putBoolean(KEY_TOUCH, value).apply()

    fun configFor(screen: Int): ScreenConfig {
        val p = prefix(screen)
        return ScreenConfig(
            scene = sp.getString(p + KEY_SCENE, null) ?: Scenes.all.first().id,
            motion = sp.getInt(p + KEY_MOTION, 1),
            overlay = sp.getInt(p + KEY_OVERLAY, 1),
            photoVersion = sp.getLong(p + KEY_PHOTO_VERSION, 0L),
            photoFile = photoFileFor(screen),
        )
    }

    fun setScene(screen: Int, id: String) = sp.edit().putString(prefix(screen) + KEY_SCENE, id).apply()

    /** 0 = still, 1 = drift, 2 = tilt parallax */
    fun setMotion(screen: Int, value: Int) = sp.edit().putInt(prefix(screen) + KEY_MOTION, value).apply()

    /** 0 = none, 1 = particles, 2 = holo sweep, 3 = glitch, 4 = edge scan */
    fun setOverlay(screen: Int, value: Int) = sp.edit().putInt(prefix(screen) + KEY_OVERLAY, value).apply()

    /** Marks a newly imported photo and switches that screen to "My Photo". */
    fun photoImported(screen: Int) {
        val p = prefix(screen)
        sp.edit()
            .putLong(p + KEY_PHOTO_VERSION, System.currentTimeMillis())
            .putString(p + KEY_SCENE, Scenes.PHOTO)
            .apply()
    }

    fun photoFileFor(screen: Int): File =
        File(appContext.filesDir, if (separate && screen == Screen.HOME) "photo_home.jpg" else "photo.jpg")

    private fun prefix(screen: Int): String =
        if (separate && screen == Screen.HOME) HOME_PREFIX else ""

    /** First time the screens are split, the home screen starts as a copy of the current wallpaper. */
    private fun copyLockToHome() {
        val lockPhoto = File(appContext.filesDir, "photo.jpg")
        val homePhoto = File(appContext.filesDir, "photo_home.jpg")
        try {
            if (lockPhoto.exists()) lockPhoto.copyTo(homePhoto, overwrite = true)
        } catch (e: Exception) {
            // The home screen simply starts without a photo.
        }
        sp.edit()
            .putString(HOME_PREFIX + KEY_SCENE, sp.getString(KEY_SCENE, null) ?: Scenes.all.first().id)
            .putInt(HOME_PREFIX + KEY_MOTION, sp.getInt(KEY_MOTION, 1))
            .putInt(HOME_PREFIX + KEY_OVERLAY, sp.getInt(KEY_OVERLAY, 1))
            .putLong(HOME_PREFIX + KEY_PHOTO_VERSION, System.currentTimeMillis())
            .apply()
    }

    companion object {
        const val FILE = "akini"
        const val HOME_PREFIX = "home_"
        const val KEY_SCENE = "scene"
        const val KEY_MOTION = "motion"
        const val KEY_OVERLAY = "overlay"
        const val KEY_PHOTO_VERSION = "photo_version"
        const val KEY_SEPARATE = "separate"
        const val KEY_EDITING = "editing"
        const val KEY_FPS = "fps"
        const val KEY_QUALITY = "quality"
        const val KEY_PARALLAX = "parallax"
        const val KEY_TOUCH = "touch"

        val FPS_OPTIONS = intArrayOf(24, 30, 60)

        /** Fraction of the screen resolution the scene is drawn at before being scaled up. */
        fun renderScale(quality: Int): Float = when (quality) {
            0 -> 0.5f
            1 -> 0.75f
            else -> 1f
        }
    }
}
