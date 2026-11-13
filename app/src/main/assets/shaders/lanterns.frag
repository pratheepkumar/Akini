// Lantern Festival — paper lanterns drifting up into the night over a calm lake.

vec3 lanterns(vec2 p, inout float glow) {
    vec3 acc = vec3(0.0);
    for (int layer = 0; layer < 3; layer++) {
        float fl = float(layer);
        float sc = 7.0 + fl * 5.0;
        vec2 q = p * sc + vec2(fl * 3.7, -uTime * (0.12 - fl * 0.025) * sc * 0.1);
        q.x += sin(q.y * 0.4 + fl) * 0.2;
        vec2 id = floor(q);
        vec2 f = fract(q) - 0.5;
        float h = hash12(id + fl * 11.0);
        if (h > 0.45) {
            vec2 off = (hash22(id + fl) - 0.5) * 0.45;
            vec2 lp = f - off;
            float s = 0.16 + 0.06 * hash12(id + 4.0);
            float body = sdRoundBox(lp, vec2(s * 0.6, s), s * 0.35);
            float m = smoothstep(0.03, -0.03, body);
            float flick = 0.85 + 0.15 * sin(uTime * (3.0 + h * 4.0) + h * 20.0);
            vec3 c = mix(uC1, uC2, smoothstep(s, -s, lp.y));
            c *= 1.0 + 0.6 * smoothstep(s * 0.3, -s, lp.y);
            acc += c * m * flick * (1.0 - fl * 0.25);
            glow += exp(-length(lp) * 6.0) * flick * (0.6 - fl * 0.15) * 0.25;
        }
    }
    return acc;
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p.x += uTilt.x * 0.02;
    float water = -0.2;
    vec3 col;
    float glow = 0.0;
    if (p.y > water) {
        col = mix(uC3 * 0.45, uC3 * 0.08, smoothstep(water, 0.5, p.y));
        col += starLayer(p, 90.0, 0.94, 3.0) * 0.4;
        // far shore with silhouetted trees
        float shore = water + 0.03 + 0.02 * fbm4(vec2(p.x * 12.0, 1.0)) + 0.015 * step(0.6, fract(p.x * 30.0));
        vec3 l = lanterns(p, glow);
        col += uC1 * glow * 0.35;
        col += l;
        col = mix(col, vec3(0.01, 0.01, 0.02), smoothstep(0.001, -0.001, p.y - shore));
    } else {
        vec2 rp = vec2(p.x + 0.004 * sin(p.y * 160.0 + uTime * 1.5), 2.0 * water - p.y);
        col = mix(uC3 * 0.45, uC3 * 0.08, smoothstep(water, 0.5, rp.y)) * 0.6;
        vec3 l = lanterns(rp, glow);
        col += (l * 0.5 + uC1 * glow * 0.25) * (0.7 + 0.3 * sin(p.y * 300.0));
        // a few lanterns floating on the water itself
        vec2 fq = vec2(p.x * 12.0 + uTime * 0.05, (p.y - water) * 40.0);
        vec2 fid = floor(fq);
        float fl = step(0.8, hash12(fid)) * smoothstep(0.3, 0.1, length(fract(fq) - 0.5));
        col += uC2 * fl * 0.6 * exp((p.y - water) * 5.0);
    }
    col *= 1.0 - 0.35 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.2)), 1.0);
}
