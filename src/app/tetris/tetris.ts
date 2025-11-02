import { Component, OnInit, OnDestroy, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Position {
  x: number;
  y: number;
}

interface Tetromino {
  shape: number[][];
  color: string;
}

@Component({
  selector: 'app-tetris',
  imports: [CommonModule],
  templateUrl: './tetris.html',
  styleUrl: './tetris.css',
  standalone: true
})
export class Tetris implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('gameCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private gameLoop: any;

  // Game settings
  private readonly blockSize = 30;
  private readonly cols = 10;
  private readonly rows = 20;
  private readonly canvasWidth = this.cols * this.blockSize;
  private readonly canvasHeight = this.rows * this.blockSize;

  // Game state
  private board: string[][] = [];
  private currentPiece: Tetromino | null = null;
  private currentPosition: Position = { x: 0, y: 0 };
  private dropInterval = 1000; // 1 second
  private lastDropTime = 0;

  // Tetromino definitions
  private readonly tetrominoes: { [key: string]: Tetromino } = {
    I: {
      shape: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      color: '#00f0f0'
    },
    J: {
      shape: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
      ],
      color: '#0000f0'
    },
    L: {
      shape: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
      ],
      color: '#f0a000'
    },
    O: {
      shape: [
        [1, 1],
        [1, 1]
      ],
      color: '#f0f000'
    },
    S: {
      shape: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
      ],
      color: '#00f000'
    },
    T: {
      shape: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
      ],
      color: '#a000f0'
    },
    Z: {
      shape: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
      ],
      color: '#f00000'
    }
  };

  // Signals for UI
  protected readonly score = signal(0);
  protected readonly level = signal(1);
  protected readonly lines = signal(0);
  protected readonly highScore = signal(0);
  protected readonly gameStarted = signal(false);
  protected readonly gameOver = signal(false);
  protected readonly isPaused = signal(false);

  ngOnInit(): void {
    // Load high score from localStorage
    const savedHighScore = localStorage.getItem('tetrisHighScore');
    if (savedHighScore) {
      this.highScore.set(parseInt(savedHighScore, 10));
    }

    // Add keyboard event listener
    document.addEventListener('keydown', this.handleKeyPress);

    // Initialize board
    this.initializeBoard();
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;
    this.ctx = canvas.getContext('2d')!;

    this.drawWelcomeScreen();
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.handleKeyPress);
    if (this.gameLoop) {
      cancelAnimationFrame(this.gameLoop);
    }
  }

  private initializeBoard(): void {
    this.board = Array(this.rows).fill(null).map(() => Array(this.cols).fill(''));
  }

  private handleKeyPress = (event: KeyboardEvent) => {
    if (!this.gameStarted() && !this.gameOver()) {
      if (event.key === ' ') {
        event.preventDefault();
        this.startGame();
      }
      return;
    }

    if (this.gameOver() && event.key === ' ') {
      event.preventDefault();
      this.restartGame();
      return;
    }

    if (!this.gameStarted() || this.gameOver()) return;

    // Prevent default for game keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'p'].includes(event.key)) {
      event.preventDefault();
    }

    if (event.key === 'p' || event.key === 'P') {
      this.togglePause();
      return;
    }

    if (this.isPaused()) return;

    switch (event.key) {
      case 'ArrowLeft':
        this.movePiece(-1, 0);
        break;
      case 'ArrowRight':
        this.movePiece(1, 0);
        break;
      case 'ArrowDown':
        this.movePiece(0, 1);
        break;
      case 'ArrowUp':
        this.rotatePiece();
        break;
      case ' ':
        this.hardDrop();
        break;
    }
  };

  protected startGame(): void {
    this.gameStarted.set(true);
    this.gameOver.set(false);
    this.isPaused.set(false);
    this.score.set(0);
    this.level.set(1);
    this.lines.set(0);
    this.dropInterval = 1000;
    this.initializeBoard();
    this.spawnPiece();
    this.lastDropTime = Date.now();
    this.gameLoop = requestAnimationFrame(this.update);
  }

  protected restartGame(): void {
    this.startGame();
  }

  protected togglePause(): void {
    if (!this.gameStarted() || this.gameOver()) return;
    this.isPaused.update(p => !p);
    if (!this.isPaused()) {
      this.lastDropTime = Date.now();
      this.gameLoop = requestAnimationFrame(this.update);
    }
  }

  private update = (): void => {
    if (this.isPaused() || this.gameOver()) return;

    const currentTime = Date.now();
    const deltaTime = currentTime - this.lastDropTime;

    if (deltaTime > this.dropInterval) {
      this.movePiece(0, 1);
      this.lastDropTime = currentTime;
    }

    this.draw();
    this.gameLoop = requestAnimationFrame(this.update);
  };

  private spawnPiece(): void {
    const pieces = Object.values(this.tetrominoes);
    const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
    this.currentPiece = JSON.parse(JSON.stringify(randomPiece));

    if (this.currentPiece) {
      this.currentPosition = { x: Math.floor(this.cols / 2) - Math.floor(this.currentPiece.shape[0].length / 2), y: 0 };
    }

    // Check if game over
    if (!this.isValidMove(this.currentPosition.x, this.currentPosition.y)) {
      this.endGame();
    }
  }

  private movePiece(dx: number, dy: number): void {
    if (!this.currentPiece) return;

    const newX = this.currentPosition.x + dx;
    const newY = this.currentPosition.y + dy;

    if (this.isValidMove(newX, newY)) {
      this.currentPosition.x = newX;
      this.currentPosition.y = newY;
    } else if (dy > 0) {
      // Lock piece and spawn new one
      this.lockPiece();
      const linesCleared = this.clearLines();
      if (linesCleared > 0) {
        this.updateScore(linesCleared);
      }
      this.spawnPiece();
    }
  }

  private rotatePiece(): void {
    if (!this.currentPiece) return;

    const rotated = this.rotate(this.currentPiece.shape);
    const originalShape = this.currentPiece.shape;
    this.currentPiece.shape = rotated;

    // Wall kick - try different positions
    let kicked = false;
    for (const offset of [0, 1, -1, 2, -2]) {
      if (this.isValidMove(this.currentPosition.x + offset, this.currentPosition.y)) {
        this.currentPosition.x += offset;
        kicked = true;
        break;
      }
    }

    if (!kicked) {
      this.currentPiece.shape = originalShape;
    }
  }

  private rotate(matrix: number[][]): number[][] {
    const n = matrix.length;
    const rotated = Array(n).fill(null).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        rotated[j][n - 1 - i] = matrix[i][j];
      }
    }

    return rotated;
  }

  private hardDrop(): void {
    if (!this.currentPiece) return;

    while (this.isValidMove(this.currentPosition.x, this.currentPosition.y + 1)) {
      this.currentPosition.y++;
      this.score.update(s => s + 2); // Bonus points for hard drop
    }

    this.lockPiece();
    const linesCleared = this.clearLines();
    if (linesCleared > 0) {
      this.updateScore(linesCleared);
    }
    this.spawnPiece();
  }

  private isValidMove(x: number, y: number): boolean {
    if (!this.currentPiece) return false;

    for (let row = 0; row < this.currentPiece.shape.length; row++) {
      for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
        if (this.currentPiece.shape[row][col]) {
          const newX = x + col;
          const newY = y + row;

          // Check boundaries
          if (newX < 0 || newX >= this.cols || newY >= this.rows) {
            return false;
          }

          // Check collision with existing blocks
          if (newY >= 0 && this.board[newY][newX]) {
            return false;
          }
        }
      }
    }

    return true;
  }

  private lockPiece(): void {
    if (!this.currentPiece) return;

    for (let row = 0; row < this.currentPiece.shape.length; row++) {
      for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
        if (this.currentPiece.shape[row][col]) {
          const y = this.currentPosition.y + row;
          const x = this.currentPosition.x + col;
          if (y >= 0) {
            this.board[y][x] = this.currentPiece.color;
          }
        }
      }
    }
  }

  private clearLines(): number {
    let linesCleared = 0;

    for (let row = this.rows - 1; row >= 0; row--) {
      if (this.board[row].every(cell => cell !== '')) {
        // Remove the line
        this.board.splice(row, 1);
        // Add new empty line at top
        this.board.unshift(Array(this.cols).fill(''));
        linesCleared++;
        row++; // Check same row again
      }
    }

    if (linesCleared > 0) {
      this.lines.update(l => l + linesCleared);

      // Update level every 10 lines
      const newLevel = Math.floor(this.lines() / 10) + 1;
      if (newLevel !== this.level()) {
        this.level.set(newLevel);
        this.dropInterval = Math.max(100, 1000 - (newLevel - 1) * 100);
      }
    }

    return linesCleared;
  }

  private updateScore(linesCleared: number): void {
    const points = [0, 100, 300, 500, 800];
    const baseScore = points[linesCleared] || 0;
    const levelMultiplier = this.level();
    this.score.update(s => s + baseScore * levelMultiplier);

    // Update high score
    if (this.score() > this.highScore()) {
      this.highScore.set(this.score());
      localStorage.setItem('tetrisHighScore', this.score().toString());
    }
  }

  private draw(): void {
    // Clear canvas
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Draw grid
    this.ctx.strokeStyle = '#16213e';
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= this.cols; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(i * this.blockSize, 0);
      this.ctx.lineTo(i * this.blockSize, this.canvasHeight);
      this.ctx.stroke();
    }
    for (let i = 0; i <= this.rows; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, i * this.blockSize);
      this.ctx.lineTo(this.canvasWidth, i * this.blockSize);
      this.ctx.stroke();
    }

    // Draw locked pieces
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.board[row][col]) {
          this.drawBlock(col, row, this.board[row][col]);
        }
      }
    }

    // Draw current piece
    if (this.currentPiece) {
      for (let row = 0; row < this.currentPiece.shape.length; row++) {
        for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
          if (this.currentPiece.shape[row][col]) {
            const x = this.currentPosition.x + col;
            const y = this.currentPosition.y + row;
            if (y >= 0) {
              this.drawBlock(x, y, this.currentPiece.color);
            }
          }
        }
      }
    }
  }

  private drawBlock(x: number, y: number, color: string): void {
    const padding = 2;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(
      x * this.blockSize + padding,
      y * this.blockSize + padding,
      this.blockSize - padding * 2,
      this.blockSize - padding * 2
    );

    // Add highlight for 3D effect
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.fillRect(
      x * this.blockSize + padding,
      y * this.blockSize + padding,
      this.blockSize - padding * 2,
      4
    );
    this.ctx.fillRect(
      x * this.blockSize + padding,
      y * this.blockSize + padding,
      4,
      this.blockSize - padding * 2
    );
  }

  private drawWelcomeScreen(): void {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.ctx.fillStyle = '#00f0f0';
    this.ctx.font = 'bold 32px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('TETRIS', this.canvasWidth / 2, this.canvasHeight / 2 - 40);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '18px Arial';
    this.ctx.fillText('Press SPACE', this.canvasWidth / 2, this.canvasHeight / 2 + 20);
    this.ctx.fillText('to Start', this.canvasWidth / 2, this.canvasHeight / 2 + 45);
  }

  private endGame(): void {
    this.gameStarted.set(false);
    this.gameOver.set(true);

    // Draw game over screen
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.ctx.fillStyle = '#f00000';
    this.ctx.font = 'bold 36px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GAME OVER', this.canvasWidth / 2, this.canvasHeight / 2 - 40);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '20px Arial';
    this.ctx.fillText(`Score: ${this.score()}`, this.canvasWidth / 2, this.canvasHeight / 2 + 10);
    this.ctx.fillText(`Lines: ${this.lines()}`, this.canvasWidth / 2, this.canvasHeight / 2 + 40);

    this.ctx.font = '16px Arial';
    this.ctx.fillText('Press SPACE', this.canvasWidth / 2, this.canvasHeight / 2 + 80);
    this.ctx.fillText('to Restart', this.canvasWidth / 2, this.canvasHeight / 2 + 100);
  }
}
