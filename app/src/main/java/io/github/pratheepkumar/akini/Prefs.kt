package io.github.pratheepkumar.akini

import android.app.ActivityManager
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

    /** Render resolution: 0 = HD (720p), 1 = Full HD (1080p), 2 = 4K (2160p). */
    var resolution: Int
        get() = sp.getInt(KEY_RESOLUTION, defaultResolution)
        set(value) = sp.edit().putInt(KEY_RESOLUTION, value).apply()

    /** Lower the frame rate to what each design needs, and back off in Battery Saver or when warm. */
    var smartBattery: Boolean
        get() = sp.getBoolean(KEY_SMART_BATTERY, true)
        set(value) = sp.edit().putBoolean(KEY_SMART_BATTERY, value).apply()

    /** Category open in the app's browser (UI state only). */
    var browseCategory: String?
        get() = sp.getString(KEY_BROWSE_CATEGORY, null)
        set(value) = sp.edit().putString(KEY_BROWSE_CATEGORY, value).apply()

    var parallax: Boolean
        get() = sp.getBoolean(KEY_PARALLAX, true)
        set(value) = sp.edit().putBoolean(KEY_PARALLAX, value).apply()

    var touch: Boolean
        get() = sp.getBoolean(KEY_TOUCH, true)
        set(value) = sp.edit().putBoolean(KEY_TOUCH, value).apply()

    /** Phones with little memory (any brand) start at HD; everything else at Full HD. */
    private val defaultResolution: Int by lazy {
        val am = appContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager?
        when {
            am == null -> 1
            am.isLowRamDevice -> 0
            else -> {
                val info = ActivityManager.MemoryInfo()
                am.getMemoryInfo(info)
                if (info.totalMem in 1 until 3_500_000_000L) 0 else 1
            }
        }
    }

    fun configFor(screen: Int): ScreenConfig {
        val p = prefix(screen)
        return ScreenConfig(
            scene = sp.getString(p + KEY_SCENE, null) ?: DEFAULT_SCENE,
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

    /** [Shuffler.OFF], [Shuffler.SAME_CATEGORY] or [Shuffler.EVERYTHING]. */
    fun shuffleMode(screen: Int): Int = sp.getInt(prefix(screen) + KEY_SHUFFLE, Shuffler.OFF)

    fun setShuffleMode(screen: Int, mode: Int) {
        // start counting from today, so the current design stays until tomorrow
        sp.edit()
            .putInt(prefix(screen) + KEY_SHUFFLE, mode)
            .putLong(prefix(screen) + KEY_SHUFFLE_DAY, Shuffler.today())
            .apply()
    }

    fun lastShuffleDay(screen: Int): Long = sp.getLong(prefix(screen) + KEY_SHUFFLE_DAY, -1L)

    fun setLastShuffleDay(screen: Int, day: Long) =
        sp.edit().putLong(prefix(screen) + KEY_SHUFFLE_DAY, day).apply()

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
            .putString(HOME_PREFIX + KEY_SCENE, sp.getString(KEY_SCENE, null) ?: DEFAULT_SCENE)
            .putInt(HOME_PREFIX + KEY_MOTION, sp.getInt(KEY_MOTION, 1))
            .putInt(HOME_PREFIX + KEY_OVERLAY, sp.getInt(KEY_OVERLAY, 1))
            .putLong(HOME_PREFIX + KEY_PHOTO_VERSION, System.currentTimeMillis())
            .putInt(HOME_PREFIX + KEY_SHUFFLE, sp.getInt(KEY_SHUFFLE, Shuffler.OFF))
            .putLong(HOME_PREFIX + KEY_SHUFFLE_DAY, sp.getLong(KEY_SHUFFLE_DAY, -1L))
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
        const val KEY_RESOLUTION = "resolution"
        const val KEY_SMART_BATTERY = "smart_battery"
        const val KEY_BROWSE_CATEGORY = "browse_category"
        const val KEY_SHUFFLE = "shuffle"
        const val KEY_SHUFFLE_DAY = "shuffle_day"
        const val DEFAULT_SCENE = "event_horizon"
        const val KEY_PARALLAX = "parallax"
        const val KEY_TOUCH = "touch"

        val FPS_OPTIONS = intArrayOf(24, 30, 60)

        /** Short side, in pixels, that each resolution setting draws at. */
        fun targetShortSide(resolution: Int): Int = when (resolution) {
            0 -> 720
            1 -> 1080
            else -> 2160
        }
    }
}
