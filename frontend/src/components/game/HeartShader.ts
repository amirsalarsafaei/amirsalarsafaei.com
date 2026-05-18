import * as Phaser from 'phaser';

const fragShader = `
precision mediump float;

uniform float uTime;
uniform vec2 uResolution;

// Signed Distance Function for a heart shape
float sdHeart(vec2 p) {
    p.x = abs(p.x);
    if (p.y + p.x > 1.0)
        return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
    return sqrt(min(dot(p - vec2(0.00, 1.00), p - vec2(0.00, 1.00)),
                    dot(p - 0.5 * max(p.x + p.y, 0.0), p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}

void main() {
    // Normalize coordinates to -1.0 -> 1.0
    vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.y, uResolution.x);
    
    // Flip Y because WebGL coordinates are usually bottom-left
    uv.y *= -1.0; 
    
    // Shift up slightly to center visual mass
    uv.y += 0.3;

    // Heartbeat Animation (Compound Sine Wave for "Lub-Dub" effect)
    float beat = pow(sin(uTime * 3.0), 63.0) * 0.15 + sin(uTime * 3.0) * 0.05;
    
    // Scale the coordinate space to animate the size
    vec2 p = uv * (1.2 - beat);

    // Get Distance
    float d = sdHeart(p);

    // Color & Glow Logic
    vec3 col = vec3(0.9, 0.05, 0.2); // Deep Red Base
    
    // Inner Glow (inverse distance)
    float glow = 0.01 / abs(d);
    
    // Add rim lighting
    col += vec3(1.0, 0.4, 0.6) * glow;

    // Smooth edges (Anti-aliasing step)
    float alpha = 1.0 - smoothstep(0.0, 0.02, d);
    
    // Add an outer glow (halo)
    if (d > 0.0) {
        float halo = exp(-d * 6.0) * 0.6; // Exponential decay
        col = vec3(1.0, 0.1, 0.3) * halo;
        alpha = halo;
    }

    gl_FragColor = vec4(col, alpha);
}
`;

export class HeartShader extends Phaser.GameObjects.Shader {
    constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
        const key = 'heart_shader_' + Date.now();
        
        const base = new Phaser.Display.BaseShader(key, fragShader, undefined, {
            uTime: { type: '1f', value: 0 },
            uResolution: { type: '2f', value: { x: width, y: height } }
        });

        super(scene, base, x, y, width, height);
    }

    preUpdate(time: number, delta: number) {
        this.setUniform('uTime', time * 0.001);
    }
}
