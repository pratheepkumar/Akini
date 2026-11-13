package io.github.pratheepkumar.akini

import android.app.KeyguardManager
import android.app.WallpaperManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.opengl.GLSurfaceView
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.service.wallpaper.WallpaperService
import android.view.MotionEvent
import android.view.SurfaceHolder

/**
 * The live wallpaper itself. Renders the scene picked in the app, pauses completely
 * whenever it is not visible, and can show different wallpapers on the lock and home
 * screens (Samsung runs one wallpaper on both, so Akini switches when you unlock).
 */
class AkiniWallpaperService : WallpaperService() {

    private val engines = mutableListOf<AkiniEngine>()

    override fun onCreateEngine(): Engine = AkiniEngine().also { engines.add(it) }

    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        engines.forEach { it.trimMemory() }
    }

    inner class AkiniEngine : Engine(), SharedPreferences.OnSharedPreferenceChangeListener {

        private val prefs = Prefs(this@AkiniWallpaperService)
        private val renderer = SceneRenderer(this@AkiniWallpaperService)
        private val handler = Handler(Looper.getMainLooper())
        private val keyguard =
            getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager?
        private val power = getSystemService(Context.POWER_SERVICE) as PowerManager?
        private var userFps = 30
        private var smartBattery = true
        private var hot = false
        private var thermalListener: Any? = null
        private var glView: WallpaperGLView? = null
        private var tilt: TiltSensor? = null
        private var isShown = false
        private var receiverRegistered = false

        /** Draws frames at the chosen rate while moving; idles when the picture is still. */
        private val frameTick = object : Runnable {
            override fun run() {
                if (!isShown) return
                updateScreen()
                if (renderer.needsFrame()) glView?.requestRender()
                val delay = if (renderer.wantsContinuousFrames()) 1000L / effectiveFps() else IDLE_CHECK_MS
                handler.postDelayed(this, delay)
            }
        }

        /** Unlock / screen on / screen off: switch between the lock and home wallpapers. */
        private val screenReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (intent?.action == PowerManager.ACTION_POWER_SAVE_MODE_CHANGED) {
                    applyBatteryLimits()
                } else if (intent?.action == Intent.ACTION_SCREEN_OFF) {
                    renderer.setScreen(Screen.LOCK)
                    prerenderWhileHidden()
                } else {
                    updateScreen()
                    kickFrames()
                }
            }
        }

        override fun onCreate(surfaceHolder: SurfaceHolder) {
            super.onCreate(surfaceHolder)
            setTouchEventsEnabled(true)
            glView = WallpaperGLView(this@AkiniWallpaperService).apply {
                setEGLContextClientVersion(2)
                preserveEGLContextOnPause = true
                setRenderer(renderer)
                renderMode = GLSurfaceView.RENDERMODE_WHEN_DIRTY
            }
            tilt = TiltSensor(this@AkiniWallpaperService) { x, y -> renderer.setTilt(x, y) }
            prefs.sp.registerOnSharedPreferenceChangeListener(this)
            registerScreenReceiver()
            registerThermalListener()
            applyPrefs()
            updateScreen()
        }

        /** Android 10+: slow down when the phone reports it is getting warm. */
        private fun registerThermalListener() {
            val pm = power ?: return
            if (Build.VERSION.SDK_INT < 29) return
            val listener = PowerManager.OnThermalStatusChangedListener { status ->
                hot = status >= PowerManager.THERMAL_STATUS_MODERATE
                applyBatteryLimits()
            }
            try {
                pm.addThermalStatusListener(listener)
                thermalListener = listener
                hot = pm.currentThermalStatus >= PowerManager.THERMAL_STATUS_MODERATE
            } catch (e: Exception) {
                // thermal status not available on this phone
            }
        }

        private fun constrained(): Boolean = (power?.isPowerSaveMode == true) || hot

        /** Frame rate actually used: the user's choice, capped by the design and battery state. */
        private fun effectiveFps(): Int {
            var fps = userFps
            if (smartBattery) {
                fps = minOf(fps, renderer.activeSceneFps)
                if (constrained()) fps = minOf(fps, 15)
            }
            return fps.coerceIn(10, 60)
        }

        /** In Battery Saver (or when warm) smart battery also drops to HD resolution. */
        private fun applyBatteryLimits() {
            renderer.setResolutionCap(if (smartBattery && constrained()) 0 else 2)
            glView?.requestRender()
        }

        fun trimMemory() {
            renderer.trimMemory()
        }

        private fun registerScreenReceiver() {
            val filter = IntentFilter().apply {
                addAction(Intent.ACTION_USER_PRESENT)
                addAction(Intent.ACTION_SCREEN_ON)
                addAction(Intent.ACTION_SCREEN_OFF)
                addAction(PowerManager.ACTION_POWER_SAVE_MODE_CHANGED)
            }
            try {
                if (Build.VERSION.SDK_INT >= 33) {
                    registerReceiver(screenReceiver, filter, Context.RECEIVER_EXPORTED)
                } else {
                    registerReceiver(screenReceiver, filter)
                }
                receiverRegistered = true
            } catch (e: Exception) {
                // Fall back to checking the lock state on each frame tick.
            }
        }

        /** Works out whether this wallpaper is currently behind the lock screen or the home screen. */
        private fun currentScreen(): Int {
            if (Build.VERSION.SDK_INT >= 34) {
                val flags = wallpaperFlags
                val onLock = (flags and WallpaperManager.FLAG_LOCK) != 0
                val onHome = (flags and WallpaperManager.FLAG_SYSTEM) != 0
                if (onLock && !onHome) return Screen.LOCK
                if (onHome && !onLock) return Screen.HOME
            }
            val locked = try {
                keyguard?.isKeyguardLocked == true
            } catch (e: Exception) {
                false
            }
            return if (locked) Screen.LOCK else Screen.HOME
        }

        /** Restarts the frame loop now, in case it was idling on a still picture. */
        private fun kickFrames() {
            if (!isShown) return
            handler.removeCallbacks(frameTick)
            handler.post(frameTick)
        }

        private fun updateScreen() {
            renderer.setScreen(currentScreen())
        }

        /** Draws the lock-screen picture while the display is off, so it's ready when it wakes. */
        private fun prerenderWhileHidden() {
            val view = glView ?: return
            if (!prefs.separate) return
            if (isShown) {
                view.requestRender()
                return
            }
            view.onResume()
            view.requestRender()
            handler.postDelayed({ if (!isShown) glView?.onPause() }, 400L)
        }

        override fun onVisibilityChanged(visible: Boolean) {
            super.onVisibilityChanged(visible)
            isShown = visible
            handler.removeCallbacks(frameTick)
            if (visible) {
                // a new day may bring a new design (no alarms or background work needed)
                if (!isPreview) {
                    Shuffler.maybeShuffle(this@AkiniWallpaperService, prefs, Screen.LOCK)
                    if (prefs.separate) Shuffler.maybeShuffle(this@AkiniWallpaperService, prefs, Screen.HOME)
                }
                updateScreen()
                glView?.onResume()
                if (prefs.parallax) tilt?.start()
                handler.post(frameTick)
            } else {
                glView?.onPause()
                tilt?.stop()
            }
        }

        override fun onOffsetsChanged(
            xOffset: Float, yOffset: Float,
            xOffsetStep: Float, yOffsetStep: Float,
            xPixelOffset: Int, yPixelOffset: Int
        ) {
            // Home-screen page swipes nudge the scene sideways (if the launcher reports them).
            renderer.scrollOffset = if (prefs.parallax) (xOffset - 0.5f) * 2f else 0f
        }

        override fun onTouchEvent(event: MotionEvent?) {
            super.onTouchEvent(event)
            if (event != null && event.actionMasked == MotionEvent.ACTION_DOWN) tap(event.x, event.y)
        }

        override fun onCommand(
            action: String?, x: Int, y: Int, z: Int, extras: Bundle?, resultRequested: Boolean
        ): Bundle? {
            if (action == WallpaperManager.COMMAND_TAP) tap(x.toFloat(), y.toFloat())
            return super.onCommand(action, x, y, z, extras, resultRequested)
        }

        private fun tap(x: Float, y: Float) {
            if (!prefs.touch) return
            val frame = surfaceHolder.surfaceFrame
            if (frame.width() > 0 && frame.height() > 0) {
                renderer.onTouch(x / frame.width(), y / frame.height())
                kickFrames()
            }
        }

        override fun onSharedPreferenceChanged(sharedPreferences: SharedPreferences?, key: String?) {
            applyPrefs()
            renderer.requestReload()
            glView?.requestRender()
        }

        private fun applyPrefs() {
            userFps = prefs.fps
            smartBattery = prefs.smartBattery
            applyBatteryLimits()
            if (!prefs.parallax) {
                tilt?.stop()
                renderer.setTilt(0f, 0f)
                renderer.scrollOffset = 0f
            } else if (isShown) {
                tilt?.start()
            }
        }

        override fun onDestroy() {
            handler.removeCallbacksAndMessages(null)
            tilt?.stop()
            prefs.sp.unregisterOnSharedPreferenceChangeListener(this)
            if (receiverRegistered) {
                try {
                    unregisterReceiver(screenReceiver)
                } catch (e: Exception) {
                    // already gone
                }
                receiverRegistered = false
            }
            if (Build.VERSION.SDK_INT >= 29) {
                val l = thermalListener
                if (l is PowerManager.OnThermalStatusChangedListener) {
                    try {
                        power?.removeThermalStatusListener(l)
                    } catch (e: Exception) {
                        // already removed
                    }
                }
            }
            engines.remove(this)
            glView?.destroy()
            glView = null
            super.onDestroy()
        }

        /** A GLSurfaceView that draws into the wallpaper's surface instead of a window. */
        inner class WallpaperGLView(context: Context) : GLSurfaceView(context) {
            override fun getHolder(): SurfaceHolder = this@AkiniEngine.surfaceHolder

            fun destroy() {
                super.onDetachedFromWindow()
            }
        }
    }

    companion object {
        /** How often a still wallpaper checks for unlocks and taps. */
        private const val IDLE_CHECK_MS = 250L
    }
}
