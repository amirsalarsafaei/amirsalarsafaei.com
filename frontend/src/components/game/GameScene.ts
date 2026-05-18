import * as Phaser from 'phaser';
import { Player } from './Player';
import { Stage, STAGE_TEMPLATES, StageConfig } from './Stage';
import {
  PLAYER_ASSET_KEYS,
  PLAYER_ASSET_PATHS,
  BACKGROUND_ASSET_KEYS,
  BACKGROUND_ASSET_PATHS,
} from './assets';

const SPRITESHEET_FRAME = { frameWidth: 100, frameHeight: 64 };
const TILESET_FRAME = { frameWidth: 16, frameHeight: 16 };

export class ValentineScene extends Phaser.Scene {
  private player!: Player;
  private currentStage!: Stage;
  private currentStageIndex: number = 0;
  private uiText!: Phaser.GameObjects.Text;
  private hasWon: boolean = false;

  private readonly STAGE_CONFIGS: StageConfig[] = [
    STAGE_TEMPLATES.STAGE_1,
    STAGE_TEMPLATES.STAGE_2,
    STAGE_TEMPLATES.STAGE_3,
  ];

  private readonly WORLD_BOUNDS_Y = 600;

  constructor() {
    super('ValentineScene');
  }

  preload(): void {
    this.load.spritesheet(PLAYER_ASSET_KEYS.IDLE, PLAYER_ASSET_PATHS.IDLE, SPRITESHEET_FRAME);
    this.load.spritesheet(PLAYER_ASSET_KEYS.WALK, PLAYER_ASSET_PATHS.WALK, SPRITESHEET_FRAME);
    this.load.spritesheet(PLAYER_ASSET_KEYS.JUMP, PLAYER_ASSET_PATHS.JUMP, SPRITESHEET_FRAME);
    this.load.spritesheet(PLAYER_ASSET_KEYS.FALL, PLAYER_ASSET_PATHS.FALL, SPRITESHEET_FRAME);
    this.load.spritesheet(PLAYER_ASSET_KEYS.WIN, PLAYER_ASSET_PATHS.WIN, SPRITESHEET_FRAME);
    this.load.spritesheet(BACKGROUND_ASSET_KEYS.TILESET, BACKGROUND_ASSET_PATHS.TILESET, TILESET_FRAME);
    this.load.image(BACKGROUND_ASSET_KEYS.BG_0, BACKGROUND_ASSET_PATHS.BG_0);
    this.load.image(BACKGROUND_ASSET_KEYS.BG_1, BACKGROUND_ASSET_PATHS.BG_1);
    this.load.image(BACKGROUND_ASSET_KEYS.BG_2, BACKGROUND_ASSET_PATHS.BG_2);
    this.load.image(BACKGROUND_ASSET_KEYS.PASSKEY, BACKGROUND_ASSET_PATHS.PASSKEY);
  }

  create(): void {
    this.loadStage(this.currentStageIndex);
    this.createUI();
  }

  private createUI(): void {
    this.uiText = this.add.text(16, 16, this.currentStage.getName(), {
      fontSize: '16px',
      color: '#4ae168',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      resolution: 2,
      wordWrap: { width: 400 },
    });
    this.uiText.setDepth(10);
  }

  private loadStage(stageIndex: number): void {
    this.cleanupStage();

    const normalizedIndex = stageIndex % this.STAGE_CONFIGS.length;
    const stageConfig = this.STAGE_CONFIGS[normalizedIndex];

    this.currentStage = new Stage(this, stageConfig);
    const spawn = this.currentStage.getPlayerSpawn();

    this.player = new Player(this, spawn.x, spawn.y);
    this.player.createAnimations();

    this.physics.add.collider(this.player.getSprite(), this.currentStage.getPlatforms());

    const keyhole = this.currentStage.getKeyhole();
    if (keyhole && this.currentStageIndex === 0) {
      this.physics.add.overlap(this.player.getSprite(), keyhole, () => this.winStage());
    }

    this.currentStageIndex = stageIndex;
    this.hasWon = false;
  }

  private cleanupStage(): void {
    this.currentStage?.destroy();
    this.player?.destroy();
  }

  public nextStage(): void {
    this.loadStage(this.currentStageIndex + 1);
    this.updateUI();
  }

  public restartStage(): void {
    this.loadStage(this.currentStageIndex);
    this.updateUI();
  }

  private updateUI(): void {
    if (this.uiText && this.currentStage) {
      this.uiText.setText(this.currentStage.getName());
    }
  }

  private winStage(): void {
    if (this.hasWon) return;
    this.hasWon = true;

    this.player.playWinAnimation();

    this.time.delayedCall(500, () => {
      const victoryText = this.add.text(
        this.scale.width / 2,
        this.scale.height / 2,
        'To be continued...',
        {
          fontSize: '36px',
          color: '#ffd700',
          fontFamily: '"Courier New", monospace',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 3,
          resolution: 3,
        },
      );
      victoryText.setOrigin(0.5);
      victoryText.setDepth(1000);

      this.tweens.add({
        targets: victoryText,
        scale: 1.2,
        alpha: 0,
        duration: 2500,
        delay: 1500,
        ease: 'Quad.easeIn',
      });
    });
  }

  update(time: number, delta: number): void {
    if (!this.player || !this.currentStage || this.hasWon) return;

    this.player.update(delta);
    this.checkLoseCondition();
  }

  private checkLoseCondition(): void {
    if (this.player.getPosition().y > this.WORLD_BOUNDS_Y) {
      this.restartStage();
    }
  }
}
