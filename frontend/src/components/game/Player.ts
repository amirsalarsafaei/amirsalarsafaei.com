import * as Phaser from 'phaser';
import { ANIM_CONFIG, PLAYER_ASSET_KEYS } from './assets';

export class Player {
  private sprite!: Phaser.Physics.Arcade.Sprite;
  private scene: Phaser.Scene;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private currentAnimation: string = ANIM_CONFIG.IDLE;
  private canJump: boolean = true;

  private readonly MOVE_SPEED = 220;
  private readonly JUMP_FORCE = 550;
  private readonly GRAVITY = 700;
  private readonly DEPTH_OFFSET = 1000;
  private readonly HITBOX_WIDTH = 30;
  private readonly HITBOX_HEIGHT = 64;
  private readonly HITBOX_OFFSET_X = 35;
  private readonly HITBOX_OFFSET_Y = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.initialize(x, y);
  }

  private initialize(x: number, y: number): void {
    this.sprite = this.scene.physics.add.sprite(x, y, PLAYER_ASSET_KEYS.IDLE, 0);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setBounce(0);
    this.sprite.setDrag(0, 0);

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.HITBOX_WIDTH, this.HITBOX_HEIGHT);
    body.setOffset(this.HITBOX_OFFSET_X, this.HITBOX_OFFSET_Y);
    body.setGravityY(this.GRAVITY);
    body.setFriction(0, 0);
    body.setCollideWorldBounds(true, 0, 0, false);

    if (this.scene.input.keyboard) {
      this.cursors = this.scene.input.keyboard.createCursorKeys();
    }

    this.updateDepth();
  }

  public createAnimations(): void {
    const { FRAME_COUNT, FRAME_RATE } = ANIM_CONFIG;

    this.scene.anims.create({
      key: ANIM_CONFIG.IDLE,
      frames: this.scene.anims.generateFrameNumbers(PLAYER_ASSET_KEYS.IDLE, { start: 0, end: FRAME_COUNT - 1 }),
      frameRate: FRAME_RATE,
      repeat: -1,
    });

    this.scene.anims.create({
      key: ANIM_CONFIG.WALK,
      frames: this.scene.anims.generateFrameNumbers(PLAYER_ASSET_KEYS.WALK, { start: 0, end: FRAME_COUNT - 1 }),
      frameRate: FRAME_RATE,
      repeat: -1,
    });

    this.scene.anims.create({
      key: ANIM_CONFIG.JUMP,
      frames: this.scene.anims.generateFrameNumbers(PLAYER_ASSET_KEYS.JUMP, { start: 0, end: FRAME_COUNT - 1 }),
      frameRate: FRAME_RATE,
    });

    this.scene.anims.create({
      key: ANIM_CONFIG.FALL,
      frames: this.scene.anims.generateFrameNumbers(PLAYER_ASSET_KEYS.FALL, { start: 0, end: FRAME_COUNT - 1 }),
      frameRate: FRAME_RATE,
    });

    this.scene.anims.create({
      key: ANIM_CONFIG.WIN,
      frames: this.scene.anims.generateFrameNumbers(PLAYER_ASSET_KEYS.WIN, { start: 0, end: FRAME_COUNT - 1 }),
      frameRate: 8,
      repeat: -1,
    });
  }

  public playWinAnimation(): void {
    this.sprite.setVelocity(0, 0);
    this.sprite.play(ANIM_CONFIG.WIN);
  }

  public update(delta: number): void {
    this.updatePhysics();
    this.updateAnimation();
    this.updateDepth();
  }

  private updateDepth(): void {
    this.sprite.setDepth(Math.floor(this.sprite.y) + this.DEPTH_OFFSET);
  }

  private updatePhysics(): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const isGrounded = body?.touching.down || body?.blocked.down;

    this.handleHorizontalMovement();
    this.handleJumping(isGrounded);
    this.snapToGroundIfIdle(isGrounded, body);
  }

  private handleHorizontalMovement(): void {
    if (this.cursors.left.isDown) {
      this.sprite.setVelocityX(-this.MOVE_SPEED);
      this.sprite.setFlip(true, false);
    } else if (this.cursors.right.isDown) {
      this.sprite.setVelocityX(this.MOVE_SPEED);
      this.sprite.setFlip(false, false);
    } else {
      this.sprite.setVelocityX(0);
    }
  }

  private handleJumping(isGrounded: boolean): void {
    if (this.cursors.up.isDown && isGrounded && this.canJump) {
      this.sprite.setVelocityY(-this.JUMP_FORCE);
      this.canJump = false;
    } else if (!this.cursors.up.isDown) {
      this.canJump = true;
    }
  }

  private snapToGroundIfIdle(isGrounded: boolean, body: Phaser.Physics.Arcade.Body): void {
    if (isGrounded && !this.cursors.up.isDown && Math.abs(body.velocity.y) < 1) {
      body.setVelocityY(0);
    }
  }

  private updateAnimation(): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const isGrounded = body?.touching.down;
    let nextAnimation = this.currentAnimation;

    if (this.cursors.up.isDown && isGrounded) {
      nextAnimation = ANIM_CONFIG.JUMP;
    } else if (!isGrounded && body?.velocity.y! > 0) {
      nextAnimation = ANIM_CONFIG.FALL;
    } else if (this.cursors.left.isDown || this.cursors.right.isDown) {
      nextAnimation = ANIM_CONFIG.WALK;
    } else {
      nextAnimation = ANIM_CONFIG.IDLE;
    }

    if (nextAnimation !== this.currentAnimation) {
      this.sprite.play(nextAnimation);
      this.currentAnimation = nextAnimation;
    }
  }

  public getSprite(): Phaser.Physics.Arcade.Sprite {
    return this.sprite;
  }

  public getPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.sprite.x, this.sprite.y);
  }

  public takeDamage(_amount: number): void {
    // TODO: Implement health system
    console.log(`Player took damage`);
  }

  public destroy(): void {
    this.sprite.destroy();
  }
}
