// Nebula Drift — glowing interstellar gas with a slow camera drift.

vec3 stars(vec2 p, float scale, float density, float seed) {
    vec2 g = p * scale + seed;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float present = step(density, hash12(id + seed));
    vec2 off = (hash22(id + seed * 1.7) - 0.5) * 0.75;
    float h = hash12(id + seed * 2.3);
    float d = length(f - off);
    float tw = 0.6 + 0.4 * sin(uTime * (0.7 + 2.0 * h) + h * 50.0);
    float core = smoothstep(0.07, 0.0, d);
    float halo = 0.015 / (d * d * 60.0 + 0.02) * 0.08;
    vec3 tint = mix(vec3(1.0, 0.85, 0.7), vec3(0.7, 0.85, 1.0), h);
    return present * (core + halo) * tw * tint * (0.5 + h);
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    float t = uTime * 0.018;
    vec2 cam = vec2(t * 0.6, t * 0.25) + uTilt * 0.05;
    vec2 q = p * 1.5 + cam;

    // Domain-warped clouds.
    vec2 w1 = vec2(fbm4(q + vec2(0.0, t)), fbm4(q + vec2(5.2, 1.3) - t * 0.5));
    vec2 w2 = vec2(fbm4(q + 3.0 * w1 + vec2(1.7, 9.2)), fbm4(q + 3.0 * w1 + vec2(8.3, 2.8)));
    float f = fbm(q + 2.5 * w2);

    // uC1 = deep gas, uC2 = secondary clouds, uC3 = hot glowing gas
    vec3 col = mix(vec3(0.003, 0.005, 0.016), uC1, smoothstep(0.2, 0.7, f));
    col = mix(col, uC2, smoothstep(0.5, 1.0, length(w2) * 0.85) * 0.75);
    col += uC3 * pow(smoothstep(0.5, 1.0, f), 3.0) * 1.4;
    col += vec3(1.0, 0.5, 0.3) * pow(smoothstep(0.62, 1.0, f * w1.x * 1.6), 4.0) * 0.8;

    // Dark dust lanes.
    col *= 0.45 + 0.55 * smoothstep(0.25, 0.62, fbm4(q * 2.2 - w1 * 1.5));

    // Three layers of stars moving at different depths (parallax).
    col += stars(p + cam * 0.20, 70.0, 0.90, 1.0) * 0.6;
    col += stars(p + cam * 0.45, 40.0, 0.93, 7.0) * 0.9;
    col += stars(p + cam * 0.80, 22.0, 0.965, 13.0) * 1.3;

    // A bright foreground star with diffraction spikes.
    vec2 sp = p - vec2(0.12, 0.27) + cam * 0.05;
    float sd = length(sp);
    float spikes = (0.0009 / (abs(sp.x) * 40.0 + 0.002) + 0.0009 / (abs(sp.y) * 40.0 + 0.002)) * exp(-sd * 14.0);
    col += vec3(0.75, 0.9, 1.0) * (0.002 / (sd * sd + 0.0004) * 0.05 + spikes * 0.6) * (0.85 + 0.15 * sin(uTime * 1.3));

    col *= 1.0 - 0.45 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.25)), 1.0);
}
