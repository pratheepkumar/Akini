package io.github.pratheepkumar.akini

/** A wallpaper scene. [id] is also the name of its shader in assets/shaders. */
data class Scene(val id: String, val title: String, val tagline: String)

object Scenes {
    const val PHOTO = "photo"

    val all: List<Scene> = listOf(
        Scene("event_horizon", "Event Horizon", "A black hole bending starlight around its glowing disk"),
        Scene("nebula_drift", "Nebula Drift", "Deep-space gas clouds with parallax stars"),
        Scene("liquid_chrome", "Liquid Chrome", "Flowing liquid metal under studio lights"),
        Scene("neon_grid", "Neon Grid", "A data plane racing toward a cyber city"),
        Scene("holo_core", "Holo Core", "An energy core inside holographic HUD rings"),
        Scene("data_stream", "Data Stream", "Cascading code at three depths"),
        Scene(PHOTO, "My Photo", "Your own picture, brought to life"),
    )

    fun byId(id: String?): Scene = all.firstOrNull { it.id == id } ?: all.first()
}
