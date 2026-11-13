// Holo Core — a pulsing energy core inside rotating holographic HUD rings.

const vec3 CYAN = vec3(0.25, 0.9, 1.0);
const vec3 AMBER = vec3(1.0, 0.62, 0.18);

// 0..1 around the circle, starting at +x, counter-clockwise
float turn(vec2 p) {
    return atan(p.y, p.x) / TAU + 0.5;
}

float ringBand(float r, float radius, float width, float px) {
    return smoothstep(width + px, width, abs(r - radius));
}

// count = number of segments (whole number keeps it seamless), duty = lit fraction
float segments(float u, float count, float duty, float spin) {
    float f = fract((u + spin) * count);
    return step(f, duty);
}

float hexEdge(vec2 p) {
    vec2 s = vec2(1.0, 1.7320508);
    vec2 a = mod(p, s) - s * 0.5;
    vec2 b = mod(p - s * 0.5, s) - s * 0.5;
    vec2 g = dot(a, a) < dot(b, b) ? a : b;
    vec2 ag = abs(g);
    float d = max(dot(ag, s * 0.5), ag.x);
    return 0.5 - d;
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p -= uTilt * 0.015;
    float px = 1.5 / uRes.y;
    float r = length(p);
    float u = turn(p);
    float t = uTime;
    vec3 col = vec3(0.004, 0.01, 0.02);

    // Hex lattice in the background, with cells lighting up.
    vec2 hp = p * 22.0 + vec2(0.0, t * 0.05);
    float he = hexEdge(hp);
    vec2 hid = floor(hp * 0.5);
    float lit = pow(0.5 + 0.5 * sin(t * 0.7 + hash12(hid) * 40.0), 12.0);
    col += CYAN * smoothstep(0.06, 0.0, he) * 0.05;
    col += CYAN * smoothstep(0.5, 0.1, he) * lit * 0.06 * smoothstep(0.6, 0.15, r);

    // Energy core: a noisy plasma sphere.
    float R = 0.075 * (1.0 + 0.03 * sin(t * 2.0));
    if (r < R) {
        float z = sqrt(1.0 - (r / R) * (r / R));
        vec2 sp = p / R / (1.0 + z);
        float n = fbm4(sp * 3.0 + vec2(t * 0.35, -t * 0.2));
        float n2 = fbm4(sp * 6.0 - vec2(t * 0.5, t * 0.15) + n);
        float plasma = pow(n2, 2.0) * 2.2;
        col = mix(vec3(0.02, 0.15, 0.3), vec3(0.6, 1.0, 1.0), plasma) * (0.5 + 0.8 * z);
        col += vec3(0.9, 1.0, 1.0) * pow(z, 6.0) * 0.6;
    }
    // core glow
    col += CYAN * 0.006 / (abs(r - R) + 0.006) * 0.35;
    col += CYAN * exp(-r * 9.0) * 0.25;

    // Ring 1: thin solid ring with rotating gaps
    col += CYAN * ringBand(r, 0.115, 0.0015, px) * segments(u, 3.0, 0.8, t * 0.06) * 0.9;
    // Ring 2: fine tick marks
    float ticks = segments(u, 120.0, 0.25, -t * 0.01);
    float major = segments(u, 12.0, 0.04, -t * 0.01);
    col += CYAN * ringBand(r, 0.145, 0.006, px) * max(ticks * 0.45, major) * 0.9;
    // Ring 3: thick segmented band, counter-rotating
    col += CYAN * ringBand(r, 0.185, 0.008, px) * segments(u, 24.0, 0.7, -t * 0.03) * 0.35;
    col += CYAN * ringBand(r, 0.185, 0.0012, px) * 0.9;
    // Ring 4: amber arcs that sweep and grow
    float arcLen = 0.15 + 0.1 * sin(t * 0.4);
    float arcPos = fract(u - t * 0.045);
    float arc = step(arcPos, arcLen) + step(abs(arcPos - 0.5), arcLen * 0.4);
    col += AMBER * ringBand(r, 0.225, 0.003, px) * arc * 0.9;
    // Ring 5: outer dotted ring
    col += CYAN * ringBand(r, 0.26, 0.002, px) * segments(u, 180.0, 0.5, t * 0.004) * 0.5;
    // Ring 6: faint wide orbit with a tracking blip
    col += CYAN * ringBand(r, 0.32, 0.001, px) * 0.3;
    vec2 blip = 0.32 * vec2(cos(t * 0.25), sin(t * 0.25));
    float bd = length(p - blip);
    col += AMBER * (0.0005 / (bd * bd * 300.0 + 0.0005)) * 0.04 + AMBER * smoothstep(0.012, 0.009, bd) * smoothstep(0.007, 0.009, bd);

    // Radar sweep.
    float sweep = fract(u - t * 0.12);
    float beam = pow(1.0 - sweep, 10.0) * smoothstep(0.35, 0.1, r) * smoothstep(0.09, 0.13, r);
    col += CYAN * beam * 0.35;

    // Vertical data bars on the sides.
    float side = abs(p.x);
    if (side > 0.36 * uRes.x / uRes.y && side < 0.46 * uRes.x / uRes.y) {
        float bar = floor((p.y + 0.5) * 60.0);
        float level = 0.5 + 0.5 * sin(t * (0.5 + hash12(vec2(bar, 1.0)) * 2.0) + bar);
        float fill = step(side, (0.36 + 0.1 * level) * uRes.x / uRes.y);
        float gap = step(0.3, fract((p.y + 0.5) * 60.0));
        col += CYAN * fill * gap * 0.08 * smoothstep(0.45, 0.15, abs(p.y));
    }

    // Holographic scanlines and flicker.
    col *= 0.9 + 0.1 * sin(gl_FragCoord.y * 1.2 - t * 8.0);
    col *= 0.97 + 0.03 * sin(t * 37.0);
    col *= 1.0 - 0.5 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.2)), 1.0);
}
