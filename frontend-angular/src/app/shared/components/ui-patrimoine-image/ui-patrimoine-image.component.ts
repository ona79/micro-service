import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

const LOCAL_PATRIMOINE_ASSETS: Record<string, string> = {
  'PAT-ZIG-001': '/images/patrimoines/PAT-ZIG-001.svg',
  'PAT-CRB-002': '/images/patrimoines/PAT-CRB-002.webp',
  'PAT-ZIG-003': '/images/patrimoines/PAT-ZIG-003.webp',
  'PAT-OSS-004': '/images/patrimoines/PAT-OSS-004.webp',
  'PAT-CAS-005': '/images/patrimoines/PAT-CAS-005.webp',
  'PAT-SED-006': '/images/patrimoines/PAT-SED-006.svg',
  'PAT-OSS-007': '/images/patrimoines/PAT-OSS-007.webp',
  'PAT-KOL-008': '/images/patrimoines/PAT-KOL-008.webp',
  'PAT-DKR-001': '/images/patrimoines/PAT-DKR-001.webp',
  'PAT-DKR-002': '/images/patrimoines/PAT-DKR-002.webp',
  'PAT-SLN-004': '/images/patrimoines/PAT-SLN-004.webp',
  'PAT-DKR-006': '/images/patrimoines/PAT-DKR-006.webp',
};

const LEGACY_ASSET_FILENAME_MAP: Record<string, string> = {
  'memorial-joola.jpg': '/images/patrimoines/PAT-ZIG-001.svg',
  'carabane.jpg': '/images/patrimoines/PAT-CRB-002.webp',
  'cathedrale-zig.jpg': '/images/patrimoines/PAT-ZIG-003.webp',
  'bois-oussouye.jpg': '/images/patrimoines/PAT-OSS-004.webp',
  'enampore.jpg': '/images/patrimoines/PAT-CAS-005.webp',
  'fort-sedhiou.jpg': '/images/patrimoines/PAT-SED-006.svg',
  'mangrove-oussouye.jpg': '/images/patrimoines/PAT-OSS-007.webp',
  'reserve-kolda.jpg': '/images/patrimoines/PAT-KOL-008.webp',
};

@Component({
  selector: 'app-ui-patrimoine-image',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="heritage-media-wrap">
      <img
        [src]="resolvedSrc()"
        [attr.srcset]="resolvedSrcset()"
        sizes="(max-width: 640px) 100vw, 480px"
        [alt]="nomPatrimoine()"
        width="640"
        height="420"
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
      min-height: 120px;
      overflow: hidden;
      background-color: var(--surface-sand);
    }

    .heritage-img {
      width: 100%;
      height: 100%;
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
      padding: 0.22rem 0.65rem;
      border-radius: var(--radius-pill);
      background-color: rgba(24, 21, 18, 0.8);
      backdrop-filter: blur(6px);
      color: #faf6f0;
      font-size: var(--text-xs);
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
  `,
})
export class UiPatrimoineImageComponent {
  readonly codePatrimoine = input<string | null | undefined>(null);
  readonly nomPatrimoine = input<string>('Patrimoine culturel de Casamance');
  readonly imageUrl = input<string | null | undefined>(null);
  readonly sobriete = input<boolean>(false);

  private readonly useFallback = signal<boolean>(false);

  protected readonly trimmedCode = computed(() => (this.codePatrimoine() ?? '').trim().toUpperCase());

  protected readonly contextualFallbackSrc = computed(() => {
    const code = this.trimmedCode();
    const name = (this.nomPatrimoine() ?? '').toLowerCase();
    if (this.sobriete() || code.includes('ZIG-001') || name.includes('joola') || name.includes('mémorial')) {
      return LOCAL_PATRIMOINE_ASSETS['PAT-ZIG-001'];
    }
    if (code.includes('CRB') || name.includes('carabane')) {
      return LOCAL_PATRIMOINE_ASSETS['PAT-CRB-002'];
    }
    if (code.includes('OSS-004') || name.includes('bois sacré') || name.includes('fromager')) {
      return LOCAL_PATRIMOINE_ASSETS['PAT-OSS-004'];
    }
    if (code.includes('OSS') || name.includes('mangrove') || name.includes('bolong') || name.includes('eloubaline')) {
      return LOCAL_PATRIMOINE_ASSETS['PAT-OSS-007'];
    }
    if (code.includes('ZIG') || name.includes('ziguinchor') || name.includes('cathédrale')) {
      return LOCAL_PATRIMOINE_ASSETS['PAT-ZIG-003'];
    }
    if (code.includes('SED') || name.includes('sédhiou') || name.includes('sedhiou') || name.includes('fort')) {
      return LOCAL_PATRIMOINE_ASSETS['PAT-SED-006'];
    }
    if (code.includes('KOL') || name.includes('kolda') || name.includes('vélingara') || name.includes('réserve')) {
      return LOCAL_PATRIMOINE_ASSETS['PAT-KOL-008'];
    }
    if (code.includes('CAS') || name.includes('impluvium') || name.includes('enampore') || name.includes('casamance')) {
      return LOCAL_PATRIMOINE_ASSETS['PAT-CAS-005'];
    }
    if (name.includes('gorée') || name.includes('esclave')) {
      return LOCAL_PATRIMOINE_ASSETS['PAT-DKR-001'];
    }
    if (code.includes('SLN') || name.includes('saint-louis') || name.includes('faidherbe')) {
      return LOCAL_PATRIMOINE_ASSETS['PAT-SLN-004'];
    }
    return '/images/hero.webp';
  });

  protected readonly resolvedSrcset = computed(() => {
    const src = this.resolvedSrc();
    if (src.startsWith('/images/') && src.endsWith('.webp') && !src.endsWith('-640.webp')) {
      return `${src.slice(0, -5)}-640.webp 640w, ${src} 1200w`;
    }
    return null;
  });

  protected readonly resolvedSrc = computed(() => {
    const code = this.trimmedCode();
    const rawUrl = (this.imageUrl() ?? '').trim();

    if (!this.useFallback() && rawUrl) {
      if (rawUrl.startsWith('/assets/patrimoines/')) {
        const filename = rawUrl.split('/').pop()?.toLowerCase() ?? '';
        const mapped = LEGACY_ASSET_FILENAME_MAP[filename];
        if (mapped) {
          return mapped;
        }
      } else if (/^(https?:\/\/|\/images\/)/i.test(rawUrl)) {
        return rawUrl;
      }
    }

    if (!this.useFallback() && code && LOCAL_PATRIMOINE_ASSETS[code]) {
      return LOCAL_PATRIMOINE_ASSETS[code];
    }

    return this.contextualFallbackSrc();
  });

  protected onImageError(): void {
    if (!this.useFallback()) {
      this.useFallback.set(true);
    }
  }
}
