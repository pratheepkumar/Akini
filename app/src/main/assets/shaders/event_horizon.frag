// Event Horizon — a black hole bending starlight, with a glowing accretion disk.

vec3 starfield(vec2 p) {
    vec3 col = vec3(0.0);
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float sc = 38.0 + fi * 31.0;
        vec2 g = p * sc + fi * 17.13;
        vec2 id = floor(g);
        vec2 f = fract(g) - 0.5;
        float present = step(0.87, hash12(id));
        vec2 off = (hash22(id + 3.7) - 0.5) * 0.7;
        float h = hash12(id + 11.1);
        float d = length(f - off);
        float tw = 0.65 + 0.35 * sin(uTime * (0.8 + h * 2.5) + h * 40.0);
        float b = present * smoothstep(0.09, 0.0, d) * tw * (0.4 + h * 1.2);
        vec3 tint = mix(vec3(1.0, 0.78, 0.55), vec3(0.6, 0.78, 1.0), h);
        col += b * tint;
    }
    return col;
}

vec3 background(vec2 p) {
    float n = fbm4(p * 2.5 + vec2(0.0, uTime * 0.004));
    float n2 = fbm4(p * 5.0 - vec2(uTime * 0.003, 0.0) + n);
    vec3 neb = mix(vec3(0.002, 0.002, 0.006), vec3(0.025, 0.012, 0.045), smoothstep(0.4, 0.9, n2));
    neb += vec3(0.005, 0.02, 0.045) * smoothstep(0.55, 0.95, n);
    return neb + starfield(p);
}

// rd = disk radius in shadow radii, a = azimuth, dop = Doppler factor
vec3 diskColor(float rd, float a, float dop) {
    float inner = 1.5;
    float outer = 5.2;
    if (rd < inner * 0.85 || rd > outer * 1.1) return vec3(0.0);
    float m = smoothstep(inner * 0.95, inner * 1.2, rd) * (1.0 - smoothstep(outer * 0.55, outer, rd));
    float w = 1.6 / pow(rd, 1.5);          // Keplerian: inner parts orbit faster
    float aa = a - uTime * w * 0.5;
    float s = 0.0;
    s += 0.50 * sin(3.0 * aa + 6.0 * vnoise(vec2(rd * 5.0, 1.0)));
    s += 0.30 * sin(7.0 * aa + 6.0 * vnoise(vec2(rd * 11.0, 2.0)));
    s += 0.20 * sin(13.0 * aa + 6.0 * vnoise(vec2(rd * 23.0, 3.0)));
    float grain = vnoise(vec2(rd * 45.0, 4.0));
    float b = m * (0.55 + 0.45 * s) * (0.65 + 0.5 * grain);
    float temp = clamp(1.0 - (rd - inner) / (outer - inner), 0.0, 1.0);
    vec3 hot = vec3(1.0, 0.93, 0.82);
    vec3 warm = vec3(1.0, 0.52, 0.16);
    vec3 cool = vec3(0.55, 0.14, 0.04);
    vec3 c = mix(cool, mix(warm, hot, smoothstep(0.55, 1.0, temp)), smoothstep(0.0, 0.6, temp));
    b *= dop * dop * dop;                  // relativistic beaming
    c = mix(c, c * vec3(0.85, 0.95, 1.25), clamp(dop - 1.0, 0.0, 1.0));
    return c * b * (1.2 + 2.6 * temp * temp);
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p += uTilt * 0.02;
    float S = 0.065;                        // shadow radius
    vec2 q = p - vec2(0.0, 0.05);
    q = rot2(-0.12) * q;                    // tilt the whole system slightly
    float r = length(q);

    // Background seen through a gravitational lens.
    float E = S * 1.45;
    vec2 src = q * (1.0 - (E * E) / (r * r + 1e-5));
    vec3 col = background(src + vec2(uTime * 0.003, 0.0));

    float shadow = smoothstep(S * 0.97, S * 1.03, r);
    col *= shadow;

    // Primary image of the disk (seen nearly edge-on).
    float cosI = 0.17;
    vec2 d = vec2(q.x, q.y / cosI);
    float dl = length(d);
    float rd = dl / S;
    float a = atan(d.y, d.x);
    float dop = 1.0 - 0.33 * (d.x / (dl + 1e-4));
    vec3 disk = diskColor(rd, a, dop);
    float behind = step(0.0, d.y);
    col += disk * mix(1.0, shadow, behind);

    // Lensed image of the far side of the disk, wrapped around the shadow.
    float phi = atan(q.y, q.x);
    float rl = r / S;
    float rdl = 1.5 + (rl - 1.06) * 5.5;
    float wrap = mix(0.22, 1.0, smoothstep(-0.2, 0.7, sin(phi)));
    float dop2 = 1.0 - 0.33 * cos(phi);
    col += diskColor(rdl, phi, dop2) * wrap * shadow * 1.1 * smoothstep(2.1, 1.35, rl);

    // Photon ring.
    float pr = exp(-pow((r - S * 1.04) / (S * 0.022), 2.0));
    col += vec3(1.0, 0.82, 0.58) * pr * (0.55 + 0.6 * dop2);

    // Soft bloom around the disk plane and the hole (kept out of the shadow itself).
    float bloomMask = mix(0.08, 1.0, shadow);
    col += vec3(1.0, 0.45, 0.15) * 0.006 / (abs(q.y) + 0.015) * exp(-abs(q.x) / (S * 3.0)) * 0.5 * bloomMask;
    col += vec3(1.0, 0.55, 0.25) * 0.0012 / (abs(r - S * 1.08) + 0.008) * shadow;

    // Vignette.
    col *= 1.0 - 0.35 * dot(vUv - 0.5, vUv - 0.5);

    gl_FragColor = vec4(finish(tonemap(col * 1.15)), 1.0);
}
