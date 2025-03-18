import {
  Component,
  ElementRef,
  OnInit,
  Signal,
  viewChild,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatIconModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private videoOutlet: Signal<ElementRef<HTMLVideoElement> | undefined> =
    viewChild<ElementRef<HTMLVideoElement>>('video');
  private canvasOutlet: Signal<ElementRef<HTMLCanvasElement> | undefined> =
    viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  public allowPreview: boolean = false;
  public isPlaying: boolean = false;
  public isMuted: boolean = false;

  ngOnInit() {
    this.configureVideoPlayer();
  }

  private configureVideoPlayer() {
    const videoOutlet = this.videoOutlet();
    const canvasOutlet = this.canvasOutlet();
    if (videoOutlet && canvasOutlet) {
      videoOutlet.nativeElement.muted = true;
    }
  }

  public projectPreviewToCanvas() {
    const videoOutlet = this.videoOutlet();
    const canvasOutlet = this.canvasOutlet();
    if (videoOutlet && canvasOutlet) {
      const { width, height } =
        videoOutlet.nativeElement.getBoundingClientRect();
      videoOutlet.nativeElement.oncanplay = () => {
        this.allowPreview = true;
        const context = canvasOutlet.nativeElement.getContext('2d');
        context?.drawImage(videoOutlet.nativeElement, 0, 0, width, height);
        const frame = context?.getImageData(0, 0, width, height);
        if (frame) {
          context?.putImageData(frame, 0, 0);
        }
      };
    }
  }

  public toggleVideoPlay() {
    this.isPlaying = !this.isPlaying;
    this.isPlaying
      ? this.videoOutlet()?.nativeElement.play()
      : this.videoOutlet()?.nativeElement.pause();
  }

  public toggleMuted() {
    this.isMuted = !this.isMuted;
    const videoOutlet = this.videoOutlet();
    if (videoOutlet) {
      videoOutlet.nativeElement.muted = this.isMuted;
    }
  }
}
