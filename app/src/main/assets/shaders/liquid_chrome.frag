// Liquid Chrome — flowing liquid metal lit by studio softboxes.

float smoothNoise(vec2 p) {
    // three soft octaves: big, glossy undulations instead of fine detail
    float v = 0.5 * vnoise(p);
    v += 0.25 * vnoise(p * 2.03 + 7.1);
    v += 0.125 * vnoise(p * 4.01 + 3.3);
    return v / 0.875;
}

float height(vec2 p) {
    float t = uTime * 0.08;
    vec2 q = vec2(smoothNoise(p + vec2(0.0, t)), smoothNoise(p + vec2(5.2, -t * 0.8)));
    return smoothNoise(p + 1.6 * q + vec2(t * 0.3, 0.0));
}

vec3 envMap(vec3 r) {
    // Classic chrome: bright sky above a sharp horizon, dark ground below.
    float y = r.y + 0.08 * sin(r.x * 3.0);
    vec3 sky = mix(vec3(0.95, 0.97, 1.0), vec3(0.25, 0.42, 0.62), smoothstep(0.0, 0.9, y));
    vec3 ground = mix(vec3(0.10, 0.09, 0.08), vec3(0.01, 0.01, 0.015), smoothstep(0.0, -0.6, y));
    vec3 c = mix(ground, sky, smoothstep(-0.015, 0.015, y));
    // cyan studio strip and a warm accent
    c += vec3(0.2, 0.8, 1.0) * 1.2 * smoothstep(0.05, 0.0, abs(r.x + 0.45)) * smoothstep(0.8, 0.1, abs(y - 0.2));
    c += vec3(1.0, 0.45, 0.7) * 0.6 * smoothstep(0.05, 0.0, abs(r.x - 0.55)) * smoothstep(0.8, 0.1, abs(y + 0.2));
    return c;
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    vec2 uv = p * 1.8 + uTilt * 0.06;
    float e = 0.01;
    float h = height(uv);
    float hx = height(uv + vec2(e, 0.0));
    float hy = height(uv + vec2(0.0, e));
    float bump = 0.7;
    vec3 n = normalize(vec3((h - hx) / e * bump, (h - hy) / e * bump, 1.0));

    vec3 v = vec3(0.0, 0.0, 1.0);
    vec3 r = reflect(-v, n);
    r.xy += uTilt * 0.08;                     // the room "moves" as you tilt the phone
    vec3 env = envMap(r);

    float ndv = max(dot(n, v), 0.0);
    float fres = pow(1.0 - ndv, 4.0);
    vec3 metal = vec3(0.78, 0.80, 0.84);
    vec3 col = env * mix(metal, vec3(1.0), fres);

    // thin-film iridescence in the valleys
    float film = smoothstep(0.35, 0.75, h);
    vec3 irid = 0.5 + 0.5 * cos(TAU * (vec3(0.0, 0.33, 0.67) + h * 2.5 + uTime * 0.02));
    col = mix(col, col * irid * 1.3, film * 0.18);

    // tight specular highlight
    vec3 l = normalize(vec3(-0.4, 0.6, 0.7));
    float spec = pow(max(dot(reflect(-l, n), v), 0.0), 60.0);
    col += vec3(1.0) * spec * 1.2;

    // ambient occlusion in the troughs
    col *= 0.7 + 0.3 * smoothstep(0.2, 0.7, h);
    col *= 1.0 - 0.4 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.1)), 1.0);
}
