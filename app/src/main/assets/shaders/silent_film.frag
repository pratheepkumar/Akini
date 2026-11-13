// Silent Film — a projector beam cutting through a dark picture house, the
// countdown leader flickering on the screen.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p += uTilt * 0.01;
    vec3 col = vec3(0.02, 0.018, 0.016);
    float frame = floor(uTime * 16.0);
    float flick = 0.85 + 0.15 * hash12(vec2(frame, 1.0));

    // the screen
    vec2 sc = p - vec2(0.0, 0.2);
    float screen = fillAA(sdBox(sc, vec2(0.2, 0.15)));
    vec3 picture = vec3(0.75, 0.72, 0.66) * flick;
    // countdown leader: circles, crosshair and a sweeping hand
    float r = length(sc);
    float circles = smoothstep(0.004, 0.0, abs(r - 0.11)) + smoothstep(0.004, 0.0, abs(r - 0.085));
    float crossh = smoothstep(0.003, 0.0, abs(sc.x)) + smoothstep(0.003, 0.0, abs(sc.y));
    float handA = fract(uTime * 0.5);
    float a = fract(atan(sc.x, sc.y) / TAU + 1.0);
    float sweep = step(a, handA) * step(r, 0.11);
    picture = mix(picture, picture * 0.55, sweep);
    picture = mix(picture, vec3(0.08), clamp(circles + crossh * 0.8, 0.0, 1.0));
    col = mix(col, picture, screen);
    // curtains framing the screen
    float curtain = step(0.2, abs(sc.x)) * step(abs(sc.y), 0.22);
    float folds = 0.5 + 0.5 * sin(p.x * 160.0);
    col = mix(col, uC1 * (0.15 + 0.25 * folds), curtain * smoothstep(0.42, 0.2, abs(sc.x)));

    // the projector beam from the booth at the back
    vec2 src = vec2(0.14, -0.42);
    vec2 d = p - src;
    vec2 toScreen = normalize(vec2(0.0, 0.2) - src);
    float along = dot(d, toScreen);
    float across = abs(d.x * toScreen.y - d.y * toScreen.x);
    float cone = smoothstep(along * 0.32 + 0.004, along * 0.2, across) * step(0.0, along) * step(along, 0.62);
    // dust motes drifting in the light
    vec2 dg = p * 90.0 + vec2(uTime * 0.6, sin(uTime * 0.3) * 2.0);
    float dust = step(0.97, hash12(floor(dg))) * smoothstep(0.35, 0.0, length(fract(dg) - 0.5));
    float smoke = 0.5 + 0.5 * fbm4(p * 5.0 + vec2(uTime * 0.05, -uTime * 0.03));
    col += uC2 * cone * (0.12 + 0.18 * smoke) * flick;
    col += vec3(0.9, 0.85, 0.75) * dust * cone * 0.9;
    col += uC2 * 0.0008 / (dot(d, d) + 0.0008) * flick;

    // rows of the audience in silhouette
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float y = -0.3 - fi * 0.09;
        float s = 1.0 + fi * 0.35;
        vec2 hp = vec2(fract((p.x + fi * 0.031) * 9.0 / s) - 0.5, (p.y - y) * 9.0 / s);
        float head = sdCircle(hp - vec2(0.0, 0.12), 0.2);
        float shoulders = sdRoundBox(hp - vec2(0.0, -0.3), vec2(0.42, 0.3), 0.2);
        float person = min(head, shoulders);
        col = mix(col, vec3(0.012, 0.01, 0.009), smoothstep(0.02, -0.02, person));
    }
    col = filmLook(col, 0.9);
    gl_FragColor = vec4(finish(clamp(col, 0.0, 1.0)), 1.0);
}
