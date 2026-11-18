import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAlertCircle,
  LucideCamera,
  LucideCameraOff,
  LucideCheckCircle2,
  LucideClock,
  LucideKeyboard,
  LucideQrCode,
  LucideRefreshCw,
  LucideShieldCheck,
  LucideTicket,
  LucideTrash2,
  LucideXCircle,
} from '@lucide/angular';
import { Html5Qrcode } from 'html5-qrcode';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import { AuthStore } from '../../../../core/auth/auth.store';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import {
  Billet,
  ValidationBilletResponse,
  formatBilletStatusLabel,
  billetStatusBadgeClass,
} from '../../../../core/models/billet.model';
import { UiKpiCardComponent } from '../../../../shared/components/ui-kpi-card/ui-kpi-card.component';
import { BilletApiService } from '../../../reservations/data-access/billet-api.service';

interface ScanHistoryEntry {
  id: string;
  timestamp: Date;
  success: boolean;
  action: 'VALIDATION' | 'VERIFICATION';
  numeroBillet?: string | null;
  referenceReservation?: string | null;
  nomBeneficiaire?: string | null;
  nomPrestation?: string | null;
  datePrestation?: string | null;
  validePar?: string | null;
  message: string;
}

@Component({
  selector: 'app-pro-controle-acces-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    UiKpiCardComponent,
    LucideAlertCircle,
    LucideCamera,
    LucideCameraOff,
    LucideCheckCircle2,
    LucideClock,
    LucideKeyboard,
    LucideQrCode,
    LucideRefreshCw,
    LucideShieldCheck,
    LucideTicket,
    LucideTrash2,
    LucideXCircle,
  ],
  template: `
    <header class="bo-header">
      <div>
        <p class="bo-header__eyebrow">
          <svg lucideShieldCheck [size]="14" aria-hidden="true"></svg>
          Contrôle d'accès & Billetterie · Horodatage sécurisé ms-reservation
        </p>
        <h1 class="bo-header__title">Contrôle d'accès & Validation des Billets</h1>
        <p class="bo-header__lead">
          Scannez les QR codes des billets électroniques ou saisissez le token sécurisé pour valider l'entrée
          des visiteurs sur les sites patrimoniaux et circuits de Casamance.
        </p>
      </div>
      <div class="bo-header__actions">
        <button
          type="button"
          class="bo-btn"
          (click)="reinitialiserAffichage()"
          [disabled]="loading()"
          title="Réinitialiser le résultat affiché"
        >
          <svg lucideRefreshCw [size]="14" aria-hidden="true"></svg>
          <span>Nouveau scan</span>
        </button>
      </div>
    </header>

    <!-- Règle d'or de sécurité des accès -->
    <div class="security-banner">
      <svg lucideShieldCheck [size]="18" aria-hidden="true"></svg>
      <div>
        <strong>Sécurité anti-fraude & Verrouillage transactionnel :</strong>
        Chaque billet est à usage unique et rattaché à une réservation confirmée. Tout double-scan
        ou tentative de réutilisation simultanée est instantanément rejeté avec horodatage de la première entrée.
      </div>
    </div>

    <!-- KPIs de la session de contrôle -->
    <div class="bo-kpi-grid">
      <app-ui-kpi-card
        label="Scans de la session"
        [value]="totalScans()"
        subtitle="Contrôles effectués"
      />
      <app-ui-kpi-card
        label="Entrées autorisées"
        [value]="totalSucces()"
        tone="success"
        subtitle="Billets validés et consommés"
      />
      <app-ui-kpi-card
        label="Rejets / Alertes"
        [value]="totalRejets()"
        tone="terracotta"
        subtitle="Doubles scans ou invalides"
      />
      <app-ui-kpi-card
        label="Opérateur connecté"
        [value]="operateurNom()"
        tone="ochre"
        [subtitle]="operateurRole()"
      />
    </div>

    <!-- Layout principal : Scanner / Saisie d'un côté, Panneau de validation grand format de l'autre -->
    <div class="access-control-grid">
      <!-- Colonne 1 : Outil de capture (Caméra ou Manuel) -->
      <section class="bo-panel capture-panel">
        <div class="bo-panel__head">
          <h2 class="bo-panel__title">
            <svg lucideQrCode [size]="18" aria-hidden="true"></svg>
            <span>Poste de lecture</span>
          </h2>
          <div class="tab-toggle">
            <button
              type="button"
              class="tab-btn"
              [class.tab-btn--active]="modeLecture() === 'CAMERA'"
              (click)="setModeLecture('CAMERA')"
            >
              <svg lucideCamera [size]="15" aria-hidden="true"></svg>
              Caméra
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.tab-btn--active]="modeLecture() === 'MANUEL'"
              (click)="setModeLecture('MANUEL')"
            >
              <svg lucideKeyboard [size]="15" aria-hidden="true"></svg>
              Saisie / Douchette
            </button>
          </div>
        </div>

        @if (modeLecture() === 'CAMERA') {
          <div class="camera-zone">
            <div class="camera-controls">
              @if (cameras().length > 1) {
                <select
                  class="bo-select camera-select"
                  [ngModel]="selectedCameraId()"
                  (ngModelChange)="onCameraChange($event)"
                  [disabled]="isCameraRunning()"
                >
                  @for (cam of cameras(); track cam.id) {
                    <option [value]="cam.id">{{ cam.label || 'Caméra ' + cam.id }}</option>
                  }
                </select>
              }

              @if (!isCameraRunning()) {
                <button
                  type="button"
                  class="bo-btn bo-btn--primary"
                  (click)="startCamera()"
                  [disabled]="loading()"
                >
                  <svg lucideCamera [size]="16" aria-hidden="true"></svg>
                  Activer la caméra
                </button>
              } @else {
                <button
                  type="button"
                  class="bo-btn bo-btn--danger"
                  (click)="stopCamera()"
                >
                  <svg lucideCameraOff [size]="16" aria-hidden="true"></svg>
                  Désactiver la caméra
                </button>
              }
            </div>

            <!-- Conteneur vidéo du scanner HTML5 QR -->
            <div class="scanner-viewport-wrapper">
              <div id="qr-reader" class="scanner-viewport"></div>
              @if (!isCameraRunning()) {
                <div class="scanner-placeholder">
                  <svg lucideQrCode [size]="48" aria-hidden="true"></svg>
                  <p>Caméra en veille</p>
                  <span>Cliquez sur « Activer la caméra » pour lancer le balayage vidéo live.</span>
                </div>
              }
            </div>

            <p class="camera-hint">
              💡 Pointez la caméra vers le QR code imprimé ou présenté sur le smartphone du voyageur.
            </p>
          </div>
        } @else {
          <div class="manual-zone">
            <form (ngSubmit)="onValiderManuel()" class="manual-form">
              <div class="bo-field">
                <label for="manual-token" class="bo-label">
                  Token QR Code ou Code Billet (ex: BIL-XXXXXX)
                </label>
                <div class="input-with-button">
                  <input
                    id="manual-token"
                    type="text"
                    class="bo-input manual-input"
                    placeholder="Coller le token sécurisé ou scanner à la douchette..."
                    [(ngModel)]="manualToken"
                    name="manualToken"
                    #tokenInput
                    autocomplete="off"
                    autofocus
                    [disabled]="loading()"
                  />
                </div>
                <span class="bo-cell-sub">
                  Compatible avec les douchettes code-barres USB / Bluetooth (lecture automatique).
                </span>
              </div>

              <div class="manual-actions">
                <button
                  type="submit"
                  class="bo-btn bo-btn--primary"
                  [disabled]="!manualToken.trim() || loading()"
                >
                  <svg lucideShieldCheck [size]="16" aria-hidden="true"></svg>
                  <span>{{ loading() ? 'Vérification...' : 'Valider l\'Accès (Consommer)' }}</span>
                </button>
                <button
                  type="button"
                  class="bo-btn"
                  [disabled]="!manualToken.trim() || loading()"
                  (click)="onVerifierManuelSansConsommer()"
                >
                  <svg lucideTicket [size]="16" aria-hidden="true"></svg>
                  <span>Vérifier sans consommer</span>
                </button>
              </div>
            </form>
          </div>
        }
      </section>

      <!-- Colonne 2 : Grand Panneau d'Affichage du Résultat -->
      <section class="bo-panel result-panel">
        <div class="bo-panel__head">
          <h2 class="bo-panel__title">
            <span>Décision du contrôle</span>
          </h2>
          @if (dernierResultat() || dernierErreur()) {
            <span class="decision-time">
              Dernier contrôle : {{ derniereActionHeure() }}
            </span>
          }
        </div>

        @if (loading()) {
          <div class="result-status-card result-status-card--loading">
            <div class="spinner-large"></div>
            <h3>Contrôle transactionnel en cours...</h3>
            <p>Vérification du verrou pessimiste et intégrité de la réservation.</p>
          </div>
        } @else if (dernierResultat(); as res) {
          @if (res.valide) {
            <!-- ACCÈS AUTORISÉ (VERT ÉCLATANT) -->
            <div class="result-status-card result-status-card--success" role="alert">
              <div class="status-icon">
                <svg lucideCheckCircle2 [size]="64" aria-hidden="true"></svg>
              </div>
              <h3 class="status-title">ACCÈS AUTORISÉ</h3>
              <p class="status-subtitle">{{ res.message }}</p>

              @if (res.billet; as b) {
                <div class="ticket-verified-details">
                  <div class="detail-row">
                    <span class="detail-label">Bénéficiaire :</span>
                    <span class="detail-value detail-value--highlight">{{ b.nomBeneficiaire }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Visite / Prestation :</span>
                    <span class="detail-value">{{ b.nomPrestation || 'Prestation touristique' }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">N° de Billet :</span>
                    <span class="detail-code">{{ b.numeroBillet }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Réf. Réservation :</span>
                    <span class="detail-code">{{ b.referenceReservation }}</span>
                  </div>
                  @if (b.datePrestation) {
                    <div class="detail-row">
                      <span class="detail-label">Date prévue :</span>
                      <span class="detail-value">{{ b.datePrestation }} {{ b.creneauPrestation ? '(' + b.creneauPrestation + ')' : '' }}</span>
                    </div>
                  }
                  <div class="detail-row">
                    <span class="detail-label">Validation effectuée par :</span>
                    <span class="detail-value">{{ b.validePar || operateurNom() }}</span>
                  </div>
                </div>
              }
            </div>
          } @else {
            <!-- ACCÈS REFUSÉ PAR LE SERVEUR -->
            <div class="result-status-card result-status-card--refused" role="alert">
              <div class="status-icon">
                <svg lucideXCircle [size]="64" aria-hidden="true"></svg>
              </div>
              <h3 class="status-title">ACCÈS REFUSÉ</h3>
              <p class="status-subtitle">{{ res.message }}</p>

              @if (res.billet; as b) {
                <div class="ticket-verified-details">
                  <div class="detail-row">
                    <span class="detail-label">Bénéficiaire :</span>
                    <span class="detail-value">{{ b.nomBeneficiaire }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">N° Billet :</span>
                    <span class="detail-code">{{ b.numeroBillet }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Statut du billet :</span>
                    <span [class]="getBadgeClass(b.statut)">{{ getStatusLabel(b.statut) }}</span>
                  </div>
                  @if (b.validePar) {
                    <div class="detail-row">
                      <span class="detail-label">Précédemment validé par :</span>
                      <span class="detail-value">{{ b.validePar }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          }
        } @else if (dernierErreur(); as err) {
          <!-- ERREUR OU REJET BRUT (409 DOUBLE SCAN, 404 INTROUVABLE, ETC.) -->
          <div class="result-status-card result-status-card--error" role="alert">
            <div class="status-icon">
              <svg lucideAlertCircle [size]="64" aria-hidden="true"></svg>
            </div>
            <h3 class="status-title">REJET DU CONTRÔLE</h3>
            <p class="status-subtitle">{{ err }}</p>
            <div class="error-tip">
              Vérifiez la validité du QR code ou demandez la pièce d'identité du voyageur.
            </div>
          </div>
        } @else {
          <!-- ÉTAT INITIAL / EN ATTENTE -->
          <div class="result-status-card result-status-card--idle">
            <div class="status-icon">
              <svg lucideTicket [size]="64" aria-hidden="true"></svg>
            </div>
            <h3 class="status-title">En attente de scan</h3>
            <p class="status-subtitle">
              Activez la caméra ou utilisez la douchette pour scanner un premier billet.
            </p>
          </div>
        }
      </section>
    </div>

    <!-- Journal de la session : Tableau des derniers contrôles -->
    <section class="bo-panel history-panel">
      <div class="bo-panel__head">
        <h2 class="bo-panel__title">
          <svg lucideClock [size]="18" aria-hidden="true"></svg>
          <span>Historique des scans de la session ({{ scanHistory().length }})</span>
        </h2>
        @if (scanHistory().length > 0) {
          <button
            type="button"
            class="bo-btn bo-btn--sm"
            (click)="viderHistorique()"
            title="Effacer le journal de session"
          >
            <svg lucideTrash2 [size]="14" aria-hidden="true"></svg>
            <span>Effacer la session</span>
          </button>
        }
      </div>

      @if (scanHistory().length === 0) {
        <div class="empty-history">
          <p>Aucun billet scanné durant cette session de travail.</p>
        </div>
      } @else {
        <div class="bo-table-wrap">
          <table class="bo-table">
            <thead>
              <tr>
                <th>Heure</th>
                <th>Résultat</th>
                <th>Bénéficiaire</th>
                <th>Prestation</th>
                <th>N° Billet / Réf</th>
                <th>Détails du contrôle</th>
              </tr>
            </thead>
            <tbody>
              @for (item of scanHistory(); track item.id) {
                <tr [class.row-rejected]="!item.success">
                  <td class="tabular-nums">
                    {{ item.timestamp | date: 'HH:mm:ss' }}
                  </td>
                  <td>
                    @if (item.success) {
                      <span class="ui-badge ui-badge--success">AUTORISÉ</span>
                    } @else {
                      <span class="ui-badge ui-badge--error">REFUSÉ</span>
                    }
                  </td>
                  <td>
                    <strong>{{ item.nomBeneficiaire || 'Inconnu' }}</strong>
                  </td>
                  <td>
                    {{ item.nomPrestation || 'Visite Casamance' }}
                  </td>
                  <td>
                    <span class="bo-cell-title">{{ item.numeroBillet || '-' }}</span>
                    @if (item.referenceReservation) {
                      <span class="bo-cell-sub">{{ item.referenceReservation }}</span>
                    }
                  </td>
                  <td>
                    <span [class.text-danger]="!item.success">{{ item.message }}</span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: `
    .security-banner {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3, 12px);
      padding: var(--space-3, 12px) var(--space-4, 16px);
      background-color: var(--surface-sand, #fdfbf7);
      border: 1px solid var(--brand-terracotta, #c86446);
      border-radius: var(--radius-md, 8px);
      margin-bottom: var(--space-4, 16px);
      color: var(--ink-primary, #1e1e1e);
      font-size: var(--text-sm, 14px);
      line-height: 1.4;
    }

    .security-banner svg {
      color: var(--brand-terracotta, #c86446);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .access-control-grid {
      display: grid;
      grid-template-columns: 1fr 1.25fr;
      gap: var(--space-5, 20px);
      margin-bottom: var(--space-6, 24px);
    }

    @media (max-width: 960px) {
      .access-control-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Tabs toggle */
    .tab-toggle {
      display: flex;
      gap: var(--space-2, 8px);
      background-color: var(--surface-sand, #f3ede2);
      padding: 4px;
      border-radius: var(--radius-pill, 9999px);
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border: none;
      background: transparent;
      border-radius: var(--radius-pill, 9999px);
      font-size: var(--text-xs, 12px);
      font-weight: 600;
      color: var(--ink-secondary, #666);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tab-btn--active {
      background-color: #ffffff;
      color: var(--ink-primary, #111);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    /* Camera zone */
    .camera-zone {
      display: flex;
      flex-direction: column;
      gap: var(--space-4, 16px);
    }

    .camera-controls {
      display: flex;
      gap: var(--space-3, 12px);
      flex-wrap: wrap;
    }

    .camera-select {
      flex: 1;
      min-width: 180px;
    }

    .scanner-viewport-wrapper {
      position: relative;
      background-color: #000000;
      border-radius: var(--radius-lg, 12px);
      overflow: hidden;
      min-height: 280px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .scanner-viewport {
      width: 100%;
      min-height: 280px;
    }

    .scanner-placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.7);
      text-align: center;
      padding: 24px;
      gap: 8px;
    }

    .scanner-placeholder p {
      margin: 0;
      font-weight: 700;
      font-size: 16px;
      color: #ffffff;
    }

    .scanner-placeholder span {
      font-size: 13px;
      max-width: 260px;
    }

    .camera-hint {
      margin: 0;
      font-size: var(--text-xs, 12px);
      color: var(--ink-secondary, #666);
    }

    /* Manual zone */
    .manual-zone {
      padding: var(--space-3, 12px) 0;
    }

    .manual-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-4, 16px);
    }

    .manual-input {
      font-size: 16px;
      font-family: monospace;
      padding: 12px 14px;
    }

    .manual-actions {
      display: flex;
      gap: var(--space-3, 12px);
      flex-wrap: wrap;
    }

    /* Result Panel */
    .result-panel {
      display: flex;
      flex-direction: column;
    }

    .decision-time {
      font-size: var(--text-xs, 12px);
      color: var(--ink-secondary, #666);
    }

    .result-status-card {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: var(--space-6, 24px);
      border-radius: var(--radius-lg, 12px);
      transition: all 0.3s ease;
      min-height: 320px;
    }

    .status-icon {
      margin-bottom: var(--space-3, 12px);
    }

    .status-title {
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 0.04em;
      margin: 0 0 8px 0;
    }

    .status-subtitle {
      font-size: 15px;
      margin: 0 0 16px 0;
      max-width: 440px;
    }

    /* Variations d'état */
    .result-status-card--idle {
      background-color: var(--surface-sand, #fdfbf7);
      border: 2px dashed var(--border-strong, #d8d0c4);
      color: var(--ink-secondary, #777);
    }

    .result-status-card--loading {
      background-color: #f7f9fc;
      border: 2px solid #b3c5e8;
      color: #1e3a8a;
    }

    .result-status-card--success {
      background-color: #f0fdf4;
      border: 3px solid #16a34a;
      color: #14532d;
    }
    .result-status-card--success .status-icon svg {
      color: #16a34a;
    }
    .result-status-card--success .status-title {
      color: #15803d;
    }

    .result-status-card--refused {
      background-color: #fef2f2;
      border: 3px solid #dc2626;
      color: #7f1d1d;
    }
    .result-status-card--refused .status-icon svg {
      color: #dc2626;
    }
    .result-status-card--refused .status-title {
      color: #b91c1c;
    }

    .result-status-card--error {
      background-color: #fff1f2;
      border: 3px solid #e11d48;
      color: #881337;
    }
    .result-status-card--error .status-icon svg {
      color: #e11d48;
    }
    .result-status-card--error .status-title {
      color: #be123c;
    }

    .error-tip {
      font-size: 13px;
      background: rgba(225, 29, 72, 0.08);
      padding: 8px 16px;
      border-radius: 6px;
      margin-top: 8px;
    }

    .ticket-verified-details {
      width: 100%;
      background: rgba(255, 255, 255, 0.85);
      border-radius: var(--radius-md, 8px);
      padding: 16px;
      margin-top: 12px;
      display: grid;
      gap: 8px;
      text-align: left;
      border: 1px solid rgba(0, 0, 0, 0.08);
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 14px;
    }

    .detail-label {
      color: var(--ink-secondary, #555);
      font-weight: 500;
    }

    .detail-value {
      font-weight: 700;
      color: var(--ink-primary, #111);
      text-align: right;
    }

    .detail-value--highlight {
      font-size: 16px;
      color: var(--brand-primary, #2d5a27);
    }

    .detail-code {
      font-family: monospace;
      font-weight: 700;
      background: #eee;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .spinner-large {
      width: 44px;
      height: 44px;
      border: 4px solid rgba(0, 0, 0, 0.1);
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* History */
    .empty-history {
      padding: 24px;
      text-align: center;
      color: var(--ink-secondary, #777);
      font-style: italic;
    }

    .row-rejected {
      background-color: #fff5f5;
    }

    .text-danger {
      color: #dc2626;
      font-weight: 600;
    }
  `,
})
export class ProControleAccesPageComponent implements OnInit, OnDestroy {
  private readonly billetApi = inject(BilletApiService);
  private readonly authStore = inject(AuthStore);

  // Mode de capture
  readonly modeLecture = signal<'CAMERA' | 'MANUEL'>('CAMERA');
  manualToken = '';

  // Caméra HTML5 QR
  private html5QrCode: Html5Qrcode | null = null;
  readonly isCameraRunning = signal(false);
  readonly cameras = signal<Array<{ id: string; label: string }>>([]);
  readonly selectedCameraId = signal<string>('');

  // État de chargement et décision
  readonly loading = signal(false);
  readonly dernierResultat = signal<ValidationBilletResponse | null>(null);
  readonly dernierErreur = signal<string | null>(null);
  readonly derniereActionHeure = signal<string>('');

  // Historique de session
  readonly scanHistory = signal<ScanHistoryEntry[]>([]);

  // Opérateur connecté
  readonly operateurNom = computed(() => {
    const u = this.authStore.user();
    if (!u) return 'Opérateur';
    return `${u.prenom} ${u.nom}`;
  });

  readonly operateurRole = computed(() => {
    return this.authStore.roleLabel();
  });

  // KPIs calculés
  readonly totalScans = computed(() => this.scanHistory().length);
  readonly totalSucces = computed(() => this.scanHistory().filter((s) => s.success).length);
  readonly totalRejets = computed(() => this.scanHistory().filter((s) => !s.success).length);

  private lastScannedText = '';
  private lastScannedAt = 0;

  async ngOnInit(): Promise<void> {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        this.cameras.set(devices);
        // Préférer la caméra arrière (back / environment) si disponible
        const backCam = devices.find(
          (d) =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('arrière') ||
            d.label.toLowerCase().includes('environment')
        );
        this.selectedCameraId.set(backCam ? backCam.id : devices[0].id);
      }
    } catch {
      // Permissions caméra non accordées ou indisponibles
      this.cameras.set([]);
    }
  }

  ngOnDestroy(): void {
    void this.stopCamera();
  }

  setModeLecture(mode: 'CAMERA' | 'MANUEL'): void {
    this.modeLecture.set(mode);
    if (mode === 'MANUEL' && this.isCameraRunning()) {
      void this.stopCamera();
    }
  }

  async onCameraChange(cameraId: string): Promise<void> {
    this.selectedCameraId.set(cameraId);
    if (this.isCameraRunning()) {
      await this.stopCamera();
      await this.startCamera();
    }
  }

  async startCamera(): Promise<void> {
    try {
      if (!this.html5QrCode) {
        this.html5QrCode = new Html5Qrcode('qr-reader');
      }
      const camId = this.selectedCameraId();
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      const cameraParam = camId ? { deviceId: { exact: camId } } : { facingMode: 'environment' };

      await this.html5QrCode.start(
        cameraParam,
        config,
        (decodedText) => this.onQrCodeScanned(decodedText),
        () => {
          // Erreur de trame standard ignorée pour ne pas saturer la console
        }
      );
      this.isCameraRunning.set(true);
      toast.info('Caméra active. Prêt pour le scan.');
    } catch (err) {
      toast.error('Impossible d\'activer la caméra : ' + extractErrorMessage(err));
      this.isCameraRunning.set(false);
    }
  }

  async stopCamera(): Promise<void> {
    if (this.html5QrCode && this.isCameraRunning()) {
      try {
        await this.html5QrCode.stop();
      } catch {
        // Déjà arrêté
      } finally {
        this.isCameraRunning.set(false);
      }
    }
  }

  /**
   * Traitement d'un scan QR code automatique via caméra.
   */
  private onQrCodeScanned(decodedText: string): void {
    const trimmed = decodedText.trim();
    if (!trimmed) return;

    // Débouncing anti double-déclenchement rapide (2 secondes d'intervalle pour le même code)
    const now = Date.now();
    if (trimmed === this.lastScannedText && now - this.lastScannedAt < 2500) {
      return;
    }
    this.lastScannedText = trimmed;
    this.lastScannedAt = now;

    // Validation immédiate du billet scanné
    void this.executerValidation(trimmed, 'VALIDATION');
  }

  /**
   * Validation manuelle avec consommation du billet.
   */
  async onValiderManuel(): Promise<void> {
    const token = this.manualToken.trim();
    if (!token) return;
    await this.executerValidation(token, 'VALIDATION');
    this.manualToken = '';
  }

  /**
   * Vérification simple du statut sans marquer le billet comme consommé.
   */
  async onVerifierManuelSansConsommer(): Promise<void> {
    const token = this.manualToken.trim();
    if (!token) return;
    await this.executerValidation(token, 'VERIFICATION');
  }

  private async executerValidation(tokenOrCode: string, action: 'VALIDATION' | 'VERIFICATION'): Promise<void> {
    this.loading.set(true);
    this.dernierResultat.set(null);
    this.dernierErreur.set(null);
    this.derniereActionHeure.set(new Date().toLocaleTimeString('fr-FR'));

    try {
      let resp: ValidationBilletResponse;
      if (action === 'VALIDATION') {
        resp = await firstValueFrom(this.billetApi.validerBillet(tokenOrCode));
      } else {
        const billet = await firstValueFrom(this.billetApi.verifierBillet(tokenOrCode));
        const isOk = billet.statut === 'VALIDE';
        resp = {
          valide: isOk,
          message: isOk
            ? 'Billet valide pour entrée.'
            : `Billet ${formatBilletStatusLabel(billet.statut)}.`,
          billet,
        };
      }

      this.dernierResultat.set(resp);
      const isSuccess = resp.valide;

      if (isSuccess) {
        this.jouerSonSucces();
        toast.success(action === 'VALIDATION' ? 'Accès validé avec succès !' : 'Billet valide.');
      } else {
        this.jouerSonErreur();
        toast.warning(resp.message || 'Accès refusé.');
      }

      // Enregistrement dans l'historique de session
      this.enregistrerHistorique({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        success: isSuccess,
        action,
        numeroBillet: resp.billet?.numeroBillet,
        referenceReservation: resp.billet?.referenceReservation,
        nomBeneficiaire: resp.billet?.nomBeneficiaire,
        nomPrestation: resp.billet?.nomPrestation,
        datePrestation: resp.billet?.datePrestation,
        validePar: resp.billet?.validePar,
        message: resp.message,
      });
    } catch (err) {
      const errMsg = extractErrorMessage(err);
      this.dernierErreur.set(errMsg);
      this.jouerSonErreur();
      toast.error(errMsg);

      this.enregistrerHistorique({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        success: false,
        action,
        message: errMsg,
      });
    } finally {
      this.loading.set(false);
    }
  }

  private enregistrerHistorique(entry: ScanHistoryEntry): void {
    this.scanHistory.update((prev) => [entry, ...prev.slice(0, 49)]);
  }

  reinitialiserAffichage(): void {
    this.dernierResultat.set(null);
    this.dernierErreur.set(null);
    this.derniereActionHeure.set('');
    this.manualToken = '';
  }

  viderHistorique(): void {
    this.scanHistory.set([]);
    toast.info('Journal de session vidé.');
  }

  getBadgeClass(statut?: Billet['statut']): string {
    return statut ? billetStatusBadgeClass(statut) : 'ui-badge ui-badge--neutral';
  }

  getStatusLabel(statut?: Billet['statut']): string {
    return statut ? formatBilletStatusLabel(statut) : 'INCONNU';
  }

  private jouerSonSucces(): void {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio context inaccessible (non bloquant)
    }
  }

  private jouerSonErreur(): void {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
      osc.frequency.setValueAtTime(164.81, ctx.currentTime + 0.15); // E3
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio context inaccessible (non bloquant)
    }
  }
}
