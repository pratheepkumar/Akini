// Flow Lines — thousands of luminous threads drifting through an invisible current.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p += uTilt * 0.03;
    float t = uTime * 0.04;
    vec2 q = p * 1.6;
    // a smooth flowing field
    vec2 w = vec2(fbm4(q + vec2(0.0, t)), fbm4(q + vec2(5.2, -t)));
    float f = fbm4(q + 1.8 * w + vec2(t * 0.5, 0.0));
    // contour lines of the field look like streamlines
    float bands = f * 40.0;
    float line = abs(fract(bands) - 0.5);
    float width = 0.06 + 0.05 * sin(f * 9.0 + uTime * 0.3);
    float stroke = smoothstep(width, 0.0, line);
    float fine = smoothstep(0.03, 0.0, abs(fract(bands * 3.0) - 0.5)) * 0.25;

    vec3 hue = palette(f * 1.5 + t * 0.5, vec3(0.5), vec3(0.5), vec3(1.0), vec3(uP.x, uP.y, uP.z));
    hue = mix(hue, uC1, 0.35);
    vec3 col = vec3(0.004, 0.004, 0.012);
    float glow = smoothstep(0.25, 0.75, length(w));
    col += hue * (stroke * 0.9 + fine) * (0.25 + 0.9 * glow);
    // light travelling along the threads
    float travel = pow(0.5 + 0.5 * sin(f * 60.0 - uTime * 1.2), 12.0);
    col += mix(hue, vec3(1.0), 0.5) * travel * stroke * glow * 0.8;

    col *= 1.0 - 0.45 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.2)), 1.0);
}
