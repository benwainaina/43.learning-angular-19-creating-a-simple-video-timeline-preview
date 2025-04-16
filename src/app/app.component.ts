import {
  Component,
  ElementRef,
  HostListener,
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
import { DOCUMENT } from '@angular/common';

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
  private filledProgress: Signal<ElementRef<HTMLDivElement> | undefined> =
    viewChild('filledProgress');
  private indicatorThumbElementRef: Signal<
    ElementRef<HTMLDivElement> | undefined
  > = viewChild('indicatorThumbElementRef');
  private wrapperElement: Signal<ElementRef<HTMLDivElement> | undefined> =
    viewChild('wrapperElement');

  private renderer2: Renderer2 = inject(Renderer2);
  private document: Document = inject(DOCUMENT);
  private videoDurationInMilliSeconds: number = 0;
  private videoSampler!: HTMLVideoElement;
  private videoSamplerRect: WritableSignal<DOMRect | null> = signal(null);
  private addedSampler: boolean = false;
  // private thumbClicked: boolean = false;
  private isScrubbing: boolean = false;
  private scrubbingAtPosition: number = 0;

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
    this.listenForMouseUpOnDocument();
  }

  private listenForMouseUpOnDocument() {
    this.document.addEventListener('mouseup', (ev) => {
      if (this.isScrubbing) {
        this.toggleVideoPlay(true);
        this.isScrubbing = false;
        if (this.scrubbingAtPosition > 0) {
          this.jumpVideoToSeekTime(this.scrubbingAtPosition);
        }
      }
    });
  }

  private configureVideoPlayer() {
    const videoOutlet = this.videoOutlet();
    if (videoOutlet) {
      videoOutlet.nativeElement.muted = true; // read this from the local storage
      videoOutlet.nativeElement.autoplay = true;
      videoOutlet.nativeElement.oncanplay = (ev: any) => {
        this.videoDurationInMilliSeconds = ev.target.duration * 1000;
        if (!this.addedSampler) {
          this.listenForPreviewIntent();
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
    if (video && !this.isScrubbing) {
      this.updateVideoProgressIndicators(
        ((video.currentTime * 1000) / this.videoDurationInMilliSeconds) * 100,
        filledProgress,
        indicatorThumb
      );
    }
  }

  private updateVideoProgressIndicators(
    percentCovered: number,
    filledProgress?: HTMLDivElement,
    indicatorThumb?: HTMLDivElement
  ) {
    if (percentCovered > 100) {
      return;
    }
    if (filledProgress && indicatorThumb) {
      this.commonSetStyle(filledProgress, 'width', `${percentCovered}%`);
      this.commonSetStyle(indicatorThumb, 'left', `${percentCovered}%`);
    }
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
      // remove any registered event listeners

      videoProgressWrapperElementRef.nativeElement.removeEventListener(
        'mousemove',
        (ev) => onMouseMove(ev)
      );
      videoProgressWrapperElementRef.nativeElement.removeEventListener(
        'mouseleave',
        (ev) => onMouseLeave(ev)
      );
      videoProgressWrapperElementRef.nativeElement.removeEventListener(
        'mousedown',
        (ev) => onMouseDown(ev)
      );

      const { width: videoProgressWrapperElementRefWidth } =
        videoProgressWrapperElementRef?.nativeElement.getBoundingClientRect();

      // on mouse move, adjust position and the preview content
      videoProgressWrapperElementRef.nativeElement.addEventListener(
        'mousemove',
        (ev) => onMouseMove(ev)
      );

      // on mouse leave, hide the preview
      videoProgressWrapperElementRef.nativeElement.addEventListener(
        'mouseleave',
        (ev) => onMouseLeave(ev)
      );

      // listen for mouse click on video timeline
      videoProgressWrapperElementRef.nativeElement.addEventListener(
        'mousedown',
        (ev) => onMouseDown(ev)
      );

      const onMouseMove = (ev: MouseEvent) => {
        {
          this.commonSetStyle(this.videoSampler, 'visibility', 'visible');
          const { clientX } = ev;

          const { x: wrapperOffsetX } = this.getWrapperBoundingClient() || {
            x: 0,
          };

          let samplerPositionX =
            clientX -
            (this.videoSamplerRect()?.width || 0) / 2 -
            wrapperOffsetX;

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

          if (this.isScrubbing && videoOutlet) {
            const seekTime = this.convertWidthToTimelinePositionInSeconds(
              videoProgressWrapperElementRefWidth,
              clientX - wrapperOffsetX
            );
            this.videoSampler.currentTime = seekTime;
            videoOutlet.nativeElement.currentTime = seekTime;
            this.scrubbingAtPosition = seekTime;
            this.updateVideoProgressIndicators(
              ((seekTime * 1000) / this.videoDurationInMilliSeconds) * 100,
              this.filledProgress()?.nativeElement,
              this.indicatorThumbElementRef()?.nativeElement
            );
          }
        }
      };

      const onMouseLeave = (ev: MouseEvent) => {
        console.log('mouse leave');
        if (this.isScrubbing) {
          this.toggleVideoPlay(false);
        }
        this.commonSetStyle(this.videoSampler, 'visibility', 'hidden');
      };

      const onMouseDown = (ev: MouseEvent) => {
        this.isScrubbing = true;
        const videoOutlet = this.videoOutlet();
        if (videoOutlet) {
          const { x: wrapperOffsetX } = this.getWrapperBoundingClient() || {
            x: 0,
          };
          const seektime = this.convertWidthToTimelinePositionInSeconds(
            videoProgressWrapperElementRefWidth,
            ev.clientX - wrapperOffsetX
          );
          videoOutlet.nativeElement.currentTime = seektime;
          this.scrubbingAtPosition = seektime;
          this.updateVideoProgressIndicators(
            ((seektime * 1000) / this.videoDurationInMilliSeconds) * 100,
            this.filledProgress()?.nativeElement,
            this.indicatorThumbElementRef()?.nativeElement
          );
          this.commonSetStyle(this.videoSampler, 'visibility', 'hidden');
        }
      };
    }
  }

  private jumpVideoToSeekTime(scrubbingAtPosition: number) {
    const videoOutlet = this.videoOutlet();
    if (videoOutlet) {
      videoOutlet.nativeElement.currentTime = scrubbingAtPosition;
    }
  }

  public toggleVideoPlay(playVideo: boolean) {
    this.isPlaying = playVideo;
    this.isPlaying
      ? this.videoOutlet()?.nativeElement.play()
      : this.videoOutlet()?.nativeElement.pause();
  }

  private convertWidthToTimelinePositionInSeconds(
    totalWidth: number,
    targetPosition: number
  ): number {
    return (
      (this.videoDurationInMilliSeconds * (targetPosition / totalWidth)) / 1000
    );
  }

  @HostListener('window:resize', ['$event'])
  private onWindowResize() {
    this.styleVideoPreview();
    this.listenForPreviewIntent();
  }

  private getWrapperBoundingClient(): DOMRect | undefined {
    return this.wrapperElement()?.nativeElement.getBoundingClientRect();
  }
}
