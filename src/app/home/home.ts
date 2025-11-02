import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
  standalone: true
})
export class Home {
  protected readonly name = signal('Inam Ahmad Saleh');
  protected readonly title = signal('Full Stack Developer & IT Solutions Specialist');
  protected readonly tagline = signal('Building innovative solutions with modern technologies');
}
