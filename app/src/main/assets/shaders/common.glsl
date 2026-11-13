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
