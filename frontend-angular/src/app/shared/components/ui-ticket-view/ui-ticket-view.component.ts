import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Billet, formatBilletStatusLabel, billetStatusBadgeClass } from '../../../core/models/billet.model';
import { BilletApiService } from '../../../features/reservations/data-access/billet-api.service';

interface BilletWithQr extends Billet {
  qrDataUrl?: string;
}

@Component({
  selector: 'app-ui-ticket-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div
      class="ticket-view-container"
      [class.ticket-view-container--printing]="isPrinting()"
    >
      <div class="ticket-view-header no-print">
        <div class="ticket-view-header__info">
          <h2 class="ticket-view-header__title">
            <span class="ticket-view-header__badge">E-Billetterie</span>
            Billets Électroniques d'Accès ({{ billetsWithQr().length }})
          </h2>
          <p class="ticket-view-header__sub">
            Présentez ce QR code à l'entrée du site touristique ou auprès du guide responsable.
          </p>
        </div>
        <div class="ticket-view-header__actions">
          @if (showPrintButton() && billetsWithQr().length > 0) {
            <button type="button" class="btn-print" (click)="imprimer()">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              <span>{{ billetsWithQr().length > 1 ? 'Imprimer les ' + billetsWithQr().length + ' billets' : 'Imprimer le billet' }}</span>
            </button>
          }
          @if (showCloseButton()) {
            <button type="button" class="btn-close" (click)="close.emit()">
              Fermer
            </button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="ticket-loading no-print">
          <div class="spinner"></div>
          <p>Génération et chargement des billets d'accès sécurisés...</p>
        </div>
      } @else if (billetsWithQr().length === 0) {
        <div class="ticket-empty no-print">
          <p>Aucun billet électronique disponible pour cette réservation.</p>
        </div>
      } @else {
        <div class="tickets-grid">
          @for (billet of billetsWithQr(); track billet.numeroBillet || billet.tokenQr || billet.id) {
            <article
              class="ticket-card"
              [class.ticket-card--consomme]="billet.statut === 'CONSOMME'"
              [class.ticket-card--annule]="billet.statut === 'ANNULE'"
              [class.ticket-card--hide-on-print]="printingTicketKey() !== null && printingTicketKey() !== getTicketKey(billet)"
            >
              <!-- En-tête officiel du billet -->
              <div class="ticket-card__header">
                <div class="ticket-brand">
                  <span class="ticket-brand__logo">🌿 CASAMANCE PATRIMOINE</span>
                  <span class="ticket-brand__inst">UASZ — Licence 3 Informatique</span>
                </div>
                <div class="ticket-card__header-right">
                  <span [class]="getBadgeClass(billet.statut)">
                    {{ getStatusLabel(billet.statut) }}
                  </span>
                  @if (showPrintButton() && billetsWithQr().length > 1) {
                    <button
                      type="button"
                      class="btn-print-single no-print"
                      (click)="imprimerUnSeul(billet)"
                      title="Imprimer uniquement ce billet"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                        <rect x="6" y="14" width="12" height="8"/>
                      </svg>
                      <span>Imprimer ce billet</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Corps principal : QR Code + Informations -->
              <div class="ticket-card__body">
                <!-- Zone QR Code -->
                <div class="ticket-qr-zone">
                  @if (billet.qrDataUrl) {
                    <img [src]="billet.qrDataUrl" [alt]="'QR Code ' + cleanHash(billet.numeroBillet)" class="ticket-qr-img" />
                  } @else {
                    <div class="ticket-qr-placeholder">Génération QR...</div>
                  }
                  <span class="ticket-qr-caption">Scanner au point d'accès</span>
                </div>

                <!-- Informations Prestation & Bénéficiaire -->
                <div class="ticket-info-zone">
                  <div class="ticket-info-field">
                    <span class="field-label">Bénéficiaire / Porteur</span>
                    <span class="field-value field-value--highlight">{{ cleanHash(billet.nomBeneficiaire) }}</span>
                  </div>

                  <div class="ticket-info-field">
                    <span class="field-label">Visite / Prestation</span>
                    <span class="field-value field-value--prestation">{{ formatPrestationName(billet.nomPrestation) }}</span>
                  </div>

                  <div class="ticket-info-row">
                    <div class="ticket-info-field">
                      <span class="field-label">Date prévue</span>
                      <span class="field-value">{{ billet.datePrestation || 'Non renseignée' }}</span>
                    </div>
                    @if (billet.creneauPrestation) {
                      <div class="ticket-info-field">
                        <span class="field-label">Créneau horaire</span>
                        <span class="field-value">{{ cleanHash(billet.creneauPrestation) }}</span>
                      </div>
                    }
                  </div>

                  <div class="ticket-info-row">
                    <div class="ticket-info-field">
                      <span class="field-label">N° de Billet</span>
                      <span class="field-code">{{ cleanHash(billet.numeroBillet) }}</span>
                    </div>
                    <div class="ticket-info-field">
                      <span class="field-label">Réf. Réservation</span>
                      <span class="field-code">{{ cleanHash(billet.referenceReservation) }}</span>
                    </div>
                  </div>

                  @if (billet.statut === 'CONSOMME') {
                    <div class="ticket-scan-verified">
                      ✓ Validé le {{ formatDateTime(billet.dateUtilisation) }} par {{ billet.validePar || 'Gestionnaire' }}
                    </div>
                  }
                </div>
              </div>

              <!-- Bas de ticket avec découpe perforée visuelle -->
              <div class="ticket-card__footer">
                <span class="ticket-security-notice">
                  🔒 Billet personnel infalsifiable à usage unique. Tout duplicata ou double-scan sera rejeté par le système.
                </span>
                <span class="ticket-security-token">Token : {{ billet.tokenQr.substring(0, 16) }}...</span>
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .ticket-view-container {
      background-color: var(--surface-sand, #fdfbf7);
      border-radius: var(--radius-lg, 12px);
      padding: var(--space-6, 24px);
    }

    .ticket-view-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-6, 24px);
      gap: 16px;
      flex-wrap: wrap;
    }

    .ticket-view-header__title {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--ink-primary, #1e293b);
      margin: 0 0 4px 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .ticket-view-header__badge {
      display: inline-block;
      padding: 3px 10px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background-color: var(--color-brand-mangrove, #153d30);
      color: #ffffff;
      border-radius: 9999px;
    }

    .ticket-view-header__sub {
      margin: 0;
      font-size: 0.88rem;
      color: var(--color-text-secondary, #3d4942);
    }

    .ticket-view-header__actions {
      display: flex;
      gap: 10px;
    }

    .btn-print {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background-color: var(--color-brand-forest, #28634b);
      color: #ffffff;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .btn-print:hover {
      background-color: var(--color-brand-forest-hover, #1e4e3a);
    }

    .btn-print-single {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 11px;
      border-radius: 999px;
      border: 1px solid var(--border-strong, #cbd5e1);
      background-color: #ffffff;
      color: var(--brand-primary, #245b45);
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
    }

    .btn-print-single:hover {
      background-color: var(--brand-soft, #e4efe9);
      border-color: var(--brand-primary, #245b45);
    }

    .btn-close {
      background-color: transparent;
      border: 1px solid var(--border-strong, #cbd5e1);
      color: var(--color-text-primary, #161f1b);
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
    }

    .ticket-loading, .ticket-empty {
      text-align: center;
      padding: 32px;
      color: #64748b;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e2e8f0;
      border-top-color: #047857;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 12px auto;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Grille de billets */
    .tickets-grid {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .ticket-card {
      background: #ffffff;
      border: 2px solid #e2e8f0;
      border-left: 8px solid var(--color-brand-forest, #28634b);
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      overflow: hidden;
      position: relative;
    }

    .ticket-card--consomme {
      border-left-color: #94a3b8;
      background-color: #f8fafc;
    }

    .ticket-card--annule {
      border-left-color: #ef4444;
      background-color: #fef2f2;
    }

    .ticket-card__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      background-color: #f8fafc;
      border-bottom: 1px dashed #cbd5e1;
      gap: 10px;
      flex-wrap: wrap;
    }

    .ticket-card__header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ticket-brand {
      display: flex;
      flex-direction: column;
    }

    .ticket-brand__logo {
      font-size: 0.88rem;
      font-weight: 800;
      color: var(--color-brand-mangrove, #153d30);
      letter-spacing: 0.03em;
    }

    .ticket-brand__inst {
      font-size: 0.72rem;
      color: var(--color-text-secondary, #3d4942);
    }

    .ticket-card__body {
      display: flex;
      gap: 24px;
      padding: 20px;
      align-items: center;
    }

    @media (max-width: 640px) {
      .ticket-card__body {
        flex-direction: column;
        text-align: center;
      }
    }

    .ticket-qr-zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      min-width: 140px;
    }

    .ticket-qr-img {
      width: 130px;
      height: 130px;
      display: block;
    }

    .ticket-qr-placeholder {
      width: 130px;
      height: 130px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .ticket-qr-caption {
      margin-top: 6px;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #064e3b;
    }

    .ticket-info-zone {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .ticket-info-field {
      display: flex;
      flex-direction: column;
    }

    .field-label {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 2px;
    }

    .field-value {
      font-size: 0.95rem;
      color: #1e293b;
      font-weight: 600;
    }

    .field-value--highlight {
      font-size: 1.15rem;
      font-weight: 800;
      color: #0f172a;
    }

    .field-value--prestation {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--color-brand-forest, #28634b);
    }

    .field-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.85rem;
      background-color: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      color: #0f172a;
      display: inline-block;
      width: fit-content;
    }

    .ticket-info-row {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }

    .ticket-scan-verified {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background-color: var(--color-status-success-bg, #ecfdf5);
      border: 1px solid var(--color-status-success-border, #a7f3d0);
      color: var(--color-status-success-ink, #1e4e3a);
      font-size: 0.8rem;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 6px;
    }

    .ticket-card__footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 20px;
      background-color: #fafafa;
      border-top: 1px dashed #e2e8f0;
      font-size: 0.7rem;
      color: #64748b;
      flex-wrap: wrap;
      gap: 8px;
    }

    .ticket-security-token {
      font-family: monospace;
      font-size: 0.68rem;
      color: #94a3b8;
    }

    /* Styles d'impression */
    @media print {
      .ticket-view-container {
        width: 100%;
        padding: 0;
        background: transparent;
      }
      .no-print,
      .ticket-card--hide-on-print {
        display: none !important;
      }
      .ticket-card {
        break-inside: avoid;
        page-break-inside: avoid;
        margin-bottom: 20px;
        box-shadow: none !important;
        border: 1px solid #000000 !important;
        border-left: 6px solid #153d30 !important;
      }
    }
  `,
})
export class UiTicketViewComponent {
  private readonly billetApi = inject(BilletApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly billets = input<Billet[]>([]);
  readonly loading = input<boolean>(false);
  readonly showPrintButton = input<boolean>(true);
  readonly showCloseButton = input<boolean>(false);
  readonly close = output<void>();

  readonly billetsWithQr = signal<BilletWithQr[]>([]);
  protected readonly isPrinting = signal<boolean>(false);
  protected readonly printingTicketKey = signal<string | null>(null);

  constructor() {
    effect(
      () => {
        const rawBillets = this.billets();
        if (!rawBillets || rawBillets.length === 0) {
          this.billetsWithQr.set([]);
          return;
        }

        // Déduplication stricte des billets par numeroBillet ou tokenQr ou id
        const seen = new Set<string>();
        const uniqueBillets: Billet[] = [];
        for (const b of rawBillets) {
          const key = this.getTicketKey(b);
          if (!seen.has(key)) {
            seen.add(key);
            uniqueBillets.push(b);
          }
        }

        // Génération asynchrone des QR codes pour chaque billet unique
        Promise.all(
          uniqueBillets.map(async (b) => {
            const qrDataUrl = await this.billetApi.generateQrCodeDataUrl(b.tokenQr);
            return { ...b, qrDataUrl };
          })
        ).then((enriched) => {
          this.billetsWithQr.set(enriched);
        });
      },
      { allowSignalWrites: true }
    );
  }

  protected getTicketKey(billet: Billet): string {
    return String(billet.numeroBillet || billet.tokenQr || billet.id);
  }

  protected cleanHash(value?: string | null): string {
    if (!value) return '';
    return value
      .replace(/#\s*(\d+)/g, 'n° $1')
      .replace(/#/g, '');
  }

  protected formatPrestationName(raw?: string | null): string {
    if (!raw) return 'Visite Touristique Casamance';
    return raw
      .replace(/\bCIRCUIT\s*#\s*(\d+)/gi, 'Circuit n° $1')
      .replace(/\bEVENEMENT\s*#\s*(\d+)/gi, 'Événement n° $1')
      .replace(/\bÉVÉNEMENT\s*#\s*(\d+)/gi, 'Événement n° $1')
      .replace(/\bPATRIMOINE\s*#\s*(\d+)/gi, 'Patrimoine n° $1')
      .replace(/#\s*(\d+)/g, 'n° $1')
      .replace(/#/g, '');
  }

  imprimer(): void {
    this.printingTicketKey.set(null);
    this.triggerPrint();
  }

  imprimerUnSeul(billet: Billet): void {
    this.printingTicketKey.set(this.getTicketKey(billet));
    this.triggerPrint();
  }

  private triggerPrint(): void {
    this.isPrinting.set(true);
    if (typeof document !== 'undefined') {
      document.body.classList.add('is-printing-tickets');
    }
    this.cdr.detectChanges();

    try {
      window.print();
    } finally {
      this.isPrinting.set(false);
      this.printingTicketKey.set(null);
      if (typeof document !== 'undefined') {
        document.body.classList.remove('is-printing-tickets');
      }
      this.cdr.markForCheck();
    }
  }

  getBadgeClass(statut: Billet['statut']): string {
    return billetStatusBadgeClass(statut);
  }

  getStatusLabel(statut: Billet['statut']): string {
    return formatBilletStatusLabel(statut);
  }

  formatDateTime(isoDate?: string | null): string {
    if (!isoDate) return '';
    try {
      const d = new Date(isoDate);
      return d.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoDate;
    }
  }
}
