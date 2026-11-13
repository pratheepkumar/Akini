package io.github.pratheepkumar.akini

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.BlurMaskFilter
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.opengl.GLES20
import android.opengl.GLSurfaceView
import android.opengl.GLUtils
import android.util.Log
import java.io.File
import java.io.IOException
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Draws the selected Akini design with OpenGL ES 2.0, for both the live wallpaper
 * and the in-app preview.
 *
 * All GL work happens on the GLSurfaceView render thread. Other threads only
 * write the @Volatile fields (tilt, touch, screen, reload requests).
 */
class SceneRenderer(private val context: Context) : GLSurfaceView.Renderer {

    /** GL objects for one screen's design, so lock and home can switch instantly. */
    private class Slot {
        var sceneId: String? = null
        var shader: String? = null
        var program = 0
        var fps = 30
        var params = FloatArray(4)
        var c1 = FloatArray(3)
        var c2 = FloatArray(3)
        var c3 = FloatArray(3)
        var glyph: String? = null
        var glyphTex = 0
        var photoTex = 0
        var photoW = 1f
        var photoH = 1f
        var photoKey: String? = null
        var motion = 1
        var overlay = 1
        var uRes = -1
        var uTime = -1
        var uTilt = -1
        var uTouch = -1
        var uP = -1
        var uC1 = -1
        var uC2 = -1
        var uC3 = -1
        var uGlyph = -1
        var uTex = -1
        var uTexSize = -1
        var uMotion = -1
        var uOverlay = -1

        /** A still photo with no effect never changes, so it only needs drawing once. */
        val isStatic: Boolean
            get() = sceneId == Scenes.PHOTO && motion == 0 && overlay == 0

        /** Forget GL names (used when the GL context itself is gone). */
        fun forget() {
            sceneId = null; shader = null; program = 0; glyph = null; glyphTex = 0
            photoTex = 0; photoKey = null
        }
    }

    private val prefs = Prefs(context)
    private val catalog = Scenes.catalog(context)
    private val slots = arrayOf(Slot(), Slot())
    private val quad: FloatBuffer = ByteBuffer.allocateDirect(8 * 4)
        .order(ByteOrder.nativeOrder())
        .asFloatBuffer()
        .apply {
            put(floatArrayOf(-1f, -1f, 1f, -1f, -1f, 1f, 1f, 1f))
            position(0)
        }

    // ---- written from other threads ----
    @Volatile private var reloadRequested = true
    @Volatile private var trimRequested = false
    @Volatile private var targetTiltX = 0f
    @Volatile private var targetTiltY = 0f
    @Volatile var scrollOffset = 0f
    @Volatile private var touchX = 0.5f
    @Volatile private var touchY = 0.5f
    @Volatile private var touchAtNs = 0L
    @Volatile private var screen = Screen.LOCK
    @Volatile private var dirty = true
    @Volatile private var activeStatic = false
    @Volatile private var touchEnabled = true
    @Volatile private var resolutionCap = 2

    /** Frame rate the design on screen needs (read by the wallpaper's frame loop). */
    @Volatile var activeSceneFps = 30
        private set

    // ---- render-thread state ----
    private var separate = false
    private var blitProgram = 0
    private var uBlitTex = -1
    private var fbo = 0
    private var fboTex = 0
    private var surfaceW = 1
    private var surfaceH = 1
    private var targetW = 1
    private var targetH = 1
    private var resolution = -1
    private var maxTexSize = 2048
    private var animTime = 0.0
    private var lastFrameNs = 0L
    private var tiltX = 0f
    private var tiltY = 0f

    /** Re-read settings (design, photo, resolution) before the next frame. */
    fun requestReload() {
        reloadRequested = true
        dirty = true
    }

    /** Release textures that aren't on screen right now (low memory). */
    fun trimMemory() {
        trimRequested = true
    }

    /** Which screen is showing: [Screen.LOCK] or [Screen.HOME]. */
    fun setScreen(value: Int) {
        if (value != screen) {
            screen = value
            dirty = true
        }
    }

    /** Highest resolution allowed right now (0 HD, 1 Full HD, 2 4K); used by smart battery. */
    fun setResolutionCap(value: Int) {
        if (value != resolutionCap) {
            resolutionCap = value
            requestReload()
        }
    }

    /** True while the picture is moving and needs frames at the chosen frame rate. */
    fun wantsContinuousFrames(): Boolean =
        !activeStatic || (touchEnabled && System.nanoTime() - touchAtNs < 3_200_000_000L)

    /** True when something has changed since the last frame. */
    fun needsFrame(): Boolean = dirty || wantsContinuousFrames()

    /** Device tilt, roughly -1..1 on each axis. */
    fun setTilt(x: Float, y: Float) {
        targetTiltX = x
        targetTiltY = y
    }

    /** Touch position in 0..1 screen coordinates, y measured from the top. */
    fun onTouch(x: Float, yFromTop: Float) {
        val now = System.nanoTime()
        // A tap can arrive twice (raw touch + launcher tap command); keep only the first.
        if (now - touchAtNs < 150_000_000L) return
        touchX = x.coerceIn(0f, 1f)
        touchY = (1f - yFromTop).coerceIn(0f, 1f)
        touchAtNs = now
        dirty = true
    }

    override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
        // New GL context: objects from an older context no longer exist.
        slots.forEach { it.forget() }
        fbo = 0
        fboTex = 0
        blitProgram = buildProgram(VERTEX_SHADER, BLIT_SHADER)
        uBlitTex = GLES20.glGetUniformLocation(blitProgram, "uTex")
        val ints = IntArray(1)
        GLES20.glGetIntegerv(GLES20.GL_MAX_TEXTURE_SIZE, ints, 0)
        maxTexSize = if (ints[0] > 0) ints[0] else 2048
        GLES20.glDisable(GLES20.GL_DEPTH_TEST)
        GLES20.glDisable(GLES20.GL_BLEND)
        resolution = -1
        reloadRequested = true
        lastFrameNs = 0L
    }

    override fun onSurfaceChanged(gl: GL10?, width: Int, height: Int) {
        surfaceW = max(1, width)
        surfaceH = max(1, height)
        setupTarget()
        dirty = true
    }

    override fun onDrawFrame(gl: GL10?) {
        if (reloadRequested) {
            reloadRequested = false
            reload()
        }
        if (trimRequested) {
            trimRequested = false
            trimInactive()
        }

        val now = System.nanoTime()
        val dt = if (lastFrameNs == 0L) 0.0 else ((now - lastFrameNs) / 1e9).coerceIn(0.0, 0.1)
        lastFrameNs = now
        animTime += dt
        if (animTime > 3600.0) animTime -= 3600.0

        // Ease toward the latest tilt so motion stays smooth at any frame rate.
        val k = (dt * 5.0).toFloat().coerceIn(0f, 1f)
        tiltX += (targetTiltX + scrollOffset * 0.5f - tiltX) * k
        tiltY += (targetTiltY - tiltY) * k

        dirty = false
        val index = if (separate) screen else 0
        val slot = slots[index]
        if (slot.sceneId == null || (slot.sceneId == Scenes.PHOTO && slot.photoTex == 0)) {
            prepare(slot, if (separate) screen else Screen.LOCK)
        }
        activeStatic = slot.isStatic
        activeSceneFps = slot.fps
        if (slot.program == 0) {
            GLES20.glClearColor(0f, 0f, 0f, 1f)
            GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT)
            return
        }

        GLES20.glBindFramebuffer(GLES20.GL_FRAMEBUFFER, fbo)
        GLES20.glViewport(0, 0, targetW, targetH)
        GLES20.glUseProgram(slot.program)
        GLES20.glUniform2f(slot.uRes, targetW.toFloat(), targetH.toFloat())
        GLES20.glUniform1f(slot.uTime, animTime.toFloat())
        GLES20.glUniform2f(slot.uTilt, tiltX, tiltY)
        val touchAge = ((now - touchAtNs) / 1e9).coerceAtMost(100.0).toFloat()
        GLES20.glUniform4f(slot.uTouch, touchX, touchY, touchAge, if (touchEnabled) 1f else 0f)
        GLES20.glUniform4f(slot.uP, slot.params[0], slot.params[1], slot.params[2], slot.params[3])
        GLES20.glUniform3f(slot.uC1, slot.c1[0], slot.c1[1], slot.c1[2])
        GLES20.glUniform3f(slot.uC2, slot.c2[0], slot.c2[1], slot.c2[2])
        GLES20.glUniform3f(slot.uC3, slot.c3[0], slot.c3[1], slot.c3[2])
        if (slot.uGlyph >= 0 && slot.glyphTex != 0) {
            GLES20.glActiveTexture(GLES20.GL_TEXTURE0)
            GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, slot.glyphTex)
            GLES20.glUniform1i(slot.uGlyph, 0)
        }
        if (slot.uTex >= 0 && slot.photoTex != 0) {
            GLES20.glActiveTexture(GLES20.GL_TEXTURE0)
            GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, slot.photoTex)
            GLES20.glUniform1i(slot.uTex, 0)
            GLES20.glUniform2f(slot.uTexSize, slot.photoW, slot.photoH)
            GLES20.glUniform1f(slot.uMotion, slot.motion.toFloat())
            GLES20.glUniform1f(slot.uOverlay, slot.overlay.toFloat())
        }
        drawQuad()

        if (fbo != 0) {
            // Scale the offscreen frame to the screen (down from 4K, or up from HD).
            GLES20.glBindFramebuffer(GLES20.GL_FRAMEBUFFER, 0)
            GLES20.glViewport(0, 0, surfaceW, surfaceH)
            GLES20.glUseProgram(blitProgram)
            GLES20.glActiveTexture(GLES20.GL_TEXTURE0)
            GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, fboTex)
            GLES20.glUniform1i(uBlitTex, 0)
            drawQuad()
        }
    }

    private fun drawQuad() {
        GLES20.glBindBuffer(GLES20.GL_ARRAY_BUFFER, 0)
        GLES20.glEnableVertexAttribArray(0)
        GLES20.glVertexAttribPointer(0, 2, GLES20.GL_FLOAT, false, 0, quad)
        GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4)
    }

    private fun reload() {
        separate = prefs.separate
        touchEnabled = prefs.touch
        val res = min(prefs.resolution, resolutionCap)
        val resolutionChanged = res != resolution
        if (resolutionChanged) {
            resolution = res
            setupTarget()
            // photos are decoded to suit the resolution, so they need decoding again
            slots.forEach { s -> if (s.photoKey != null) s.photoKey = STALE }
        }
        if (separate) {
            prepare(slots[Screen.LOCK], Screen.LOCK)
            prepare(slots[Screen.HOME], Screen.HOME)
        } else {
            prepare(slots[0], Screen.LOCK)
            release(slots[1])
        }
    }

    /** Brings a slot up to date with the settings for [forScreen]. */
    private fun prepare(slot: Slot, forScreen: Int) {
        val cfg = prefs.configFor(forScreen)
        val scene = catalog.byId(cfg.scene)
        if (scene.shader != slot.shader || slot.program == 0) {
            if (slot.program != 0) GLES20.glDeleteProgram(slot.program)
            val p = loadSceneProgram(scene.shader)
            slot.program = p
            slot.shader = scene.shader
            slot.uRes = GLES20.glGetUniformLocation(p, "uRes")
            slot.uTime = GLES20.glGetUniformLocation(p, "uTime")
            slot.uTilt = GLES20.glGetUniformLocation(p, "uTilt")
            slot.uTouch = GLES20.glGetUniformLocation(p, "uTouch")
            slot.uP = GLES20.glGetUniformLocation(p, "uP")
            slot.uC1 = GLES20.glGetUniformLocation(p, "uC1")
            slot.uC2 = GLES20.glGetUniformLocation(p, "uC2")
            slot.uC3 = GLES20.glGetUniformLocation(p, "uC3")
            slot.uGlyph = GLES20.glGetUniformLocation(p, "uGlyph")
            slot.uTex = GLES20.glGetUniformLocation(p, "uTex")
            slot.uTexSize = GLES20.glGetUniformLocation(p, "uTexSize")
            slot.uMotion = GLES20.glGetUniformLocation(p, "uMotion")
            slot.uOverlay = GLES20.glGetUniformLocation(p, "uOverlay")
        }
        slot.sceneId = scene.id
        slot.fps = scene.fps
        slot.params = scene.params
        slot.c1 = scene.color1
        slot.c2 = scene.color2
        slot.c3 = scene.color3
        slot.motion = cfg.motion
        slot.overlay = cfg.overlay

        // symbol texture (only for designs that draw a symbol)
        if (scene.glyph != slot.glyph || (scene.glyph != null && slot.glyphTex == 0)) {
            deleteTexture(slot.glyphTex)
            slot.glyphTex = 0
            slot.glyph = scene.glyph
            val text = scene.glyph
            if (text != null) {
                val bmp = buildGlyphBitmap(text)
                slot.glyphTex = uploadTexture(bmp)
                bmp.recycle()
            }
        }

        // photo texture (only for "My Photo")
        if (scene.id == Scenes.PHOTO) {
            val key = cfg.photoFile.path + "#" + cfg.photoVersion
            if (slot.photoTex == 0 || key != slot.photoKey) {
                loadPhoto(slot, cfg.photoFile)
                slot.photoKey = key
            }
        } else if (slot.photoTex != 0) {
            deleteTexture(slot.photoTex)
            slot.photoTex = 0
            slot.photoKey = null
        }
    }

    private fun release(slot: Slot) {
        if (slot.program != 0) GLES20.glDeleteProgram(slot.program)
        deleteTexture(slot.glyphTex)
        deleteTexture(slot.photoTex)
        slot.forget()
    }

    /** Frees the off-screen slot entirely; it is rebuilt the next time it is needed. */
    private fun trimInactive() {
        if (!separate) return
        release(slots[if (screen == Screen.LOCK) Screen.HOME else Screen.LOCK])
    }

    private fun loadSceneProgram(shader: String): Int {
        val source = try {
            readAsset("shaders/common.glsl") + "\n" + readAsset("shaders/$shader.frag")
        } catch (e: IOException) {
            Log.e(TAG, "Missing shader $shader", e)
            null
        }
        val built = if (source != null) buildProgram(VERTEX_SHADER, source) else 0
        return if (built != 0) built else buildProgram(VERTEX_SHADER, FALLBACK_SHADER)
    }

    private fun readAsset(path: String): String =
        context.assets.open(path).bufferedReader().use { it.readText() }

    /**
     * Creates the offscreen buffer when the chosen resolution differs from the screen's:
     * smaller for HD (fewer pixels to shade), larger for 4K (supersampled, then scaled down).
     */
    private fun setupTarget() {
        deleteTarget()
        targetW = surfaceW
        targetH = surfaceH
        if (resolution < 0) return
        val shortSide = min(surfaceW, surfaceH).toFloat()
        var scale = Prefs.targetShortSide(resolution) / shortSide
        val longSide = max(surfaceW, surfaceH) * scale
        if (longSide > maxTexSize) scale *= maxTexSize / longSide
        if (abs(scale - 1f) < 0.05f) return

        val w = max(1, (surfaceW * scale).roundToInt())
        val h = max(1, (surfaceH * scale).roundToInt())
        val ids = IntArray(1)
        GLES20.glGenTextures(1, ids, 0)
        fboTex = ids[0]
        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, fboTex)
        setTextureParams()
        GLES20.glTexImage2D(
            GLES20.GL_TEXTURE_2D, 0, GLES20.GL_RGBA, w, h, 0,
            GLES20.GL_RGBA, GLES20.GL_UNSIGNED_BYTE, null
        )
        GLES20.glGenFramebuffers(1, ids, 0)
        fbo = ids[0]
        GLES20.glBindFramebuffer(GLES20.GL_FRAMEBUFFER, fbo)
        GLES20.glFramebufferTexture2D(
            GLES20.GL_FRAMEBUFFER, GLES20.GL_COLOR_ATTACHMENT0,
            GLES20.GL_TEXTURE_2D, fboTex, 0
        )
        val status = GLES20.glCheckFramebufferStatus(GLES20.GL_FRAMEBUFFER)
        GLES20.glBindFramebuffer(GLES20.GL_FRAMEBUFFER, 0)
        if (status != GLES20.GL_FRAMEBUFFER_COMPLETE) {
            Log.w(TAG, "Offscreen buffer not supported ($status); drawing at screen resolution")
            deleteTarget()
            return
        }
        targetW = w
        targetH = h
    }

    private fun deleteTarget() {
        if (fbo != 0) GLES20.glDeleteFramebuffers(1, intArrayOf(fbo), 0)
        deleteTexture(fboTex)
        fbo = 0
        fboTex = 0
    }

    private fun deleteTexture(id: Int) {
        if (id != 0) GLES20.glDeleteTextures(1, intArrayOf(id), 0)
    }

    /** Decodes the photo only as large as the chosen resolution needs, to save memory. */
    private fun loadPhoto(slot: Slot, file: File) {
        deleteTexture(slot.photoTex)
        slot.photoTex = 0
        val wantLong = min((Prefs.targetShortSide(max(resolution, 0)) * 2.4f).toInt(), maxTexSize)
        var decoded: Bitmap? = null
        if (file.exists()) {
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(file.absolutePath, bounds)
            var sample = 1
            while (max(bounds.outWidth, bounds.outHeight) / (sample * 2) >= wantLong) sample *= 2
            decoded = BitmapFactory.decodeFile(
                file.absolutePath,
                BitmapFactory.Options().apply { inSampleSize = sample }
            )
        }
        var b = decoded ?: placeholderBitmap()
        if (max(b.width, b.height) > wantLong) {
            val s = wantLong.toFloat() / max(b.width, b.height)
            val scaled = Bitmap.createScaledBitmap(
                b, max(1, (b.width * s).toInt()), max(1, (b.height * s).toInt()), true
            )
            if (scaled != b) b.recycle()
            b = scaled
        }
        slot.photoTex = uploadTexture(b)
        slot.photoW = b.width.toFloat()
        slot.photoH = b.height.toFloat()
        b.recycle()
    }

    private fun uploadTexture(bmp: Bitmap): Int {
        val ids = IntArray(1)
        GLES20.glGenTextures(1, ids, 0)
        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, ids[0])
        setTextureParams()
        GLUtils.texImage2D(GLES20.GL_TEXTURE_2D, 0, bmp, 0)
        return ids[0]
    }

    /**
     * Renders a symbol into a texture: red = sharp shape, green = soft glow, blue = wide glow.
     * Uses the phone's own fonts (Android always includes a Devanagari font for ॐ).
     */
    private fun buildGlyphBitmap(text: String): Bitmap {
        val size = GLYPH_SIZE
        val blurs = floatArrayOf(0f, size * 0.02f, size * 0.07f)
        val layers = Array(3) { ByteArray(size * size) }
        for (i in 0 until 3) {
            val alpha = Bitmap.createBitmap(size, size, Bitmap.Config.ALPHA_8)
            val canvas = Canvas(alpha)
            val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.WHITE
                textSize = size * 0.62f
                textAlign = Paint.Align.CENTER
                if (blurs[i] > 0f) maskFilter = BlurMaskFilter(blurs[i], BlurMaskFilter.Blur.NORMAL)
            }
            val fm = paint.fontMetrics
            val y = size / 2f - (fm.ascent + fm.descent) / 2f + size * 0.03f
            canvas.drawText(text, size / 2f, y, paint)
            val row = alpha.rowBytes
            val buffer = ByteBuffer.allocate(row * size)
            alpha.copyPixelsToBuffer(buffer)
            val raw = buffer.array()
            for (yy in 0 until size) System.arraycopy(raw, yy * row, layers[i], yy * size, size)
            alpha.recycle()
        }
        val pixels = IntArray(size * size) { idx ->
            Color.argb(
                255,
                layers[0][idx].toInt() and 0xFF,
                layers[1][idx].toInt() and 0xFF,
                layers[2][idx].toInt() and 0xFF
            )
        }
        return Bitmap.createBitmap(pixels, size, size, Bitmap.Config.ARGB_8888)
    }

    private fun placeholderBitmap(): Bitmap {
        val b = Bitmap.createBitmap(2, 4, Bitmap.Config.ARGB_8888)
        for (y in 0 until 4) {
            for (x in 0 until 2) b.setPixel(x, y, Color.rgb(4 + y * 6, 10 + y * 14, 30 + y * 20))
        }
        return b
    }

    private fun setTextureParams() {
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR)
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR)
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE)
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE)
    }

    private fun buildProgram(vertexSrc: String, fragmentSrc: String): Int {
        val vs = compileShader(GLES20.GL_VERTEX_SHADER, vertexSrc)
        if (vs == 0) return 0
        val fs = compileShader(GLES20.GL_FRAGMENT_SHADER, fragmentSrc)
        if (fs == 0) {
            GLES20.glDeleteShader(vs)
            return 0
        }
        val p = GLES20.glCreateProgram()
        GLES20.glAttachShader(p, vs)
        GLES20.glAttachShader(p, fs)
        GLES20.glBindAttribLocation(p, 0, "aPos")
        GLES20.glLinkProgram(p)
        GLES20.glDeleteShader(vs)
        GLES20.glDeleteShader(fs)
        val status = IntArray(1)
        GLES20.glGetProgramiv(p, GLES20.GL_LINK_STATUS, status, 0)
        if (status[0] == 0) {
            Log.e(TAG, "Program link failed: " + GLES20.glGetProgramInfoLog(p))
            GLES20.glDeleteProgram(p)
            return 0
        }
        return p
    }

    private fun compileShader(type: Int, source: String): Int {
        val s = GLES20.glCreateShader(type)
        GLES20.glShaderSource(s, source)
        GLES20.glCompileShader(s)
        val ok = IntArray(1)
        GLES20.glGetShaderiv(s, GLES20.GL_COMPILE_STATUS, ok, 0)
        if (ok[0] == 0) {
            Log.e(TAG, "Shader compile failed: " + GLES20.glGetShaderInfoLog(s))
            GLES20.glDeleteShader(s)
            return 0
        }
        return s
    }

    companion object {
        private const val TAG = "Akini"
        private const val GLYPH_SIZE = 512
        private const val STALE = "stale"

        private const val VERTEX_SHADER = """
            attribute vec2 aPos;
            varying vec2 vUv;
            void main() {
                vUv = aPos * 0.5 + 0.5;
                gl_Position = vec4(aPos, 0.0, 1.0);
            }
        """

        private const val BLIT_SHADER = """
            precision mediump float;
            uniform sampler2D uTex;
            varying vec2 vUv;
            void main() {
                gl_FragColor = texture2D(uTex, vUv);
            }
        """

        /** Shown only if a design's shader fails to compile on some GPU. */
        private const val FALLBACK_SHADER = """
            precision mediump float;
            varying vec2 vUv;
            void main() {
                gl_FragColor = vec4(0.01, 0.04 + 0.10 * vUv.y, 0.08 + 0.18 * vUv.y, 1.0);
            }
        """
    }
}
