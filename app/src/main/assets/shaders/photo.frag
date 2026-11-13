// My Photo — animates a picture chosen by the user.
uniform sampler2D uTex;
uniform vec2  uTexSize;   // photo size in pixels
uniform float uMotion;    // 0 = still, 1 = drift, 2 = tilt parallax
uniform float uOverlay;   // 0 none, 1 particles, 2 holo sweep, 3 glitch, 4 edge scan, 5 vintage film

vec2 photoUV(vec2 uv, float zoom, vec2 pan) {
    float sa = uRes.x / uRes.y;
    float ta = uTexSize.x / max(uTexSize.y, 1.0);
    // "cover" fit: fill the screen, crop what doesn't fit
    vec2 s = mix(vec2(sa / ta, 1.0), vec2(1.0, ta / sa), step(ta, sa));
    vec2 c = (uv - 0.5) * s / zoom + 0.5 + pan;
    return vec2(c.x, 1.0 - c.y);           // bitmap rows run top-down
}

vec3 sampleTex(vec2 t) {
    return texture2D(uTex, clamp(t, 0.001, 0.999)).rgb;
}

vec3 particles(vec2 p) {
    vec3 acc = vec3(0.0);
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float sc = 9.0 + fi * 7.0;
        vec2 q = p * sc + vec2(0.0, -uTime * (0.25 + fi * 0.12)) + fi * 9.1;
        q.x += sin(q.y * 0.6 + uTime * 0.4 + fi) * 0.25;
        vec2 id = floor(q);
        vec2 f = fract(q) - 0.5;
        float h = hash12(id + fi * 3.3);
        if (h > 0.55) {
            vec2 off = (hash22(id) - 0.5) * 0.6;
            float d = length(f - off);
            float size = 0.06 + 0.12 * hash12(id + 7.0) / (1.0 + fi * 0.5);
            float tw = 0.6 + 0.4 * sin(uTime * 2.0 + h * 30.0);
            float glow = smoothstep(size, 0.0, d) + 0.25 * smoothstep(size * 3.0, 0.0, d);
            vec3 c = mix(vec3(1.0, 0.75, 0.45), vec3(0.45, 0.9, 1.0), hash12(id + 2.0));
            acc += c * glow * tw * (0.35 + 0.25 * fi);
        }
    }
    return acc;
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    float t = uTime;
    float zoom = 1.12;
    vec2 pan = vec2(0.0);
    if (uMotion > 0.5 && uMotion < 1.5) {
        zoom = 1.13 + 0.04 * sin(t * 0.07);
        pan = vec2(sin(t * 0.045), cos(t * 0.033)) * 0.028;
    } else if (uMotion > 1.5) {
        zoom = 1.13;
        pan = vec2(-uTilt.x, uTilt.y) * 0.035;
    }

    vec2 uv = vUv;
    vec3 col;

    if (uOverlay > 2.5 && uOverlay < 3.5) {
        // Cyber glitch: occasional bursts of displaced slices + RGB split.
        float burst = step(0.92, hash12(vec2(floor(t * 2.0), 1.0)));
        float slice = floor(uv.y * 40.0);
        float shift = (hash12(vec2(slice, floor(t * 12.0))) - 0.5) * 0.06 * burst * step(0.6, hash12(vec2(slice, 3.0)));
        uv.x += shift;
        float split = 0.0015 + 0.006 * burst;
        vec2 tc = photoUV(uv, zoom, pan);
        col.r = sampleTex(tc + vec2(split, 0.0)).r;
        col.g = sampleTex(tc).g;
        col.b = sampleTex(tc - vec2(split, 0.0)).b;
        col *= 0.9 + 0.1 * sin(gl_FragCoord.y * 1.5);
        col = mix(col, col * vec3(0.8, 1.0, 1.15), 0.3);
    } else {
        col = sampleTex(photoUV(uv, zoom, pan));
    }

    if (uOverlay > 0.5 && uOverlay < 1.5) {
        col += particles(p);
    } else if (uOverlay > 1.5 && uOverlay < 2.5) {
        // Holographic light sweep every few seconds.
        float cycle = fract(t / 7.0);
        float pos = mix(-0.9, 0.9, cycle);
        float band = exp(-pow((dot(p, normalize(vec2(1.0, 0.6))) - pos) * 9.0, 2.0));
        vec3 irid = 0.5 + 0.5 * cos(TAU * (vec3(0.0, 0.33, 0.67) + p.x * 1.5 + p.y + t * 0.1));
        col += irid * band * 0.35;
        col += vec3(1.0) * pow(band, 8.0) * 0.25;
    } else if (uOverlay > 4.5) {
        // Vintage film: sepia, grain, flicker, scratches
        col = filmLook(col, 0.9);
    } else if (uOverlay > 3.5) {
        // Edge scan: outlines glow as a scanning wave passes.
        vec2 tc = photoUV(uv, zoom, pan);
        vec2 px = 1.5 / uTexSize;
        float l = dot(sampleTex(tc - vec2(px.x, 0.0)), vec3(0.299, 0.587, 0.114));
        float r = dot(sampleTex(tc + vec2(px.x, 0.0)), vec3(0.299, 0.587, 0.114));
        float d = dot(sampleTex(tc - vec2(0.0, px.y)), vec3(0.299, 0.587, 0.114));
        float u = dot(sampleTex(tc + vec2(0.0, px.y)), vec3(0.299, 0.587, 0.114));
        float edge = clamp(length(vec2(r - l, u - d)) * 4.0, 0.0, 1.0);
        float wave = fract(t * 0.12);
        float front = exp(-pow((vUv.y - wave) * 12.0, 2.0));
        col = mix(col * 0.75, col, 0.4 + 0.6 * smoothstep(0.0, 0.2, wave - vUv.y + 0.2));
        col += vec3(0.2, 0.85, 1.0) * edge * (0.25 + front * 2.0);
        col += vec3(0.2, 0.85, 1.0) * front * 0.06;
    }

    // gentle vignette keeps icons readable
    col *= 1.0 - 0.35 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(col), 1.0);
}
