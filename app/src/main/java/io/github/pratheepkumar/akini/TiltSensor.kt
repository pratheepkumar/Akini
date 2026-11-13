package io.github.pratheepkumar.akini

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager

/**
 * Turns the phone's gravity reading into a gentle -1..1 tilt for parallax.
 * The "neutral" position slowly follows how you hold the phone, so the scene
 * always settles back to centre. Needs no permission.
 */
class TiltSensor(
    context: Context,
    private val onTilt: (Float, Float) -> Unit
) : SensorEventListener {

    private val manager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager?
    private val sensor: Sensor? = manager?.let {
        it.getDefaultSensor(Sensor.TYPE_GRAVITY) ?: it.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
    }
    private var running = false
    private var baseX = Float.NaN
    private var baseY = Float.NaN

    fun start() {
        val m = manager ?: return
        val s = sensor ?: return
        if (running) return
        running = m.registerListener(this, s, SensorManager.SENSOR_DELAY_GAME)
    }

    fun stop() {
        if (!running) return
        manager?.unregisterListener(this)
        running = false
        baseX = Float.NaN
        baseY = Float.NaN
    }

    override fun onSensorChanged(event: SensorEvent?) {
        val v = event?.values ?: return
        if (v.size < 2) return
        val gx = v[0]
        val gy = v[1]
        if (baseX.isNaN()) {
            baseX = gx
            baseY = gy
        }
        baseX += (gx - baseX) * 0.01f
        baseY += (gy - baseY) * 0.01f
        val tx = ((gx - baseX) / 2.5f).coerceIn(-1f, 1f)
        val ty = ((gy - baseY) / 2.5f).coerceIn(-1f, 1f)
        onTilt(-tx, ty)
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
}
