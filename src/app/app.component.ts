import {
  Component,
  ElementRef,
  inject,
  OnInit,
  Renderer2,
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
    viewChild('video');
  private canvasOutlet: Signal<ElementRef<HTMLCanvasElement> | undefined> =
    viewChild('canvas');
  private filledProgress: Signal<ElementRef<HTMLDivElement> | undefined> =
    viewChild('filledProgress');
  private indicatorThumb: Signal<ElementRef<HTMLDivElement> | undefined> =
    viewChild('indicatorThumb');

  private renderer2: Renderer2 = inject(Renderer2);

  public allowPreview: boolean = false;
  public isPlaying: boolean = false;
  public isMuted: boolean = false;
  public playBackRate: number = 1;
  private videoDurationInMilliSeconds: number = 0;

  ngOnInit() {
    this.configureVideoPlayer();
    this.controlVideoProgressDisplay();
  }

  private configureVideoPlayer() {
    const videoOutlet = this.videoOutlet();
    const canvasOutlet = this.canvasOutlet();
    if (videoOutlet && canvasOutlet) {
      videoOutlet.nativeElement.muted = true; // read this from the local storage
      videoOutlet.nativeElement.oncanplay = (ev: any) => {
        this.videoDurationInMilliSeconds = ev.target.duration * 1000;
      };
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

  private controlVideoProgressDisplay() {
    const video = this.videoOutlet();
    const filledProgress = this.filledProgress();
    const indicatorThumb = this.indicatorThumb();
    let playInterval: any;
    if (video) {
      video.nativeElement.onplay = (ev) => {
        playInterval = setInterval(() => {
          const percentCovered = `${
            ((video.nativeElement.currentTime * 1000) /
              this.videoDurationInMilliSeconds) *
            100
          }%`;
          if (filledProgress && indicatorThumb) {
            this.commonSetStyle(
              filledProgress.nativeElement,
              'width',
              percentCovered
            );
            this.commonSetStyle(
              indicatorThumb.nativeElement,
              'left',
              percentCovered
            );
          }
        }, this.playBackRate * 1);
      };
      video.nativeElement.onpause = (ev) => {
        clearInterval(playInterval);
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

  private commonSetStyle(element: any, style: string, styleValue: string) {
    this.renderer2.setStyle(element, style, styleValue);
  }
}
