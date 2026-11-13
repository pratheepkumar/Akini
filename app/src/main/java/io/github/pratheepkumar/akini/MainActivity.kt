package io.github.pratheepkumar.akini

import android.app.Activity
import android.app.WallpaperManager
import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Typeface
import android.net.Uri
import android.opengl.GLSurfaceView
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.util.Log
import android.util.TypedValue
import android.view.MotionEvent
import android.view.View
import android.view.WindowInsets
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast

/** Scene picker with a full-screen live preview and the "Set as wallpaper" button. */
class MainActivity : Activity(), SharedPreferences.OnSharedPreferenceChangeListener {

    private lateinit var prefs: Prefs
    private lateinit var renderer: SceneRenderer
    private lateinit var preview: GLSurfaceView
    private lateinit var tilt: TiltSensor

    private lateinit var sceneTitle: TextView
    private lateinit var sceneTagline: TextView
    private lateinit var screensRow: LinearLayout
    private lateinit var editingSection: LinearLayout
    private lateinit var editingRow: LinearLayout
    private lateinit var sceneRow: LinearLayout
    private lateinit var photoSection: LinearLayout
    private lateinit var motionRow: LinearLayout
    private lateinit var effectRow: LinearLayout
    private lateinit var settingsSection: LinearLayout
    private lateinit var settingsToggle: TextView
    private lateinit var fpsRow: LinearLayout
    private lateinit var qualityRow: LinearLayout
    private lateinit var toggleRow: LinearLayout
    private lateinit var statusText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        prefs = Prefs(this)
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
        sceneRow = findViewById(R.id.scene_row)
        photoSection = findViewById(R.id.photo_section)
        motionRow = findViewById(R.id.motion_row)
        effectRow = findViewById(R.id.effect_row)
        settingsSection = findViewById(R.id.settings_section)
        settingsToggle = findViewById(R.id.settings_toggle)
        fpsRow = findViewById(R.id.fps_row)
        qualityRow = findViewById(R.id.quality_row)
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
        sceneRow.removeAllViews()
        Scenes.all.forEach { scene ->
            sceneRow.addView(chip(scene.title) { prefs.setScene(prefs.editTarget, scene.id) })
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
        fillOptions(qualityRow, resources.getStringArray(R.array.quality_options)) { prefs.quality = it }
        toggleRow.removeAllViews()
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

    private fun selectOnly(row: LinearLayout, index: Int) {
        for (i in 0 until row.childCount) row.getChildAt(i).isSelected = i == index
    }

    private fun refresh() {
        val separate = prefs.separate
        val target = prefs.editTarget
        val cfg = prefs.configFor(target)
        val scene = Scenes.byId(cfg.scene)
        renderer.setScreen(target)

        selectOnly(screensRow, if (separate) 1 else 0)
        editingSection.visibility = if (separate) View.VISIBLE else View.GONE
        selectOnly(editingRow, if (target == Screen.HOME) 1 else 0)

        sceneTitle.text = when {
            !separate -> scene.title
            target == Screen.HOME -> getString(R.string.title_home, scene.title)
            else -> getString(R.string.title_lock, scene.title)
        }
        sceneTagline.text = scene.tagline
        selectOnly(sceneRow, Scenes.all.indexOf(scene))
        photoSection.visibility = if (scene.id == Scenes.PHOTO) View.VISIBLE else View.GONE
        selectOnly(motionRow, cfg.motion)
        selectOnly(effectRow, cfg.overlay)
        selectOnly(fpsRow, Prefs.FPS_OPTIONS.indexOf(prefs.fps))
        selectOnly(qualityRow, prefs.quality)
        toggleRow.getChildAt(0)?.isSelected = prefs.parallax
        toggleRow.getChildAt(1)?.isSelected = prefs.touch
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
                    refresh()
                } else {
                    Toast.makeText(this, R.string.photo_failed, Toast.LENGTH_LONG).show()
                    refresh()
                }
            }
        }.start()
    }

    companion object {
        private const val REQUEST_PHOTO = 41
    }
}
