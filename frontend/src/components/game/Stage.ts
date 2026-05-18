import * as Phaser from 'phaser';

export interface PlatformConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  scale?: number;
}

export interface StageConfig {
  name: string;
  backgroundColor?: number;
  backgroundImage?: string;
  platforms: PlatformConfig[];
  playerSpawnX: number;
  playerSpawnY: number;
  worldBounds?: { width: number; height: number };
  platformColor?: number;
  platformStrokeColor?: number;
  usePositionBasedDepth?: boolean;
}

export class Stage {
  private scene: Phaser.Scene;
  private config: StageConfig;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private background!: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private keyhole!: Phaser.Physics.Arcade.Image;

  constructor(scene: Phaser.Scene, config: StageConfig) {
    this.scene = scene;
    this.config = {
      backgroundColor: 0x1a1a2e,
      platformColor: 0x2d5016,
      platformStrokeColor: 0x4ae168,
      ...config,
    };
    this.initialize();
  }

  private initialize(): void {
    const { width, height } = this.scene.scale;

    if (this.config.worldBounds) {
      this.scene.physics.world.setBounds(0, 0, this.config.worldBounds.width, this.config.worldBounds.height);
    }

    this.createBackground(width, height);
    this.createPlatforms();

    if (this.config.name.includes('Stage 1')) {
      this.createKeyhole();
    }
  }

  private createBackground(width: number, height: number): void {
    if (this.config.backgroundImage) {
      this.background = this.scene.add.image(width / 2, height / 2, this.config.backgroundImage);
      this.background.setDisplaySize(width, height).setDepth(-10);
    } else {
      this.background = this.scene.add.rectangle(width / 2, height / 2, width, height, this.config.backgroundColor);
      this.background.setDepth(-10);
      this.scene.cameras.main.setBackgroundColor(this.config.backgroundColor!);
    }
  }

  private createPlatforms(): void {
    this.platforms = this.scene.physics.add.staticGroup();
    const usePositionDepth = this.config.usePositionBasedDepth !== false;

    this.config.platforms.forEach((cfg, index) => {
      const platform = this.scene.add.rectangle(
        cfg.x,
        cfg.y,
        cfg.width,
        cfg.height,
        this.config.platformColor,
      );

      if (cfg.scale) {
        platform.setScale(cfg.scale);
      }

      const depth = usePositionDepth ? Math.floor(cfg.y) : index;
      platform.setStrokeStyle(2, this.config.platformStrokeColor).setDepth(depth);
      platform.setData('index', index);

      this.scene.physics.add.existing(platform, true);
      this.platforms.add(platform);
    });
  }

  public getPlatforms(): Phaser.Physics.Arcade.StaticGroup {
    return this.platforms;
  }

  public getPlayerSpawn(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.config.playerSpawnX, this.config.playerSpawnY);
  }

  public getName(): string {
    return this.config.name;
  }

  public getConfig(): StageConfig {
    return this.config;
  }

  private createKeyhole(): void {
    let highestY = Infinity;
    let highestX = 0;

    this.config.platforms.forEach((cfg) => {
      if (cfg.y < highestY) {
        highestY = cfg.y;
        highestX = cfg.x;
      }
    });

    const keyholeX = highestX;
    const keyholeY = highestY - 100;

    this.keyhole = this.scene.physics.add.image(keyholeX, keyholeY, 'passkey');
    this.keyhole.setScale(0.15);
    this.keyhole.setDepth(Math.floor(keyholeY) + 1000);

    const body = this.keyhole.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.moves = false;
    body.allowGravity = false;
    body.setVelocity(0, 0);
    body.setAcceleration(0, 0);
    body.setSize(60, 80);
    body.setOffset(-30, 0);
  }

  public getKeyhole(): Phaser.Physics.Arcade.Image | null {
    return this.keyhole || null;
  }

  public destroy(): void {
    this.platforms.clear(true, true);
    this.platforms.destroy(true);
    this.background?.destroy();
    this.keyhole?.destroy();
  }
}

// Pre-built stage templates for quick development
export const STAGE_TEMPLATES = {
  STAGE_1: {
    name: 'Stage 1: Stringstar Fields',
    backgroundImage: 'stringstar_bg0',
    platforms: [
      { x: 500, y: 550, width: 1000, height: 50 },
      { x: 200, y: 420, width: 150, height: 50 },
      { x: 800, y: 380, width: 150, height: 50 },
      { x: 500, y: 300, width: 150, height: 50 },
    ],
    playerSpawnX: 100,
    playerSpawnY: 480,
  } as StageConfig,

  STAGE_2: {
    name: 'Stage 2: Higher Fields',
    backgroundImage: 'stringstar_bg1',
    platforms: [
      { x: 500, y: 550, width: 1000, height: 50 },
      { x: 200, y: 450, width: 120, height: 50 },
      { x: 400, y: 380, width: 120, height: 50 },
      { x: 600, y: 310, width: 120, height: 50 },
      { x: 800, y: 240, width: 120, height: 50 },
    ],
    playerSpawnX: 100,
    playerSpawnY: 480,
  } as StageConfig,

  STAGE_3: {
    name: 'Stage 3: Final Fields',
    backgroundImage: 'stringstar_bg2',
    platforms: [
      { x: 500, y: 550, width: 1000, height: 50 },
      { x: 150, y: 450, width: 100, height: 50 },
      { x: 350, y: 390, width: 100, height: 50 },
      { x: 500, y: 330, width: 100, height: 50 },
      { x: 650, y: 270, width: 100, height: 50 },
      { x: 800, y: 210, width: 100, height: 50 },
    ],
    playerSpawnX: 50,
    playerSpawnY: 480,
  } as StageConfig,
};
