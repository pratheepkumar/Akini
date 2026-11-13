// Akini — shared shader header (GLSL ES 1.00 / OpenGL ES 2.0)
// Prepended to every scene shader at load time.
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;    // render target size in pixels
uniform float uTime;   // seconds of animation
uniform vec2  uTilt;   // device tilt / home-screen scroll, roughly -1..1
uniform vec4  uTouch;  // xy = last touch (0..1, y up), z = seconds since touch, w = 1 if enabled
varying vec2  vUv;     // 0..1 across the screen

// Per-scene settings from scenes.json, so one shader can power several designs.
uniform vec4  uP;      // free parameters
uniform vec3  uC1;     // colour 1
uniform vec3  uC2;     // colour 2
uniform vec3  uC3;     // colour 3
uniform sampler2D uGlyph; // symbol texture: r = sharp, g = soft glow, b = wide glow

const float PI  = 3.14159265;
const float TAU = 6.28318531;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++) {
        v += a * vnoise(p);
        p = m * p;
        a *= 0.5;
    }
    return v;
}

float fbm4(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 4; i++) {
        v += a * vnoise(p);
        p = m * p;
        a *= 0.5;
    }
    return v;
}

mat2 rot2(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, s, -s, c);
}

// ---------------------------------------------------------------- shapes (signed distance)

float sdCircle(vec2 p, float r) { return length(p) - r; }

float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdRoundBox(vec2 p, vec2 b, float r) { return sdBox(p, b - r) - r; }

float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

// Isosceles triangle with its tip at the origin, half-width q.x, height q.y (pointing up).
float sdTriIso(vec2 p, vec2 q) {
    p.y = -p.y;
    p.x = abs(p.x);
    vec2 a = p - q * clamp(dot(p, q) / dot(q, q), 0.0, 1.0);
    vec2 b = p - q * vec2(clamp(p.x / q.x, 0.0, 1.0), 1.0);
    float s = -sign(q.y);
    vec2 d = min(vec2(dot(a, a), s * (p.x * q.y - p.y * q.x)), vec2(dot(b, b), s * (p.y - q.y)));
    return -sqrt(d.x) * sign(d.y);
}

float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// Anti-aliased fill of a distance field measured in screen-height units.
float fillAA(float d) {
    float w = 1.5 / uRes.y;
    return 1.0 - smoothstep(-w, w, d);
}

// Cosine colour palette (Inigo Quilez).
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(TAU * (c * t + d));
}

// One layer of twinkling stars.
vec3 starLayer(vec2 p, float scale, float density, float seed) {
    vec2 g = p * scale + seed;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float present = step(density, hash12(id + seed));
    vec2 off = (hash22(id + seed * 1.7) - 0.5) * 0.75;
    float h = hash12(id + seed * 2.3);
    float d = length(f - off);
    float tw = 0.6 + 0.4 * sin(uTime * (0.7 + 2.0 * h) + h * 50.0);
    float core = smoothstep(0.08, 0.0, d);
    vec3 tint = mix(vec3(1.0, 0.85, 0.7), vec3(0.7, 0.85, 1.0), h);
    return present * core * tw * tint * (0.4 + h);
}

// Old-film look: sepia, grain, flicker, scratches, dust and vignette (amount 0..1).
vec3 filmLook(vec3 col, float amount) {
    float frame = floor(uTime * 16.0);
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    vec3 sepia = vec3(l) * vec3(1.08, 0.92, 0.70) + vec3(0.03, 0.02, 0.0);
    col = mix(col, sepia, amount * 0.85);
    col *= 1.0 - amount * 0.07 * hash12(vec2(frame, 3.1));
    col += (hash12(gl_FragCoord.xy * 0.73 + frame * 17.0) - 0.5) * 0.10 * amount;
    float sx = hash12(vec2(frame, 7.0));
    float scratch = step(0.55, hash12(vec2(frame, 9.0))) * smoothstep(0.0025, 0.0, abs(vUv.x - sx));
    col = mix(col, vec3(0.92, 0.86, 0.74), scratch * 0.3 * amount);
    vec2 dg = floor(vUv * vec2(70.0, 150.0));
    float dust = step(0.9988, hash12(dg + frame * 3.0));
    col = mix(col, vec3(0.08, 0.06, 0.05), dust * 0.7 * amount);
    vec2 v = vUv - 0.5;
    col *= 1.0 - amount * 1.1 * dot(v, v);
    return col;
}

// Filmic tone map (ACES approximation) followed by gamma.
vec3 tonemap(vec3 x) {
    x = clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
    return pow(x, vec3(0.4545));
}

// Shockwave ring where the user last touched the screen.
vec3 touchRing() {
    if (uTouch.w < 0.5 || uTouch.z > 3.0) return vec3(0.0);
    float aspect = uRes.x / uRes.y;
    vec2 d2 = (vUv - uTouch.xy) * vec2(aspect, 1.0);
    float d = length(d2);
    float t = uTouch.z;
    float r = t * 0.55;
    float ring = exp(-pow((d - r) * 45.0, 2.0)) * exp(-t * 2.2);
    float inner = exp(-pow((d - r * 0.7) * 70.0, 2.0)) * exp(-t * 3.0) * 0.5;
    return vec3(0.35, 0.85, 1.0) * (ring + inner) * 1.3;
}

// Final touch: interaction ring + dithering to stop banding on dark gradients.
vec3 finish(vec3 c) {
    c += touchRing();
    c += (hash12(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) / 255.0;
    return c;
}
