import { Component, OnInit, OnDestroy, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Position {
  x: number;
  y: number;
}

@Component({
  selector: 'app-snake',
  imports: [CommonModule],
  templateUrl: './snake.html',
  styleUrl: './snake.css',
  standalone: true
})
export class Snake implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('gameCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private gameLoop: any;

  // Game settings
  private readonly gridSize = 20;
  private readonly tileCount = 20;
  private readonly canvasSize = this.gridSize * this.tileCount;

  // Game state
  private snake: Position[] = [];
  private food: Position = { x: 10, y: 10 };
  private dx = 0;
  private dy = 0;
  private nextDx = 0;
  private nextDy = 0;

  // Signals for UI
  protected readonly score = signal(0);
  protected readonly highScore = signal(0);
  protected readonly gameStarted = signal(false);
  protected readonly gameOver = signal(false);

  ngOnInit(): void {
    // Load high score from localStorage
    const savedHighScore = localStorage.getItem('snakeHighScore');
    if (savedHighScore) {
      this.highScore.set(parseInt(savedHighScore, 10));
    }

    // Add keyboard event listener
    document.addEventListener('keydown', this.handleKeyPress);
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = this.canvasSize;
    canvas.height = this.canvasSize;
    this.ctx = canvas.getContext('2d')!;

    this.drawWelcomeScreen();
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.handleKeyPress);
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
    }
  }

  private handleKeyPress = (event: KeyboardEvent): void => {
    if (!this.gameStarted() && !this.gameOver()) {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        this.startGame();
      }
    }

    // Prevent default arrow key behavior (scrolling)
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }

    // Change direction (store next direction to prevent double-back)
    switch (event.key) {
      case 'ArrowUp':
        if (this.dy === 0) {
          this.nextDx = 0;
          this.nextDy = -1;
        }
        break;
      case 'ArrowDown':
        if (this.dy === 0) {
          this.nextDx = 0;
          this.nextDy = 1;
        }
        break;
      case 'ArrowLeft':
        if (this.dx === 0) {
          this.nextDx = -1;
          this.nextDy = 0;
        }
        break;
      case 'ArrowRight':
        if (this.dx === 0) {
          this.nextDx = 1;
          this.nextDy = 0;
        }
        break;
      case ' ':
        if (this.gameOver()) {
          this.restartGame();
        }
        break;
    }
  };

  protected startGame(): void {
    this.gameStarted.set(true);
    this.gameOver.set(false);
    this.score.set(0);

    // Initialize snake in the middle
    this.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];

    // Start moving right
    this.dx = 1;
    this.dy = 0;
    this.nextDx = 1;
    this.nextDy = 0;

    // Place first food
    this.placeFood();

    // Start game loop (150ms = classic Nokia speed)
    this.gameLoop = setInterval(() => this.update(), 150);
  }

  protected restartGame(): void {
    this.startGame();
  }

  private update(): void {
    // Update direction
    this.dx = this.nextDx;
    this.dy = this.nextDy;

    // Calculate new head position
    const head = { ...this.snake[0] };
    head.x += this.dx;
    head.y += this.dy;

    // Check wall collision
    if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
      this.endGame();
      return;
    }

    // Check self collision
    if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
      this.endGame();
      return;
    }

    // Add new head
    this.snake.unshift(head);

    // Check food collision
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score.update(s => s + 10);
      this.placeFood();

      // Update high score
      if (this.score() > this.highScore()) {
        this.highScore.set(this.score());
        localStorage.setItem('snakeHighScore', this.score().toString());
      }
    } else {
      // Remove tail if no food eaten
      this.snake.pop();
    }

    this.draw();
  }

  private placeFood(): void {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * this.tileCount),
        y: Math.floor(Math.random() * this.tileCount)
      };
    } while (this.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));

    this.food = newFood;
  }

  private draw(): void {
    // Clear canvas with Nokia-style green background
    this.ctx.fillStyle = '#9cb83c';
    this.ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);

    // Draw grid (subtle)
    this.ctx.strokeStyle = '#8ba83a';
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= this.tileCount; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(i * this.gridSize, 0);
      this.ctx.lineTo(i * this.gridSize, this.canvasSize);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(0, i * this.gridSize);
      this.ctx.lineTo(this.canvasSize, i * this.gridSize);
      this.ctx.stroke();
    }

    // Draw snake (darker pixels like Nokia)
    this.ctx.fillStyle = '#0f380f';
    this.snake.forEach((segment, index) => {
      const padding = 2;
      this.ctx.fillRect(
        segment.x * this.gridSize + padding,
        segment.y * this.gridSize + padding,
        this.gridSize - padding * 2,
        this.gridSize - padding * 2
      );

      // Draw head differently
      if (index === 0) {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(
          segment.x * this.gridSize + padding,
          segment.y * this.gridSize + padding,
          this.gridSize - padding * 2,
          this.gridSize - padding * 2
        );
        this.ctx.fillStyle = '#0f380f';
      }
    });

    // Draw food (blinking effect)
    const blinkState = Math.floor(Date.now() / 300) % 2;
    if (blinkState === 0) {
      this.ctx.fillStyle = '#0f380f';
      const foodPadding = 4;
      this.ctx.fillRect(
        this.food.x * this.gridSize + foodPadding,
        this.food.y * this.gridSize + foodPadding,
        this.gridSize - foodPadding * 2,
        this.gridSize - foodPadding * 2
      );
    }
  }

  private drawWelcomeScreen(): void {
    this.ctx.fillStyle = '#9cb83c';
    this.ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);

    this.ctx.fillStyle = '#0f380f';
    this.ctx.font = 'bold 24px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('SNAKE', this.canvasSize / 2, this.canvasSize / 2 - 40);

    this.ctx.font = '16px monospace';
    this.ctx.fillText('Press Arrow Key', this.canvasSize / 2, this.canvasSize / 2 + 20);
    this.ctx.fillText('to Start', this.canvasSize / 2, this.canvasSize / 2 + 40);
  }

  private endGame(): void {
    clearInterval(this.gameLoop);
    this.gameStarted.set(false);
    this.gameOver.set(true);

    // Draw game over screen
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);

    this.ctx.fillStyle = '#9cb83c';
    this.ctx.font = 'bold 32px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GAME OVER', this.canvasSize / 2, this.canvasSize / 2 - 20);

    this.ctx.font = '16px monospace';
    this.ctx.fillText(`Score: ${this.score()}`, this.canvasSize / 2, this.canvasSize / 2 + 20);
    this.ctx.fillText('Press SPACE', this.canvasSize / 2, this.canvasSize / 2 + 60);
    this.ctx.fillText('to Restart', this.canvasSize / 2, this.canvasSize / 2 + 80);
  }
}
