import * as Phaser from 'phaser';

const heartShaderSource = `
precision mediump float;

uniform float uTime;
uniform vec2 uResolution;

float heart(vec2 p, float size) {
    p /= size;
    float x = p.x;
    float y = p.y - 0.3;
    float val = x*x + pow(y - sqrt(abs(x)), 2.0);
    return val - 1.0;
}

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    uv.x *= uResolution.x / uResolution.y;

    float zoom = 8.0;
    float speed = 0.3;
    vec2 movement = vec2(0.5, 1.0) * uTime * speed;
    vec2 gridUV = uv + movement;

    vec2 cellUV = fract(gridUV * zoom) * 2.0 - 1.0;

    float row = floor(gridUV.y * zoom);
    if (mod(row, 2.0) > 0.5) {
        gridUV.x += 0.5 / zoom;
        cellUV = fract(gridUV * zoom) * 2.0 - 1.0;
    }

    float pulse = 1.0 + 0.1 * sin(uTime * 3.0);
    float d = heart(cellUV, 0.45 * pulse);

    vec3 bgColor = vec3(0.98, 0.94, 0.94);
    vec3 heartColor = vec3(0.9, 0.4, 0.5);
    float alpha = 1.0 - smoothstep(-0.1, 0.0, d);
    vec3 color = mix(bgColor, heartColor, alpha);

    gl_FragColor = vec4(color, 1.0);
}
`;

export class HeartShaderScene extends Phaser.Scene {
  private shader!: Phaser.GameObjects.Zone;
  private elapsed = 0;

  constructor() {
    super({ key: 'HeartShaderScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    const baseShader = new Phaser.Shader.BaseShader({
      gl: this.game.renderer.gl,
      fragmentShader: heartShaderSource,
      uniforms: {
        uTime: 0,
        uResolution: [width, height],
      },
    });

    this.shader = this.add.zone(width / 2, height / 2, width, height).setShader(baseShader);
    this.shader.setDepth(-100);
  }

  update(_time: number, delta: number): void {
    this.elapsed += delta / 1000;
    (this.shader.shader as Phaser.Shader.BaseShader).setData('uTime', this.elapsed);
  }
}
