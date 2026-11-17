import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

const KNOWN_CODES = new Set([
  'PAT-DKR-001',
  'PAT-DKR-002',
  'PAT-ZIG-003',
  'PAT-SLN-004',
  'PAT-CAS-005',
  'PAT-DKR-006',
]);

@Component({
  selector: 'app-ui-patrimoine-image',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="heritage-media-wrap">
      <img
        [src]="resolvedSrc()"
        [alt]="nomPatrimoine()"
        class="heritage-img"
        loading="lazy"
        decoding="async"
        (error)="onImageError()"
      />
      @if (trimmedCode()) {
        <span class="heritage-code-pill">{{ trimmedCode() }}</span>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .heritage-media-wrap {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 190px;
      overflow: hidden;
      background-color: var(--surface-sand);
    }

    .heritage-img {
      width: 100%;
      height: 100%;
      min-height: 190px;
      object-fit: cover;
      display: block;
      transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
    }

    :host:hover .heritage-img {
      transform: scale(1.03);
    }

    .heritage-code-pill {
      position: absolute;
      bottom: var(--space-3);
      left: var(--space-3);
      padding: 0.2rem 0.65rem;
      border-radius: var(--radius-pill);
      background-color: rgba(24, 21, 18, 0.76);
      backdrop-filter: blur(6px);
      color: #faf6f0;
      font-size: var(--text-xs);
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      border: 1px solid rgba(255, 255, 255, 0.18);
    }
  `,
})
export class UiPatrimoineImageComponent {
  readonly codePatrimoine = input<string | null | undefined>(null);
  readonly nomPatrimoine = input<string>('Patrimoine culturel du Sénégal');
  readonly sobriete = input<boolean>(false);

  private readonly useFallback = signal<boolean>(false);

  protected readonly trimmedCode = computed(() => (this.codePatrimoine() ?? '').trim().toUpperCase());

  protected readonly contextualFallbackSrc = computed(() => {
    const code = this.trimmedCode();
    const name = (this.nomPatrimoine() ?? '').toLowerCase();
    if (this.sobriete() || name.includes('gorée') || name.includes('esclave')) {
      return '/images/patrimoines/PAT-DKR-001.jpg';
    }
    if (code.includes('ZIG') || name.includes('ziguinchor') || name.includes('cathédrale')) {
      return '/images/patrimoines/PAT-ZIG-003.jpg';
    }
    if (code.includes('CAS') || name.includes('casamance') || name.includes('impluvium') || name.includes('enampore')) {
      return '/images/patrimoines/PAT-CAS-005.jpg';
    }
    if (code.includes('SLN') || name.includes('saint-louis') || name.includes('faidherbe')) {
      return '/images/patrimoines/PAT-SLN-004.jpg';
    }
    if (name.includes('musée') || name.includes('ifan') || name.includes('monod')) {
      return '/images/patrimoines/PAT-DKR-006.jpg';
    }
    return '/images/patrimoines/PAT-DKR-002.jpg';
  });

  protected readonly resolvedSrc = computed(() => {
    const code = this.trimmedCode();
    if (!this.useFallback() && code && KNOWN_CODES.has(code)) {
      return `/images/patrimoines/${code}.jpg`;
    }
    return this.contextualFallbackSrc();
  });

  protected onImageError(): void {
    if (!this.useFallback()) {
      this.useFallback.set(true);
    }
  }
}
