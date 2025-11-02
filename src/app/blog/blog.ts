import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Article {
  title: string;
  description: string;
  url: string;
  date: string;
  tags: string[];
  readTime: string;
  thumbnail: string;
}

@Component({
  selector: 'app-blog',
  imports: [CommonModule],
  templateUrl: './blog.html',
  styleUrl: './blog.css',
  standalone: true
})
export class Blog {
  protected readonly articles = signal<Article[]>([
    {
      title: 'How to Install FFmpeg on AWS Lambda and Make It Work',
      description: 'A comprehensive guide to installing and configuring FFmpeg on AWS Lambda for serverless video processing. Learn how to overcome the challenges of packaging FFmpeg for Lambda and get it running smoothly.',
      url: 'https://medium.com/@inamsaleh2024/how-to-install-ffmpeg-on-aws-lambda-and-make-it-work-cecbc76f2d0e',
      date: 'Published on Medium',
      tags: ['AWS Lambda', 'FFmpeg', 'Serverless', 'Video Processing'],
      readTime: '5 min read',
      thumbnail: '📹'
    },
    {
      title: 'How to Package a Library for Lambda Layer (Python)',
      description: 'Step-by-step tutorial on creating and packaging Python libraries as Lambda Layers. Master the art of dependency management in AWS Lambda to reduce deployment package size and improve code reusability.',
      url: 'https://medium.com/@inamsaleh2024/how-to-package-a-library-for-lambda-layer-python-eee36c288cb8',
      date: 'Published on Medium',
      tags: ['AWS Lambda', 'Python', 'Lambda Layers', 'DevOps'],
      readTime: '6 min read',
      thumbnail: '🐍'
    }
  ]);
}
