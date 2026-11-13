package io.github.pratheepkumar.akini

import android.app.WallpaperManager
import android.content.Context
import android.content.SharedPreferences
import android.opengl.GLSurfaceView
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.service.wallpaper.WallpaperService
import android.view.MotionEvent
import android.view.SurfaceHolder

/**
 * The live wallpaper itself. Renders the scene picked in the app on the home
 * and lock screens, and pauses completely whenever it is not visible.
 */
class AkiniWallpaperService : WallpaperService() {

    override fun onCreateEngine(): Engine = AkiniEngine()

    inner class AkiniEngine : Engine(), SharedPreferences.OnSharedPreferenceChangeListener {

        private val prefs = Prefs(this@AkiniWallpaperService)
        private val renderer = SceneRenderer(this@AkiniWallpaperService)
        private val handler = Handler(Looper.getMainLooper())
        private var glView: WallpaperGLView? = null
        private var tilt: TiltSensor? = null
        private var isShown = false
        private var frameDelayMs = 33L

        /** Asks for a new frame at the chosen frame rate while the wallpaper is visible. */
        private val frameTick = object : Runnable {
            override fun run() {
                if (!isShown) return
                glView?.requestRender()
                handler.postDelayed(this, frameDelayMs)
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
            applyPrefs()
        }

        override fun onVisibilityChanged(visible: Boolean) {
            super.onVisibilityChanged(visible)
            isShown = visible
            handler.removeCallbacks(frameTick)
            if (visible) {
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
            }
        }

        override fun onSharedPreferenceChanged(sharedPreferences: SharedPreferences?, key: String?) {
            applyPrefs()
            renderer.requestReload()
            glView?.requestRender()
        }

        private fun applyPrefs() {
            frameDelayMs = 1000L / prefs.fps.coerceIn(10, 60)
            if (!prefs.parallax) {
                tilt?.stop()
                renderer.setTilt(0f, 0f)
                renderer.scrollOffset = 0f
            } else if (isShown) {
                tilt?.start()
            }
        }

        override fun onDestroy() {
            handler.removeCallbacks(frameTick)
            tilt?.stop()
            prefs.sp.unregisterOnSharedPreferenceChangeListener(this)
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
}
