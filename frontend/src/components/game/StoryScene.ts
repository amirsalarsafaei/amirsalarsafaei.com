import * as Phaser from 'phaser';

const STORY_STAGES = [
  {
    title: 'Chapter 1: The Long Night',
    paragraphs: [
      'In the land of Stringstar, an ancient curse has frozen the hearts of all its inhabitants.',
      'Knight, a young and valiant warrior, has taken up the cause of breaking the curse.',
      'With a magical key, he must traverse the frozen landscapes and awaken the hearts of the people of Stringstar.',
      'He must jump through the keyholes and collect the key fragments to break the curse.',
    ],
    imageUrl: '/valentine/stage1.png',
  },
  {
    title: 'Chapter 2: The Frozen Heart',
    paragraphs: [
      'Knight has found the first keyhole and entered the frozen heart of Stringstar.',
      'He has collected the first key fragment and is now on his way to the next keyhole.',
      'The landscape is changing, becoming warmer and more vibrant with each key fragment collected.',
      'Knight can sense the warmth of the hearts of the people of Stringstar.',
    ],
    imageUrl: '/valentine/stage2.png',
  },
  {
    title: 'Chapter 3: The Awakening',
    paragraphs: [
      'Knight has found the final keyhole and is about to break the curse.',
      'The hearts of the people of Stringstar are warming up, and the flowers are blooming.',
      'Knight can feel the love and warmth of the people of Stringstar.',
      'He has broken the curse and saved the land of Stringstar.',
      'The hearts of all its inhabitants are now full of love and warmth.',
    ],
    imageUrl: '/valentine/stage3.png',
  },
];

export class StoryScene extends Phaser.Scene {
  private pageImages: Phaser.GameObjects.Image[] = [];
  private totalPages = 0;
  private currentPage = 0;
  private storyData: typeof STORY_STAGES;

  private readonly PAGE_HEIGHT = 400;
  private readonly PAGE_WIDTH = 800;
  private readonly IMAGE_URL = '/valentine/story.png';

  constructor() {
    super({ key: 'StoryScene' });
    this.storyData = STORY_STAGES;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#4ae168');

    this.createStoryPages();
    this.updatePage(0);

    const text = this.add.text(400, 500, 'Scroll to continue...', {
      fontSize: '16px',
      color: '#000000',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: 520,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });
  }

  private createStoryPages(): void {
    this.pageImages.forEach((img) => img.destroy());
    this.pageImages = [];

    this.storyData.forEach((stage, index) => {
      const bg = this.add.rectangle(400, 400, this.PAGE_WIDTH, this.PAGE_HEIGHT, 0x2d5016);
      bg.setOrigin(0.5);

      const title = this.add.text(400, 200 + index * this.PAGE_HEIGHT, stage.title, {
        fontSize: '24px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        wordWrap: { width: 700 },
      }).setOrigin(0.5);

      const paragraphs = this.add.text(400, 250 + index * this.PAGE_HEIGHT, stage.paragraphs.join('\n'), {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: 'Arial',
        wordWrap: { width: 700 },
      }).setOrigin(0.5);

      const image = this.add.image(400, 350 + index * this.PAGE_HEIGHT, this.IMAGE_URL).setScale(0.4).setOrigin(0.5);

      this.pageImages.push(image);
    });

    this.totalPages = this.storyData.length;
  }

  private updatePage(pageIndex: number): void {
    this.pageImages.forEach((img) => img.setVisible(false));
    if (pageIndex < this.totalPages) {
      this.pageImages[pageIndex].setVisible(true);
    }
    this.currentPage = pageIndex;
  }

  nextStoryPage(): boolean {
    if (this.currentPage < this.totalPages - 1) {
      this.updatePage(this.currentPage + 1);
      return true;
    }
    return false;
  }

  prevStoryPage(): boolean {
    if (this.currentPage > 0) {
      this.updatePage(this.currentPage - 1);
      return true;
    }
    return false;
  }

  getCurrentPage(): number {
    return this.currentPage;
  }

  getTotalPages(): number {
    return this.totalPages;
  }
}
