package io.github.pratheepkumar.akini

import android.content.Context
import android.content.SharedPreferences
import java.io.File

/** All user settings. The wallpaper and the app run in one process and share these. */
class Prefs(context: Context) {

    val sp: SharedPreferences =
        context.applicationContext.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    var scene: String
        get() = sp.getString(KEY_SCENE, null) ?: Scenes.all.first().id
        set(value) = sp.edit().putString(KEY_SCENE, value).apply()

    /** 0 = still, 1 = drift, 2 = tilt parallax */
    var motion: Int
        get() = sp.getInt(KEY_MOTION, 1)
        set(value) = sp.edit().putInt(KEY_MOTION, value).apply()

    /** 0 = none, 1 = particles, 2 = holo sweep, 3 = glitch, 4 = edge scan */
    var overlay: Int
        get() = sp.getInt(KEY_OVERLAY, 1)
        set(value) = sp.edit().putInt(KEY_OVERLAY, value).apply()

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

    /** Changes whenever a new photo is imported, so the renderer knows to reload it. */
    var photoVersion: Long
        get() = sp.getLong(KEY_PHOTO_VERSION, 0L)
        set(value) = sp.edit().putLong(KEY_PHOTO_VERSION, value).apply()

    companion object {
        const val FILE = "akini"
        const val KEY_SCENE = "scene"
        const val KEY_MOTION = "motion"
        const val KEY_OVERLAY = "overlay"
        const val KEY_FPS = "fps"
        const val KEY_QUALITY = "quality"
        const val KEY_PARALLAX = "parallax"
        const val KEY_TOUCH = "touch"
        const val KEY_PHOTO_VERSION = "photo_version"

        val FPS_OPTIONS = intArrayOf(24, 30, 60)

        /** Fraction of the screen resolution the scene is drawn at before being scaled up. */
        fun renderScale(quality: Int): Float = when (quality) {
            0 -> 0.5f
            1 -> 0.75f
            else -> 1f
        }

        fun photoFile(context: Context): File = File(context.filesDir, "photo.jpg")
    }
}
