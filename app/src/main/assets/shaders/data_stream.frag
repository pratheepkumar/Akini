// Data Stream — cascading glyphs of code at three depths.

float glyph(vec2 uv, float seed) {
    // 5x7 pixel glyph built from random bits, mirrored for a "character" look
    vec2 g = floor(uv * vec2(5.0, 7.0));
    g.x = min(g.x, 4.0 - g.x);
    float bit = step(0.55, hash12(g + seed * 13.7));
    vec2 f = fract(uv * vec2(5.0, 7.0));
    float dotShape = step(0.12, f.x) * step(f.x, 0.88) * step(0.1, f.y) * step(f.y, 0.9);
    return bit * dotShape;
}

vec3 layer(vec2 p, float scale, float speed, float bright, float seed) {
    vec2 cs = vec2(1.0, 1.35) / scale;               // cell size
    float colId = floor(p.x / cs.x);
    float h = hash12(vec2(colId, seed));
    if (h < 0.35) return vec3(0.0);                   // some empty columns
    float rows = p.y / cs.y;
    float rowId = floor(rows);
    vec2 cuv = vec2(fract(p.x / cs.x), fract(rows));
    cuv = (cuv - 0.5) * 1.15 + 0.5;
    if (cuv.x < 0.0 || cuv.x > 1.0 || cuv.y < 0.0 || cuv.y > 1.0) return vec3(0.0);

    float spd = speed * (0.6 + h * 0.9);
    float len = 10.0 + 22.0 * hash12(vec2(colId, seed + 1.0));
    float v = fract(-(rowId + uTime * spd) / len + h * 7.0);
    float trail = pow(v, 4.0);
    float head = smoothstep(0.965, 1.0, v);

    float change = floor(uTime * (2.0 + 6.0 * hash12(vec2(colId, rowId))) );
    float gseed = hash12(vec2(colId, rowId) + change * 0.13 * step(0.6, hash12(vec2(rowId, colId))));
    float gl = glyph(cuv, gseed + seed);

    // uC1 = old glyphs, uC2 = fresh glyphs, uC3 = leading glyph
    vec3 c = mix(uC1, uC2, trail);
    c = mix(c, uC3, head);
    return c * gl * (trail * 0.9 + head * 1.8) * bright;
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    vec3 col = vec3(0.0, 0.006, 0.015);
    col += uC1 * 0.08 * (1.0 - length(vUv - vec2(0.5, 0.6)));

    col += layer(p + vec2(uTilt.x * 0.01, 0.0) + 3.1, 95.0, 6.0, 0.35, 1.0);
    col += layer(p + vec2(uTilt.x * 0.025, 0.0) + 7.7, 55.0, 8.0, 0.7, 2.0);
    col += layer(p + vec2(uTilt.x * 0.05, 0.0), 32.0, 10.0, 1.15, 3.0);

    // Slow horizontal scan bar.
    float scanY = fract(uTime * 0.05) * 1.4 - 0.2;
    col += uC2 * exp(-pow((vUv.y - scanY) * 30.0, 2.0)) * 0.08;
    // CRT-style fine lines and vignette.
    col *= 0.88 + 0.12 * sin(gl_FragCoord.y * 2.0);
    col *= 1.0 - 0.55 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.3)), 1.0);
}
