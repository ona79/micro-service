import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { LucideLandmark } from '@lucide/angular';

@Component({
  selector: 'app-ui-patrimoine-image',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideLandmark],
  template: `
    @if (showImage()) {
      <img
        [src]="imageSrc()"
        [alt]="nomPatrimoine()"
        class="heritage-img"
        loading="lazy"
        (error)="onImageError()"
      />
    } @else {
      <div
        class="heritage-plate"
        [class.heritage-plate--memorial]="sobriete()"
        role="img"
        [attr.aria-label]="nomPatrimoine()"
      >
        <div class="heritage-plate__frame">
          <div class="heritage-plate__icon" aria-hidden="true">
            <svg lucideLandmark [size]="24"></svg>
          </div>
          @if (trimmedCode()) {
            <span class="heritage-plate__code">{{ trimmedCode() }}</span>
          }
          <span class="heritage-plate__name">{{ nomPatrimoine() }}</span>
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .heritage-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .heritage-plate {
      width: 100%;
      height: 100%;
      min-height: 180px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-5);
      background:
        radial-gradient(circle at 85% 20%, rgba(178, 76, 41, 0.08), transparent 55%),
        linear-gradient(145deg, var(--surface-sand) 0%, var(--brand-soft) 100%);
      color: var(--brand-primary);
      text-align: center;
    }

    .heritage-plate--memorial {
      background: linear-gradient(
        145deg,
        var(--memorial-surface) 0%,
        var(--memorial-surface-alt) 100%
      );
      color: var(--memorial-ink);
    }

    .heritage-plate__frame {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-4) var(--space-5);
      border: 1px solid rgba(31, 81, 56, 0.16);
      border-radius: var(--radius-md);
      background-color: rgba(255, 255, 255, 0.62);
      max-width: 90%;
    }

    .heritage-plate--memorial .heritage-plate__frame {
      border-color: var(--memorial-border);
      background-color: rgba(255, 255, 255, 0.55);
    }

    .heritage-plate__icon {
      opacity: 0.85;
    }

    .heritage-plate__code {
      font-size: var(--text-xs);
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 0.15rem 0.6rem;
      border-radius: var(--radius-pill);
      background-color: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
    }

    .heritage-plate__name {
      font-family: var(--font-display);
      font-size: var(--text-md);
      font-weight: 600;
      line-height: 1.3;
    }
  `,
})
export class UiPatrimoineImageComponent {
  readonly codePatrimoine = input<string | null | undefined>(null);
  readonly nomPatrimoine = input<string>('Patrimoine culturel');
  readonly sobriete = input<boolean>(false);

  private readonly erroredCode = signal<string | null>(null);

  protected readonly trimmedCode = computed(() => (this.codePatrimoine() ?? '').trim());
  protected readonly imageSrc = computed(() =>
    this.trimmedCode() ? `/images/patrimoines/${this.trimmedCode()}.jpg` : ''
  );
  protected readonly showImage = computed(
    () => Boolean(this.trimmedCode()) && this.erroredCode() !== this.trimmedCode()
  );

  protected onImageError(): void {
    this.erroredCode.set(this.trimmedCode());
  }
}
