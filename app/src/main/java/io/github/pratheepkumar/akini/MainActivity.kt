package io.github.pratheepkumar.akini

import android.app.Activity
import android.app.WallpaperManager
import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Typeface
import android.net.Uri
import android.opengl.GLSurfaceView
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.text.TextUtils
import android.util.Log
import android.util.LruCache
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowInsets
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import java.util.concurrent.Executors

/** Design browser with a full-screen live preview and the "Set as wallpaper" button. */
class MainActivity : Activity(), SharedPreferences.OnSharedPreferenceChangeListener {

    private lateinit var prefs: Prefs
    private lateinit var catalog: Catalog
    private lateinit var renderer: SceneRenderer
    private lateinit var preview: GLSurfaceView
    private lateinit var tilt: TiltSensor

    private lateinit var sceneTitle: TextView
    private lateinit var sceneTagline: TextView
    private lateinit var screensRow: LinearLayout
    private lateinit var editingSection: LinearLayout
    private lateinit var editingRow: LinearLayout
    private lateinit var categoryRow: LinearLayout
    private lateinit var thumbScroll: HorizontalScrollView
    private lateinit var thumbRow: LinearLayout
    private lateinit var shuffleRow: LinearLayout
    private lateinit var photoSection: LinearLayout
    private lateinit var motionRow: LinearLayout
    private lateinit var effectRow: LinearLayout
    private lateinit var settingsSection: LinearLayout
    private lateinit var settingsToggle: TextView
    private lateinit var fpsRow: LinearLayout
    private lateinit var resolutionRow: LinearLayout
    private lateinit var resolutionNote: TextView
    private lateinit var toggleRow: LinearLayout
    private lateinit var statusText: TextView

    /** Thumbnails are small; keep up to ~8 MB of them so browsing stays smooth. */
    private val thumbCache = object : LruCache<String, Bitmap>(8 * 1024 * 1024) {
        override fun sizeOf(key: String, value: Bitmap): Int = value.byteCount
    }
    private val loader = Executors.newSingleThreadExecutor()
    private var shownCategory: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        prefs = Prefs(this)
        catalog = Scenes.catalog(this)
        renderer = SceneRenderer(this)

        preview = findViewById(R.id.preview)
        preview.setEGLContextClientVersion(2)
        preview.preserveEGLContextOnPause = true
        preview.setRenderer(renderer)
        preview.setOnTouchListener { v, e ->
            if (e.actionMasked == MotionEvent.ACTION_DOWN && prefs.touch && v.width > 0 && v.height > 0) {
                renderer.onTouch(e.x / v.width, e.y / v.height)
            }
            true
        }
        tilt = TiltSensor(this) { x, y -> renderer.setTilt(x, y) }

        sceneTitle = findViewById(R.id.scene_title)
        sceneTagline = findViewById(R.id.scene_tagline)
        screensRow = findViewById(R.id.screens_row)
        editingSection = findViewById(R.id.editing_section)
        editingRow = findViewById(R.id.editing_row)
        categoryRow = findViewById(R.id.category_row)
        thumbScroll = findViewById(R.id.thumb_scroll)
        thumbRow = findViewById(R.id.thumb_row)
        shuffleRow = findViewById(R.id.shuffle_row)
        photoSection = findViewById(R.id.photo_section)
        motionRow = findViewById(R.id.motion_row)
        effectRow = findViewById(R.id.effect_row)
        settingsSection = findViewById(R.id.settings_section)
        settingsToggle = findViewById(R.id.settings_toggle)
        fpsRow = findViewById(R.id.fps_row)
        resolutionRow = findViewById(R.id.resolution_row)
        resolutionNote = findViewById(R.id.resolution_note)
        toggleRow = findViewById(R.id.toggle_row)
        statusText = findViewById(R.id.status_text)

        settingsToggle.setOnClickListener {
            val show = settingsSection.visibility != View.VISIBLE
            settingsSection.visibility = if (show) View.VISIBLE else View.GONE
            settingsToggle.setText(if (show) R.string.settings_hide else R.string.settings_show)
        }
        findViewById<View>(R.id.apply_button).setOnClickListener { applyWallpaper() }
        findViewById<View>(R.id.choose_photo).setOnClickListener { pickPhoto() }

        handleInsets()
        buildRows()
        refresh()
    }

    override fun onResume() {
        super.onResume()
        preview.onResume()
        prefs.sp.registerOnSharedPreferenceChangeListener(this)
        if (prefs.parallax) tilt.start()
        renderer.requestReload()
        refresh()
    }

    override fun onPause() {
        prefs.sp.unregisterOnSharedPreferenceChangeListener(this)
        tilt.stop()
        preview.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        loader.shutdownNow()
        thumbCache.evictAll()
        super.onDestroy()
    }

    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        thumbCache.evictAll()
    }

    override fun onSharedPreferenceChanged(sharedPreferences: SharedPreferences?, key: String?) {
        renderer.requestReload()
        if (key == Prefs.KEY_PARALLAX) {
            if (prefs.parallax) {
                tilt.start()
            } else {
                tilt.stop()
                renderer.setTilt(0f, 0f)
            }
        }
        refresh()
    }

    // ---------------------------------------------------------------- UI

    private fun buildRows() {
        fillOptions(screensRow, arrayOf(getString(R.string.screens_same), getString(R.string.screens_different))) {
            prefs.separate = it == 1
        }
        fillOptions(editingRow, arrayOf(getString(R.string.editing_lock), getString(R.string.editing_home))) {
            prefs.editing = if (it == 1) Screen.HOME else Screen.LOCK
        }
        categoryRow.removeAllViews()
        catalog.categories.forEach { cat ->
            categoryRow.addView(chip(cat.title) { prefs.browseCategory = cat.id })
        }
        fillOptions(shuffleRow, resources.getStringArray(R.array.shuffle_options)) {
            prefs.setShuffleMode(prefs.editTarget, it)
        }
        fillOptions(motionRow, resources.getStringArray(R.array.motion_options)) {
            prefs.setMotion(prefs.editTarget, it)
        }
        fillOptions(effectRow, resources.getStringArray(R.array.effect_options)) {
            prefs.setOverlay(prefs.editTarget, it)
        }
        fillOptions(fpsRow, Prefs.FPS_OPTIONS.map { getString(R.string.fps_label, it) }.toTypedArray()) {
            prefs.fps = Prefs.FPS_OPTIONS[it]
        }
        fillOptions(resolutionRow, resources.getStringArray(R.array.resolution_options)) { prefs.resolution = it }
        toggleRow.removeAllViews()
        toggleRow.addView(chip(getString(R.string.toggle_smart_battery)) { prefs.smartBattery = !prefs.smartBattery })
        toggleRow.addView(chip(getString(R.string.toggle_parallax)) { prefs.parallax = !prefs.parallax })
        toggleRow.addView(chip(getString(R.string.toggle_touch)) { prefs.touch = !prefs.touch })
    }

    private fun fillOptions(row: LinearLayout, labels: Array<String>, onPick: (Int) -> Unit) {
        row.removeAllViews()
        labels.forEachIndexed { index, label -> row.addView(chip(label) { onPick(index) }) }
    }

    private fun chip(text: String, onClick: () -> Unit): TextView = TextView(this).apply {
        this.text = text
        setTextColor(resources.getColorStateList(R.color.chip_text, theme))
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
        typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
        setBackgroundResource(R.drawable.chip_bg)
        setPadding(dp(16), dp(9), dp(16), dp(9))
        isClickable = true
        isFocusable = true
        setOnClickListener { onClick() }
        layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { marginEnd = dp(8) }
    }

    /** Fills the thumbnail strip with every design in [category]. */
    private fun showCategory(category: String) {
        shownCategory = category
        thumbRow.removeAllViews()
        catalog.inCategory(category).forEach { scene -> thumbRow.addView(thumbCard(scene)) }
    }

    private fun thumbCard(scene: Scene): View {
        val w = dp(74)
        val h = (w * 2.1667f).toInt()
        val image = ImageView(this).apply {
            layoutParams = FrameLayout.LayoutParams(w, h)
            scaleType = ImageView.ScaleType.CENTER_CROP
            setBackgroundResource(R.drawable.thumb_bg)
            clipToOutline = true
        }
        val frame = FrameLayout(this).apply {
            setBackgroundResource(R.drawable.card_bg)
            setPadding(dp(3), dp(3), dp(3), dp(3))
            addView(image)
        }
        val label = TextView(this).apply {
            text = scene.title
            setTextColor(resources.getColorStateList(R.color.chip_text, theme))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
            maxLines = 1
            ellipsize = TextUtils.TruncateAt.END
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(w + dp(6), LinearLayout.LayoutParams.WRAP_CONTENT).apply {
                topMargin = dp(4)
            }
        }
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            tag = scene.id
            isClickable = true
            isFocusable = true
            addView(frame)
            addView(label)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { marginEnd = dp(10) }
            setOnClickListener { prefs.setScene(prefs.editTarget, scene.id) }
        }
        loadThumb(scene.id, image)
        return card
    }

    /** Thumbnails come from assets (or the user's own photo) and are decoded off the main thread. */
    private fun loadThumb(id: String, into: ImageView) {
        val photoFile = prefs.photoFileFor(prefs.editTarget)
        val key = if (id == Scenes.PHOTO && photoFile.exists()) "photo:" + photoFile.lastModified() else id
        thumbCache.get(key)?.let {
            into.setImageBitmap(it)
            return
        }
        into.tag = key
        val appContext = applicationContext
        loader.execute {
            val bmp = try {
                if (key.startsWith("photo:")) {
                    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                    BitmapFactory.decodeFile(photoFile.absolutePath, bounds)
                    var sample = 1
                    while (bounds.outHeight / (sample * 2) >= 400) sample *= 2
                    BitmapFactory.decodeFile(photoFile.absolutePath, BitmapFactory.Options().apply {
                        inSampleSize = sample
                        inPreferredConfig = Bitmap.Config.RGB_565
                    })
                } else {
                    appContext.assets.open("thumbs/$id.jpg").use {
                        BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply {
                            inPreferredConfig = Bitmap.Config.RGB_565
                        })
                    }
                }
            } catch (e: Exception) {
                null
            }
            if (bmp != null) {
                runOnUiThread {
                    thumbCache.put(key, bmp)
                    if (into.tag == key) into.setImageBitmap(bmp)
                }
            }
        }
    }

    private fun selectOnly(row: LinearLayout, index: Int) {
        for (i in 0 until row.childCount) row.getChildAt(i).isSelected = i == index
    }

    private fun refresh() {
        val separate = prefs.separate
        val target = prefs.editTarget
        val cfg = prefs.configFor(target)
        val scene = catalog.byId(cfg.scene)
        renderer.setScreen(target)

        selectOnly(screensRow, if (separate) 1 else 0)
        editingSection.visibility = if (separate) View.VISIBLE else View.GONE
        selectOnly(editingRow, if (target == Screen.HOME) 1 else 0)

        sceneTitle.text = when {
            !separate -> scene.title
            target == Screen.HOME -> getString(R.string.title_home, scene.title)
            else -> getString(R.string.title_lock, scene.title)
        }
        val categoryTitle = catalog.categories.firstOrNull { it.id == scene.category }?.title ?: ""
        sceneTagline.text = categoryTitle

        val browse = prefs.browseCategory ?: scene.category
        selectOnly(categoryRow, catalog.categories.indexOfFirst { it.id == browse })
        if (browse != shownCategory) {
            showCategory(browse)
            thumbScroll.scrollTo(0, 0)
        }
        var selectedCard: View? = null
        for (i in 0 until thumbRow.childCount) {
            val card = thumbRow.getChildAt(i)
            card.isSelected = card.tag == scene.id
            if (card.isSelected) selectedCard = card
        }
        selectedCard?.let { card -> thumbScroll.post { thumbScroll.smoothScrollTo(maxOf(0, card.left - dp(24)), 0) } }

        selectOnly(shuffleRow, prefs.shuffleMode(target))
        photoSection.visibility = if (scene.id == Scenes.PHOTO) View.VISIBLE else View.GONE
        selectOnly(motionRow, cfg.motion)
        selectOnly(effectRow, cfg.overlay)
        selectOnly(fpsRow, Prefs.FPS_OPTIONS.indexOf(prefs.fps))
        selectOnly(resolutionRow, prefs.resolution)
        resolutionNote.setText(
            when (prefs.resolution) {
                0 -> R.string.res_note_hd
                1 -> R.string.res_note_fhd
                else -> R.string.res_note_4k
            }
        )
        toggleRow.getChildAt(0)?.isSelected = prefs.smartBattery
        toggleRow.getChildAt(1)?.isSelected = prefs.parallax
        toggleRow.getChildAt(2)?.isSelected = prefs.touch
        statusText.setText(if (isAkiniActive()) R.string.status_active else R.string.status_inactive)
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density + 0.5f).toInt()

    @Suppress("DEPRECATION")
    private fun handleInsets() {
        if (Build.VERSION.SDK_INT >= 30) {
            window.setDecorFitsSystemWindows(false)
        } else {
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        }
        val content = findViewById<View>(R.id.content_root)
        content.setOnApplyWindowInsetsListener { v, insets ->
            val top: Int
            val bottom: Int
            if (Build.VERSION.SDK_INT >= 30) {
                val bars = insets.getInsets(WindowInsets.Type.systemBars())
                top = bars.top
                bottom = bars.bottom
            } else {
                top = insets.systemWindowInsetTop
                bottom = insets.systemWindowInsetBottom
            }
            v.setPadding(0, top, 0, bottom)
            insets
        }
    }

    // ---------------------------------------------------------------- actions

    private fun isAkiniActive(): Boolean = try {
        WallpaperManager.getInstance(this).wallpaperInfo?.packageName == packageName
    } catch (e: Exception) {
        false
    }

    private fun applyWallpaper() {
        val intent = Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER).putExtra(
            WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,
            ComponentName(this, AkiniWallpaperService::class.java)
        )
        try {
            startActivity(intent)
            Toast.makeText(this, R.string.apply_hint, Toast.LENGTH_LONG).show()
        } catch (e: ActivityNotFoundException) {
            try {
                startActivity(Intent(WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER))
                Toast.makeText(this, R.string.apply_hint_chooser, Toast.LENGTH_LONG).show()
            } catch (e2: ActivityNotFoundException) {
                Toast.makeText(this, R.string.apply_failed, Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun pickPhoto() {
        val picker = if (Build.VERSION.SDK_INT >= 33) {
            Intent(MediaStore.ACTION_PICK_IMAGES).setType("image/*")
        } else {
            Intent(Intent.ACTION_GET_CONTENT).setType("image/*").addCategory(Intent.CATEGORY_OPENABLE)
        }
        try {
            startActivityForResult(picker, REQUEST_PHOTO)
        } catch (e: ActivityNotFoundException) {
            try {
                startActivityForResult(Intent(Intent.ACTION_GET_CONTENT).setType("image/*"), REQUEST_PHOTO)
            } catch (e2: ActivityNotFoundException) {
                Toast.makeText(this, R.string.photo_failed, Toast.LENGTH_LONG).show()
            }
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        val uri = data?.data
        if (requestCode == REQUEST_PHOTO && resultCode == RESULT_OK && uri != null) importPhoto(uri)
    }

    private fun importPhoto(uri: Uri) {
        statusText.setText(R.string.photo_importing)
        val appContext = applicationContext
        val target = prefs.editTarget
        val file = prefs.photoFileFor(target)
        Thread {
            val ok = try {
                PhotoImporter.import(appContext, uri, file)
            } catch (e: Exception) {
                Log.e("Akini", "Photo import failed", e)
                false
            }
            runOnUiThread {
                if (ok) {
                    prefs.photoImported(target)
                    // refresh the "My Photo" thumbnail
                    if (shownCategory == Scenes.PHOTO_CATEGORY) showCategory(Scenes.PHOTO_CATEGORY)
                } else {
                    Toast.makeText(this, R.string.photo_failed, Toast.LENGTH_LONG).show()
                }
                refresh()
            }
        }.start()
    }

    companion object {
        private const val REQUEST_PHOTO = 41
    }
}
