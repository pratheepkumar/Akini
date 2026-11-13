// Stained Glass — a cathedral window aglow, its colours falling as beams into the nave.

vec2 voronoi(vec2 x, out vec2 cellId) {
    vec2 n = floor(x);
    vec2 f = fract(x);
    float d1 = 8.0;
    float d2 = 8.0;
    cellId = n;
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = hash22(n + g);
            vec2 r = g + o - f;
            float d = dot(r, r);
            if (d < d1) { d2 = d1; d1 = d; cellId = n + g; } else if (d < d2) { d2 = d; }
        }
    }
    return vec2(sqrt(d1), sqrt(d2));
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p.x += uTilt.x * 0.01;
    vec3 col = vec3(0.012, 0.01, 0.012);
    // stone wall texture
    col *= 0.7 + 0.6 * fbm4(p * 30.0);

    // Gothic pointed arch window
    vec2 w = p - vec2(0.0, 0.12);
    float hw = 0.15;
    float R = 2.0 * hw;
    float vesica = max(length(w - vec2(hw - R, 0.0)) - R, length(w - vec2(R - hw, 0.0)) - R);
    float archTop = max(vesica, -w.y);
    float window = min(archTop, sdBox(w - vec2(0.0, -0.16), vec2(hw, 0.16)));
    float inside = fillAA(window);
    // a rose of petals in the arch, mosaic below
    vec2 rose = w - vec2(0.0, 0.11);
    float rr = length(rose);
    float ra = atan(rose.y, rose.x);
    vec2 cid;
    vec2 v = voronoi(w * 18.0, cid);
    float h = hash12(cid);
    vec3 glass = h < 0.25 ? uC1 : (h < 0.5 ? uC2 : (h < 0.75 ? uC3 : mix(uC1, uC3, 0.5)));
    if (rr < 0.09) {
        float petal = fract(ra / TAU * 12.0);
        glass = mix(uC3, uC1, step(0.5, petal));
        glass = mix(glass, uC2, step(rr, 0.035));
        v.y = v.x + min(abs(petal - 0.5) * rr * 40.0, abs(rr - 0.035) * 40.0) + min(abs(rr - 0.09) * 40.0, 1.0);
    }
    // a simple crossD at the heart of the rose
    float crossD = min(sdBox(rose, vec2(0.004, 0.022)), sdBox(rose - vec2(0.0, 0.006), vec2(0.015, 0.004)));
    glass = mix(glass, vec3(1.0, 0.92, 0.6), fillAA(crossD));
    // sunlight behind the window moves gently
    float sun = 0.6 + 0.6 * exp(-length(w - vec2(0.05 * sin(uTime * 0.1), 0.12)) * 3.0);
    vec3 lit = glass * sun * (0.8 + 0.2 * vnoise(w * 120.0));
    float lead = smoothstep(0.05, 0.02, v.y - v.x);
    lit = mix(lit, vec3(0.02), lead);
    // stone mullions
    float mull = step(abs(w.x), 0.004) * step(w.y, 0.0) + step(abs(abs(w.x) - 0.075), 0.003) * step(w.y, -0.02);
    lit = mix(lit, vec3(0.05, 0.045, 0.04), clamp(mull, 0.0, 1.0));
    col = mix(col, lit * 1.4, inside);
    col += mix(uC1, uC3, 0.5) * exp(-abs(window) * 60.0) * 0.15;

    // coloured light beams falling down-right into the hazy nave
    vec2 bd = p - vec2(0.0, 0.0);
    float beamCoord = bd.x - (0.14 - p.y) * 0.45;
    float beamMask = smoothstep(0.16, 0.06, abs(beamCoord)) * step(p.y, -0.04) * smoothstep(-0.6, -0.1, p.y);
    float bt = beamCoord / 0.16 * 0.5 + 0.5;
    vec3 beamCol = mix(mix(uC1, uC3, smoothstep(0.0, 0.5, bt)), uC2, smoothstep(0.5, 1.0, bt));
    float dust = 0.5 + 0.5 * fbm4(p * 8.0 + vec2(uTime * 0.05, uTime * 0.02));
    col += beamCol * beamMask * dust * 0.12;
    // pool of coloured light on the floor
    float floorY = -0.42;
    float pool = exp(-pow((p.y - floorY) * 12.0, 2.0)) * smoothstep(0.2, 0.05, abs(p.x - 0.12));
    col += beamCol * pool * 0.12;
    col *= 1.0 - 0.4 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.1)), 1.0);
}
