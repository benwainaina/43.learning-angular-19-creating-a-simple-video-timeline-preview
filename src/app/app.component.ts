import { Component, ElementRef, Signal, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private videoOutlet: Signal<ElementRef<HTMLVideoElement> | undefined> =
    viewChild<ElementRef<HTMLVideoElement>>('video');
  private canvasOutlet: Signal<ElementRef<HTMLCanvasElement> | undefined> =
    viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  ngOnInit() {
    this.projectToCanvas();
  }

  private projectToCanvas() {
    const videoOutlet = this.videoOutlet();
    const canvasOutlet = this.canvasOutlet();
    if (videoOutlet && canvasOutlet) {
      videoOutlet.nativeElement.play();
      const { width, height } =
        videoOutlet.nativeElement.getBoundingClientRect();
      videoOutlet.nativeElement.oncanplay = () => {
        const context = canvasOutlet.nativeElement.getContext('2d');
        context?.drawImage(videoOutlet.nativeElement, 0, 0, width, height);
        const frame = context?.getImageData(0, 0, width, height);
        if (frame) {
          context?.putImageData(frame, 0, 0);
        }
      };
      videoOutlet.nativeElement.currentTime = 28;
    }
  }
}
