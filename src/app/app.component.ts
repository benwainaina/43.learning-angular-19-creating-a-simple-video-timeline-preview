import {
  Component,
  ElementRef,
  inject,
  OnInit,
  Renderer2,
  signal,
  Signal,
  viewChild,
  WritableSignal,
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
  private videoProgressWrapperElementRef: Signal<
    ElementRef<HTMLVideoElement> | undefined
  > = viewChild('videoProgressWrapperElementRef');
  private videoOutlet: Signal<ElementRef<HTMLVideoElement> | undefined> =
    viewChild('video');
  // private canvasOutlet: Signal<ElementRef<HTMLCanvasElement> | undefined> =
  //   viewChild('canvas');
  private filledProgress: Signal<ElementRef<HTMLDivElement> | undefined> =
    viewChild('filledProgress');
  private indicatorThumbElementRef: Signal<
    ElementRef<HTMLDivElement> | undefined
  > = viewChild('indicatorThumbElementRef');
  private wrapperElement: Signal<ElementRef<HTMLDivElement> | undefined> =
    viewChild('wrapperElement');
  private renderer2: Renderer2 = inject(Renderer2);
  private videoDurationInMilliSeconds: number = 0;
  private videoSampler!: HTMLVideoElement;
  private videoSamplerRect: WritableSignal<DOMRect | null> = signal(null);

  public allowPreview: boolean = false;
  public isPlaying: boolean = false;
  public isMuted: boolean = false;
  public playBackRate: number = 1;
  public videoSources: Array<{ source: string; type: string }> = [
    {
      source: 'test.mp4',
      type: 'video/webm',
    },
    {
      source: 'test.mp4',
      type: 'video/mp4',
    },
  ];

  ngOnInit() {
    this.configureVideoPlayer();
    this.controlVideoProgressDisplay();
  }

  private configureVideoPlayer() {
    const videoOutlet = this.videoOutlet();
    if (videoOutlet) {
      videoOutlet.nativeElement.muted = true; // read this from the local storage
      videoOutlet.nativeElement.autoplay = true;
      videoOutlet.nativeElement.oncanplay = (ev: any) => {
        this.videoDurationInMilliSeconds = ev.target.duration * 1000;
        this.preSampleVideoFrames(videoOutlet.nativeElement);
        this.listenForPreviewIntent();
      };
    }
  }

  private preSampleVideoFrames(videoOutlet: HTMLVideoElement) {
    this.videoSampler = videoOutlet.cloneNode(true) as HTMLVideoElement;
    this.videoSampler.autoplay = false;
    this.videoSampler.muted = true;
    const wrapperElement = this.wrapperElement();
    if (wrapperElement) {
      wrapperElement.nativeElement.appendChild(this.videoSampler);
      this.styleVideoPreview();
    }
  }

  private styleVideoPreview() {
    const videoProgressWrapperElementRef =
      this.videoProgressWrapperElementRef();
    if (videoProgressWrapperElementRef) {
      const { y: progressWrapperY, height: progressWrapperHeight } =
        videoProgressWrapperElementRef.nativeElement.getBoundingClientRect();
      this.commonSetStyle(this.videoSampler, 'position', 'absolute');
      this.commonSetStyle(this.videoSampler, 'width', '160px');
      this.commonSetStyle(this.videoSampler, 'aspect-ratio', '2');
      this.commonSetStyle(this.videoSampler, 'visibility', 'hidden');
      this.videoSamplerRect.set(this.videoSampler.getBoundingClientRect());
      this.commonSetStyle(
        this.videoSampler,
        'top',
        `${
          progressWrapperY -
          (this.videoSamplerRect()?.height || 0) -
          progressWrapperHeight
        }px`
      );
    }
  }

  private controlVideoProgressDisplay() {
    const video = this.videoOutlet();
    const filledProgress = this.filledProgress();
    const indicatorThumb = this.indicatorThumbElementRef();
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

  private listenForPreviewIntent() {
    const videoProgressWrapperElementRef =
      this.videoProgressWrapperElementRef();
    if (videoProgressWrapperElementRef) {
      const { width: videoProgressWrapperElementRefWidth } =
        videoProgressWrapperElementRef?.nativeElement.getBoundingClientRect();

      // on mouse enter, show the preview

      videoProgressWrapperElementRef.nativeElement.addEventListener(
        'mouseenter',
        () => this.commonSetStyle(this.videoSampler, 'visibility', 'visible')
      );

      // on mouse move, adjust position and the preview content
      videoProgressWrapperElementRef.nativeElement.addEventListener(
        'mousemove',
        (ev) => {
          const { clientX } = ev;

          // block moving preview past the available area

          let samplerPositionX =
            clientX - (this.videoSamplerRect()?.width || 0) / 2;

          if (
            samplerPositionX + (this.videoSamplerRect()?.width || 0) >
            videoProgressWrapperElementRefWidth
          ) {
            samplerPositionX =
              videoProgressWrapperElementRefWidth -
              (this.videoSamplerRect()?.width || 0);
          } else if (samplerPositionX < 0) {
            samplerPositionX = 0;
          }

          this.commonSetStyle(
            this.videoSampler,
            'left',
            `${samplerPositionX}px`
          );
          const percentageFromStart =
            clientX / videoProgressWrapperElementRefWidth;
          const soughtPositionInSeconds = Math.floor(
            (this.videoDurationInMilliSeconds * percentageFromStart) / 1000
          );
          this.videoSampler.currentTime = soughtPositionInSeconds;
        }
      );

      // on mouse leave, hide the preview
      videoProgressWrapperElementRef.nativeElement.addEventListener(
        'mouseleave',
        (ev) => {
          this.commonSetStyle(this.videoSampler, 'visibility', 'hidden');
        }
      );
    }
  }
}

/**
 * TODOS:
 *
 * 1. Listen for clicking on a seek positions and play main video at that position.
 * 2. Hovering on the thumb trigers mouse leave event
 * 3. Listen for resizing and compute preview position
 */
