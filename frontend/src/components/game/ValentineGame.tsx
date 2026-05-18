'use client';

import { useEffect, useRef, useCallback } from 'react';
import styles from './ValentineGame.module.scss';

export default function ValentineGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);
  const gameConfigRef = useRef<Phaser.Types.Core.GameConfig | null>(null);

  const initGame = useCallback(() => {
    const gameContainer = containerRef.current;
    const gameContent = gameRef.current;

    if (!gameContainer || !gameContent) return;

    if (gameInstance.current) {
      gameInstance.current.destroy(true);
    }

    const createGameConfig = (): Phaser.Types.Core.GameConfig => {
      const parentWidth = gameContainer.clientWidth;
      const parentHeight = gameContainer.clientHeight;

      return {
        parent,
        type: Phaser.WEBGL,
        scale: {
          mode: Phaser.Scale.FIT,
          width: parentWidth,
          height: parentHeight,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        render: {
          pixelArt: true,
          antialias: false,
          roundPixels: 1,
          powersOfTwo: false,
        },
        scene: {
          preload: () => {
            this.load.setBaseURL('');
            this.load.spritesheet('knight_idle', '/game/Knight_player/Idle_KG_1.png', {
              frameWidth: 100,
              frameHeight: 64,
            });
            this.load.spritesheet('knight_walk', '/game/Knight_player/Walking_KG_1.png', {
              frameWidth: 100,
              frameHeight: 64,
            });
            this.load.spritesheet('knight_jump', '/game/Knight_player/Jump_KG_1.png', {
              frameWidth: 100,
              frameHeight: 64,
            });
            this.load.spritesheet('knight_fall', '/game/Knight_player/Fall_KG_1.png', {
              frameWidth: 100,
              frameHeight: 64,
            });
            this.load.spritesheet('knight_win', '/game/Knight_player/knight_win.png', {
              frameWidth: 100,
              frameHeight: 64,
            });
            this.load.spritesheet('stringstar_tiles', '/game/stringstar fields/tileset.png', {
              frameWidth: 16,
              frameHeight: 16,
            });
            this.load.image('stringstar_bg0', '/game/stringstar fields/background_0.png');
            this.load.image('stringstar_bg1', '/game/stringstar fields/background_1.png');
            this.load.image('stringstar_bg2', '/game/stringstar fields/background_2.png');
            this.load.image('passkey', '/game/passkey-3bmzvin8dguf4tw0e2x0ap.png');
          },
          create: () => {
            const { ValentineScene } = require('./GameScene');
            const { HeartShaderScene } = require('./HeartShaderScene');
            const { StoryScene } = require('./StoryScene');

            this.scene.add('ValentineScene', ValentineScene, true);
            this.scene.add('HeartShaderScene', HeartShaderScene, false);
            this.scene.add('StoryScene', StoryScene, false);
          },
          update: () => {
            const valentineScene = this.scene.getScene('ValentineScene') as Phaser.Scene;
            if (valentineScene) {
              valentineScene.update();
            }
          },
        },
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { y: 700 },
            debug: false,
          },
        },
      };
    };

    gameConfigRef.current = createGameConfig();
    gameInstance.current = new Phaser.Game(gameConfigRef.current);
  }, []);

  useEffect(() => {
    initGame();
    const gameContainer = containerRef.current;
    if (!gameContainer || !gameInstance.current) return;

    const debouncedResize = debounce(() => {
      if (gameInstance.current?.scale) {
        gameInstance.current.scale.resize(
          gameContainer.clientWidth,
          gameContainer.clientHeight,
        );
      }
    }, 200);

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      gameInstance.current?.destroy(true);
      gameInstance.current = null;
    };
  }, [initGame]);

  return (
    <div ref={containerRef} className={styles.gameContainer}>
      <div ref={gameRef} className={styles.gameContent} />
    </div>
  );
}

function debounce(fn: Function, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
