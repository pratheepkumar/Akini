// Planet — uP.x: 0 = ringed gas giant, 1 = blue planet with clouds and city lights.
// uP.y = ring tilt, uP.z = planet radius, uP.w = vertical position.
// uC1 / uC2 = surface colours, uC3 = atmosphere.

float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
}

float vnoise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), f.x),
                   mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x),
                   mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}

float fbm3(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
        v += a * vnoise3(p);
        p = p * 2.03 + 1.7;
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    vec2 sp = p + uTilt * 0.01;
    vec3 col = vec3(0.002, 0.003, 0.01);
    col += starLayer(sp * 0.9, 100.0, 0.93, 3.0) * 0.5 + starLayer(sp * 0.9, 40.0, 0.965, 7.0) * 0.9;

    float R = uP.z;
    vec2 c = vec2(0.0, uP.w);
    vec2 q = p - c;
    float r = length(q);
    vec3 L = normalize(vec3(-0.6, 0.45, 0.65));
    bool ringed = uP.x < 0.5;

    // rings (drawn behind the planet first, then in front)
    float tilt = uP.y;
    vec2 rq = rot2(-0.35) * q;
    float rr = length(vec2(rq.x, rq.y / tilt));
    float ringBand = 0.0;
    vec3 ringCol = vec3(0.0);
    if (ringed) {
        float t = (rr / R - 1.25) / 1.15;
        if (t > 0.0 && t < 1.0) {
            float bands = 0.55 + 0.45 * sin(t * 60.0 + sin(t * 23.0) * 2.0) * (0.6 + 0.4 * sin(t * 140.0));
            float gap = smoothstep(0.03, 0.0, abs(t - 0.62)) ;   // the big division
            ringBand = bands * (1.0 - gap * 0.9) * smoothstep(0.0, 0.05, t) * smoothstep(1.0, 0.92, t);
            ringCol = mix(uC1, uC2, t) * ringBand;
            // shadow of the planet falling on the ring
            vec2 sdir = normalize(vec2(L.x, L.y));
            float along = dot(q, -sdir);
            float perp = abs(dot(q, vec2(-sdir.y, sdir.x)));
            if (along > 0.0 && perp < R) ringCol *= 0.15;
        }
        if (rq.y > 0.0) col += ringCol * 0.9;       // back half
    }

    if (r < R) {
        float z = sqrt(R * R - r * r);
        vec3 n = normalize(vec3(q, z));
        float spin = uTime * 0.01;
        vec3 nr = vec3(n.x * cos(spin) - n.z * sin(spin), n.y, n.x * sin(spin) + n.z * cos(spin));
        float diff = max(dot(n, L), 0.0);
        float term = smoothstep(-0.05, 0.25, dot(n, L));
        vec3 surf;
        if (ringed) {
            float lat = nr.y;
            float bands = sin(lat * 26.0 + fbm3(nr * 3.0) * 3.0) * 0.5 + 0.5;
            surf = mix(uC1, uC2, bands * 0.8);
            surf *= 0.85 + 0.3 * fbm3(nr * vec3(2.0, 18.0, 2.0) + uTime * 0.01);
            // ring shadow bands across the globe
            float rs = abs(n.y * 1.0 + n.x * 0.35 - 0.12);
            surf *= 0.6 + 0.4 * smoothstep(0.0, 0.06, rs);
            col = surf * (diff * 1.3 + 0.02);
        } else {
            float land = smoothstep(0.52, 0.56, fbm3(nr * 2.2 + 3.0));
            float ice = smoothstep(0.82, 0.9, abs(nr.y));
            vec3 ocean = uC2 * (0.6 + 0.4 * fbm3(nr * 8.0));
            vec3 ground = mix(uC1, uC1 * vec3(1.3, 1.1, 0.7), fbm3(nr * 9.0));
            surf = mix(ocean, ground, land);
            surf = mix(surf, vec3(0.9), ice);
            float clouds = smoothstep(0.5, 0.75, fbm3(nr * 3.5 + vec3(uTime * 0.004, 0.0, 0.0)));
            surf = mix(surf, vec3(1.0), clouds * 0.85);
            vec3 day = surf * (diff * 1.25 + 0.01);
            // sun glint on the ocean
            vec3 h = normalize(L + vec3(0.0, 0.0, 1.0));
            day += vec3(1.0, 0.9, 0.7) * pow(max(dot(n, h), 0.0), 140.0) * (1.0 - land) * (1.0 - clouds) * 0.25;
            // city lights on the night side
            float cities = smoothstep(0.62, 0.8, fbm3(nr * 18.0)) * land * (1.0 - clouds);
            vec3 night = vec3(1.0, 0.7, 0.35) * cities * 0.8 * (1.0 - term);
            col = day + night;
        }
        // atmosphere at the limb
        float rim = pow(1.0 - n.z, 3.0);
        col += uC3 * rim * (0.25 + 1.5 * term) * 0.9;
        col *= smoothstep(R, R - 0.002, r);
    }
    // atmosphere halo outside the disc
    float halo = exp(-max(r - R, 0.0) * 60.0) * step(R, r);
    vec2 ld = normalize(vec2(L.x, L.y));
    col += uC3 * halo * (0.25 + 0.75 * smoothstep(-0.2, 0.8, dot(normalize(q), ld))) * 0.7;

    if (ringed && rq.y <= 0.0) col = mix(col, col * 0.3 + ringCol, smoothstep(0.0, 0.2, ringBand));   // front half

    col *= 1.0 - 0.35 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.2)), 1.0);
}
