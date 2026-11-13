// Sacred Symbol — a glowing symbol (from the scene's glyph) inside turning mandala rings,
// with motes of light rising around it. uC1 = symbol, uC2 = glow, uC3 = background.

float petalRing(vec2 p, float r, float count, float width, float spin) {
    float a = atan(p.y, p.x) + spin;
    float l = length(p);
    float petal = abs(fract(a / TAU * count) - 0.5) * 2.0;     // 0 at petal centre
    float shape = r + width * (1.0 - petal * petal);
    return abs(l - shape);
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p -= uTilt * 0.015;
    vec2 q = p - vec2(0.0, 0.04);
    float r = length(q);
    vec3 col = mix(uC3 * 0.35, uC3 * 0.08, smoothstep(0.0, 0.6, r));

    // mandala rings turning in opposite directions
    float px = 1.5 / uRes.y;
    float m = 0.0;
    m += smoothstep(px * 2.0, 0.0, petalRing(q, 0.20, 16.0, 0.025, uTime * 0.03));
    m += smoothstep(px * 2.0, 0.0, petalRing(q, 0.26, 24.0, 0.02, -uTime * 0.02)) * 0.8;
    m += smoothstep(px * 2.0, 0.0, abs(r - 0.30)) * 0.6;
    m += smoothstep(px * 2.0, 0.0, petalRing(q, 0.33, 32.0, 0.018, uTime * 0.015)) * 0.6;
    float dots = smoothstep(0.004, 0.002, length(vec2(fract((atan(q.y, q.x) - uTime * 0.02) / TAU * 48.0) - 0.5, (r - 0.37) * 48.0 / TAU / 0.37 * 0.5)) * 0.05) ;
    m += step(abs(r - 0.37), 0.004) * step(0.5, fract((atan(q.y, q.x) - uTime * 0.02) / TAU * 48.0)) * 0.6;
    col += uC1 * m * 0.45 * (0.8 + 0.2 * sin(uTime * 0.8));
    // soft rays behind the symbol
    float rays = pow(0.5 + 0.5 * cos(atan(q.y, q.x) * 12.0 + uTime * 0.1), 8.0);
    col += uC2 * rays * exp(-r * 4.0) * 0.25;

    // the symbol: sharp shape plus two blurred copies for the glow
    vec2 gp = q / 0.30 + 0.5;
    vec3 g = texture2D(uGlyph, vec2(gp.x, 1.0 - gp.y)).rgb;
    float inBox = step(0.0, gp.x) * step(gp.x, 1.0) * step(0.0, gp.y) * step(gp.y, 1.0);
    g *= inBox;
    float breathe = 0.85 + 0.15 * sin(uTime * 0.9);
    col += uC2 * g.b * 0.9 * breathe;
    col += uC2 * g.g * 0.8 * breathe;
    vec3 symbol = mix(uC1, vec3(1.0, 0.97, 0.85), 0.35 * smoothstep(0.3, -0.2, q.y));
    // a shimmer that travels across the symbol
    float shimmer = exp(-pow(q.x + q.y * 0.5 - (fract(uTime * 0.12) * 1.2 - 0.6), 2.0) * 60.0);
    col = mix(col, symbol * (1.0 + shimmer * 0.8), g.r);

    // motes of light drifting upward
    vec2 mq = p * vec2(14.0, 7.0) + vec2(0.0, -uTime * 0.25);
    vec2 id = floor(mq);
    vec2 f = fract(mq) - 0.5 - (hash22(id) - 0.5) * 0.6;
    float mote = step(0.75, hash12(id)) * smoothstep(0.08, 0.0, length(f)) * (0.5 + 0.5 * sin(uTime * 2.0 + hash12(id) * 20.0));
    col += uC2 * mote * 0.7;

    col *= 1.0 - 0.45 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.2)), 1.0);
}
