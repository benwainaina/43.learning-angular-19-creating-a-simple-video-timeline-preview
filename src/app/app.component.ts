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
  private addedSampler: boolean = false;
  private thumbClicked: boolean = false;

  public allowPreview: boolean = false;
  public isPlaying: boolean = true;
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
        this.listenForPreviewIntent();
        this.listenForThumbDragEvent();
        if (!this.addedSampler) {
          this.preSampleVideoFrames(videoOutlet.nativeElement);
          this.addedSampler = true;
        }
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
          if (filledProgress && indicatorThumb) {
            this.updateVideoProgress(
              video.nativeElement,
              filledProgress.nativeElement,
              indicatorThumb.nativeElement
            );
          }
        }, this.playBackRate * 1);
      };
      video.nativeElement.onpause = (ev) => {
        clearInterval(playInterval);
      };
    }
  }

  private updateVideoProgress(
    video?: HTMLVideoElement,
    filledProgress?: HTMLDivElement,
    indicatorThumb?: HTMLDivElement
  ) {
    if (video && filledProgress && indicatorThumb) {
      const percentCovered = `${
        ((video.currentTime * 1000) / this.videoDurationInMilliSeconds) * 100
      }%`;
      this.commonSetStyle(filledProgress, 'width', percentCovered);
      this.commonSetStyle(indicatorThumb, 'left', percentCovered);
    }
  }

  public toggleVideoPlay() {
    this.isPlaying = !this.isPlaying;
    console.log('this.isPlaying', this.isPlaying);
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
    const videoOutlet = this.videoOutlet();
    if (videoProgressWrapperElementRef) {
      const { width: videoProgressWrapperElementRefWidth } =
        videoProgressWrapperElementRef?.nativeElement.getBoundingClientRect();

      // on mouse move, adjust position and the preview content
      videoProgressWrapperElementRef.nativeElement.addEventListener(
        'mousemove',
        (ev) => {
          this.commonSetStyle(this.videoSampler, 'visibility', 'visible');
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
          const seekTime = this.convertWidthToTimelinePositionInSeconds(
            videoProgressWrapperElementRefWidth,
            clientX
          );
          this.videoSampler.currentTime = seekTime;

          if (this.thumbClicked && videoOutlet) {
            videoOutlet.nativeElement.currentTime = seekTime;
          }
        }
      );

      // on mouse leave, hide the preview
      videoProgressWrapperElementRef.nativeElement.addEventListener(
        'mouseleave',
        (ev) => {
          if (this.thumbClicked) {
            this.thumbClicked = false;
            this.toggleVideoPlay();
          }
          this.commonSetStyle(this.videoSampler, 'visibility', 'hidden');
        }
      );

      // listen for mouse click on video timeline
      videoProgressWrapperElementRef.nativeElement.addEventListener(
        'mousedown',
        (ev) => {
          const videoOutlet = this.videoOutlet();
          if (videoOutlet) {
            videoOutlet.nativeElement.currentTime =
              this.convertWidthToTimelinePositionInSeconds(
                videoProgressWrapperElementRefWidth,
                ev.clientX
              );
            this.updateVideoProgress(
              this.videoOutlet()?.nativeElement,
              this.filledProgress()?.nativeElement,
              this.indicatorThumbElementRef()?.nativeElement
            );
            this.commonSetStyle(this.videoSampler, 'visibility', 'hidden');
          }
        }
      );
    }
  }

  private listenForThumbDragEvent() {
    const indicatorThumb = this.indicatorThumbElementRef();
    if (indicatorThumb) {
      indicatorThumb.nativeElement.addEventListener('mousedown', (ev) => {
        this.thumbClicked = true;
        this.toggleVideoPlay();
        ev.stopImmediatePropagation();
      });
      indicatorThumb.nativeElement.addEventListener('mouseup', (ev) => {
        this.toggleVideoPlay();
        this.thumbClicked = false;
      });
    }
  }

  private convertWidthToTimelinePositionInSeconds(
    totalWidth: number,
    targetPosition: number
  ): number {
    return (
      (this.videoDurationInMilliSeconds * (targetPosition / totalWidth)) / 1000
    );
  }
}

// TODO
// 3. Listen for resizing and compute preview position
// 4. Dragging the thum should update the video play

// DONE
// 1. Listen for clicking on a seek positions and play main video at that position.
// 2. Hovering on the thumb trigers mouse leave event
