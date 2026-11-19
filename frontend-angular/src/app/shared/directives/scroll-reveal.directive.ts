import {
  AfterViewInit,
  Directive,
  ElementRef,
  OnDestroy,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

export type ScrollRevealVariant =
  | 'fade-up'
  | 'slide-left'
  | 'slide-right'
  | 'zoom-in'
  | 'clip-reveal';

@Directive({
  selector: '[appScrollReveal]',
  standalone: true,
  host: {
    '[class.sr-reveal]': 'true',
    '[class.sr-reveal--visible]': 'isVisible()',
    '[attr.data-sr-variant]': 'variant()',
    '[style.--sr-delay]': 'delayMs() + "ms"',
  },
})
export class ScrollRevealDirective implements AfterViewInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer: IntersectionObserver | null = null;

  readonly variant = input<ScrollRevealVariant>('fade-up', { alias: 'appScrollReveal' });
  readonly delayMs = input<number>(0);
  readonly threshold = input<number>(0.14);

  readonly revealed = output<void>();

  protected readonly isVisible = signal<boolean>(false);

  ngAfterViewInit(): void {
    const prefersReduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      this.isVisible.set(true);
      this.revealed.emit();
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.isVisible.set(true);
            this.revealed.emit();
            this.observer?.disconnect();
            this.observer = null;
            break;
          }
        }
      },
      {
        threshold: this.threshold(),
        rootMargin: '0px 0px -40px 0px',
      }
    );

    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
