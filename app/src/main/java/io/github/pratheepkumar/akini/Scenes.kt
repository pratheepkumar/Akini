package io.github.pratheepkumar.akini

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import kotlin.random.Random

data class Category(val id: String, val title: String)

/** One wallpaper design. Several designs can share a [shader] with different parameters. */
class Scene(
    val id: String,
    val title: String,
    val category: String,
    val shader: String,
    /** Frame rate the design needs to look smooth; smart battery never goes above it. */
    val fps: Int,
    val params: FloatArray,
    val color1: FloatArray,
    val color2: FloatArray,
    val color3: FloatArray,
    /** Symbol drawn into a texture for the scene (for example ॐ), or null. */
    val glyph: String?,
)

class Catalog(val categories: List<Category>, val scenes: List<Scene>) {
    fun byId(id: String?): Scene = scenes.firstOrNull { it.id == id } ?: scenes.first()
    fun inCategory(category: String): List<Scene> = scenes.filter { it.category == category }
}

/** The design list lives in assets/scenes.json so the app and the preview tools share it. */
object Scenes {
    const val PHOTO = "photo"
    const val PHOTO_CATEGORY = "photo"

    @Volatile
    private var cached: Catalog? = null

    fun catalog(context: Context): Catalog =
        cached ?: synchronized(this) {
            cached ?: load(context.applicationContext).also { cached = it }
        }

    private fun load(context: Context): Catalog {
        val text = context.assets.open("scenes.json").bufferedReader().use { it.readText() }
        val root = JSONObject(text)
        val cats = root.getJSONArray("categories")
        val categories = (0 until cats.length()).map {
            val o = cats.getJSONObject(it)
            Category(o.getString("id"), o.getString("title"))
        }
        val arr = root.getJSONArray("scenes")
        val scenes = (0 until arr.length()).map {
            val o = arr.getJSONObject(it)
            Scene(
                id = o.getString("id"),
                title = o.getString("title"),
                category = o.getString("category"),
                shader = o.getString("shader"),
                fps = o.optInt("fps", 30),
                params = floats(o.optJSONArray("p"), 4),
                color1 = floats(o.optJSONArray("c1"), 3),
                color2 = floats(o.optJSONArray("c2"), 3),
                color3 = floats(o.optJSONArray("c3"), 3),
                glyph = if (o.has("glyph")) o.getString("glyph") else null,
            )
        }
        return Catalog(categories, scenes)
    }

    private fun floats(a: JSONArray?, n: Int): FloatArray =
        FloatArray(n) { i -> if (a != null && i < a.length()) a.getDouble(i).toFloat() else 1f }
}

/** Picks a new design once a day, when the wallpaper is first seen. No background work at all. */
object Shuffler {
    const val OFF = 0
    const val SAME_CATEGORY = 1
    const val EVERYTHING = 2

    fun today(): Long = LocalDate.now().toEpochDay()

    /** Returns true when the design for [screen] was changed. */
    fun maybeShuffle(context: Context, prefs: Prefs, screen: Int): Boolean {
        val mode = prefs.shuffleMode(screen)
        if (mode == OFF) return false
        val day = today()
        if (prefs.lastShuffleDay(screen) == day) return false
        val catalog = Scenes.catalog(context)
        val current = catalog.byId(prefs.configFor(screen).scene)
        val all = catalog.scenes.filter { it.category != Scenes.PHOTO_CATEGORY && it.id != current.id }
        var pool = if (mode == SAME_CATEGORY) all.filter { it.category == current.category } else all
        if (pool.isEmpty()) pool = all
        prefs.setLastShuffleDay(screen, day)
        if (pool.isEmpty()) return false
        prefs.setScene(screen, pool[Random.nextInt(pool.size)].id)
        return true
    }
}
