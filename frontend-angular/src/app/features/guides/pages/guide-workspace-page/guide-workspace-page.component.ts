import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideAward,
  LucideCheckCircle2,
  LucideCompass,
  LucideRoute,
  LucideSend,
  LucideShieldCheck,
  LucideUsers,
} from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import { AuthStore } from '../../../../core/auth/auth.store';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import { Circuit } from '../../../../core/models/circuit.model';
import {
  GuideHistorique,
  GuideProfil,
  GuideSelfUpdatePayload,
  formatGuideStatusLabel,
  guideStatusBadgeClass,
} from '../../../../core/models/guide.model';
import { ManifesteParticipant } from '../../../../core/models/reservation.model';
import { UiAvisSectionComponent } from '../../../../shared/components/ui-avis-section/ui-avis-section.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import { CircuitApiService } from '../../../circuits/data-access/circuit-api.service';
import { ReservationApiService } from '../../../reservations/data-access/reservation-api.service';
import { GuideApiService } from '../../data-access/guide-api.service';

@Component({
  selector: 'app-guide-workspace-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    DateFrPipe,
    FcfaPricePipe,
    UiAvisSectionComponent,
    LucideAward,
    LucideCompass,
    LucideSend,
    LucideCheckCircle2,
    LucideRoute,
    LucideUsers,
    LucideShieldCheck,
  ],
  template: `
    <div class="page-section">
      <div class="container">
        <header class="editorial-header">
          <p class="editorial-header__eyebrow">Espace personnel Guide touristique</p>
          <h1 class="editorial-header__title">Gestion de mon activité en Casamance</h1>
          <p class="editorial-header__lead">
            Mettez à jour vos informations professionnelles autorisées, suivez la validation de votre dossier
            et consultez les manifestes non financiers des circuits qui vous sont confiés.
          </p>
        </header>

        @if (loading()) {
          <p class="info-text">Chargement de votre dossier guide...</p>
        } @else {
          @if (profil(); as p) {
            <section class="status-card">
              <div class="status-card__info">
                <div class="status-row">
                  <span [class]="badgeClass(p.statutValidation)">
                    <svg lucideAward [size]="13" aria-hidden="true"></svg>
                    {{ formatStatus(p.statutValidation) }}
                  </span>
                  @if (p.visibilitePublique) {
                    <span class="ui-badge ui-badge--success">Visible dans l'annuaire public</span>
                  } @else {
                    <span class="ui-badge ui-badge--neutral">Non visible publiquement</span>
                  }
                </div>
                @if (p.motifDecision) {
                  <p class="status-motif"><strong>Décision / Observation :</strong> {{ p.motifDecision }}</p>
                }
              </div>

              <div class="status-actions">
                @if (p.statutValidation === 'BROUILLON' || p.statutValidation === 'REJETE') {
                  <button type="button" class="btn-submit-val" (click)="soumettreProfil()" [disabled]="busy()">
                    <svg lucideSend [size]="15" aria-hidden="true"></svg>
                    <span>Soumettre pour validation</span>
                  </button>
                }
                @if (p.statutValidation === 'VALIDE') {
                  <button
                    type="button"
                    class="btn-toggle"
                    (click)="toggleDisponibilite(p)"
                    [disabled]="busy()"
                  >
                    {{ p.disponible ? 'Me marquer indisponible' : 'Me marquer disponible' }}
                  </button>
                }
                @if (p.statutValidation !== 'DESACTIVE') {
                  <button type="button" class="btn-danger-outline" (click)="desactiverProfil()" [disabled]="busy()">
                    Désactiver mon profil
                  </button>
                }
              </div>
            </section>
          } @else {
            <div class="empty-guide-banner">
              <svg lucideShieldCheck [size]="18" aria-hidden="true"></svg>
              <div>
                <strong>Profil professionnel à initialiser</strong>
                <p>Complétez le formulaire ci-dessous pour créer votre profil en brouillon puis soumettez-le à la validation.</p>
              </div>
            </div>
          }

          <div class="workspace-grid">
            <section class="panel">
              <h2><svg lucideCompass [size]="18" aria-hidden="true"></svg> Fiche professionnelle</h2>
              <form class="guide-form" (ngSubmit)="saveProfil()">
                <label class="field-group">
                  <span>Présentation courte (accroche annuaire) *</span>
                  <input type="text" class="field-input" [(ngModel)]="form.presentationCourte" name="presentationCourte" required maxlength="500" />
                </label>

                <label class="field-group">
                  <span>Biographie détaillée (20 caractères min.) *</span>
                  <textarea class="field-input" rows="4" [(ngModel)]="form.biographie" name="biographie" required minlength="20" maxlength="4000"></textarea>
                </label>

                <div class="two-cols">
                  <label class="field-group">
                    <span>Langues parlées *</span>
                    <input type="text" class="field-input" [(ngModel)]="form.languesParlees" name="languesParlees" placeholder="Français, Diola, Wolof, Anglais" required />
                  </label>
                  <label class="field-group">
                    <span>Zones d'intervention en Casamance *</span>
                    <input type="text" class="field-input" [(ngModel)]="form.zonesIntervention" name="zonesIntervention" placeholder="Oussouye, Carabane, Cap Skirring" required />
                  </label>
                </div>

                <label class="field-group">
                  <span>Compétences &amp; spécialités *</span>
                  <input type="text" class="field-input" [(ngModel)]="form.specialites" name="specialites" placeholder="Écotourisme, patrimoine Diola, histoire..." required />
                </label>

                <div class="two-cols">
                  <label class="field-group">
                    <span>Années d'expérience *</span>
                    <input type="number" min="0" max="70" class="field-input" [(ngModel)]="form.anneesExperience" name="anneesExperience" required />
                  </label>
                  <label class="field-group">
                    <span>Tarif journalier indicatif (XOF)</span>
                    <input type="number" min="0" step="500" class="field-input" [(ngModel)]="form.tarifJournalierIndicatif" name="tarifJournalierIndicatif" />
                  </label>
                </div>

                <div class="two-cols">
                  <label class="field-group">
                    <span>N° carte professionnelle / agrément</span>
                    <input type="text" class="field-input" [(ngModel)]="form.numeroCarteProfessionnelle" name="numeroCarteProfessionnelle" />
                  </label>
                  <label class="field-group">
                    <span>Références justificatives</span>
                    <input type="text" class="field-input" [(ngModel)]="form.documentsJustificatifs" name="documentsJustificatifs" />
                  </label>
                </div>

                <div class="form-footer">
                  <button type="submit" class="btn-primary" [disabled]="busy()">
                    <svg lucideCheckCircle2 [size]="16" aria-hidden="true"></svg>
                    <span>{{ busy() ? 'Enregistrement...' : 'Enregistrer mes modifications' }}</span>
                  </button>
                </div>
              </form>
            </section>

            <section class="panel">
              <h2><svg lucideRoute [size]="18" aria-hidden="true"></svg> Mes circuits &amp; manifestes</h2>
              @if (circuits().length === 0) {
                <p class="muted">Aucun circuit ne vous est actuellement affecté en tant que guide responsable.</p>
              } @else {
                <ul class="circuit-list">
                  @for (cir of circuits(); track cir.id) {
                    <li class="circuit-item">
                      <div>
                        <strong>{{ cir.nomCircuit }}</strong>
                        <span class="muted">
                          {{ cir.statutCircuit }} · {{ cir.placesMax }} places max · {{ cir.prix | fcfaPrice }}
                        </span>
                      </div>
                      <div class="circuit-item__actions">
                        <a [routerLink]="['/circuits', cir.id]" class="btn-mini">Fiche</a>
                        <button type="button" class="btn-mini btn-mini--accent" (click)="loadManifeste(cir.id)">
                          <svg lucideUsers [size]="13" aria-hidden="true"></svg>
                          Manifeste
                        </button>
                      </div>
                    </li>
                  }
                </ul>
              }

              @if (manifesteCircuitId() !== null) {
                <div class="manifeste-box">
                  <h3>Manifeste des participants — Circuit {{ manifesteCircuitId() }}</h3>
                  @if (manifeste().length === 0) {
                    <p class="muted">Aucune réservation confirmée ou active pour ce circuit.</p>
                  } @else {
                    <ul class="manifeste-list">
                      @for (m of manifeste(); track m.reservationId) {
                        <li>
                          <strong>{{ m.nomClient }}</strong> · {{ m.nombrePlaces }} place(s) ·
                          <span>{{ m.datePrestation || 'Date à confirmer' }}</span> ·
                          <span class="ui-badge ui-badge--neutral">{{ m.statut }}</span>
                        </li>
                      }
                    </ul>
                  }
                </div>
              }

              @if (historique().length > 0) {
                <h3 class="sub-heading">Historique des décisions administratives</h3>
                <ul class="history-list">
                  @for (h of historique(); track h.id) {
                    <li>
                      <span class="ui-badge ui-badge--neutral">{{ h.ancienStatut || 'INITIAL' }} → {{ h.nouveauStatut }}</span>
                      <span class="muted"> · {{ h.dateTransition | dateFr: 'd MMM yyyy HH:mm' }}</span>
                      @if (h.motif) {
                        <p class="history-motif">{{ h.motif }}</p>
                      }
                    </li>
                  }
                </ul>
              }
            </section>
          </div>

          @if (authStore.user(); as u) {
            <app-ui-avis-section cibleType="GUIDE" [cibleId]="u.id" />
          }
        }
      </div>
    </div>
  `,
  styles: `
    .status-card {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 1.15rem 1.35rem;
      background: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      margin-bottom: 1.5rem;
    }
    .status-row {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .status-motif {
      margin: 0.5rem 0 0;
      font-size: var(--text-xs);
      color: var(--ink-secondary);
    }
    .status-actions {
      display: flex;
      gap: 0.6rem;
      flex-wrap: wrap;
    }
    .btn-submit-val {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.6rem 1rem;
      background: var(--accent-terracotta);
      color: var(--ink-on-dark);
      border: none;
      border-radius: var(--radius-sm);
      font-weight: 700;
      font-size: var(--text-sm);
      cursor: pointer;
    }
    .btn-toggle {
      padding: 0.6rem 1rem;
      background: var(--surface-sand);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      font-weight: 600;
      font-size: var(--text-sm);
      cursor: pointer;
    }
    .btn-danger-outline {
      padding: 0.6rem 1rem;
      background: transparent;
      border: 1px solid var(--status-error-border);
      color: var(--status-error-ink);
      border-radius: var(--radius-sm);
      font-weight: 600;
      font-size: var(--text-sm);
      cursor: pointer;
    }
    .empty-guide-banner {
      display: flex;
      gap: 0.75rem;
      padding: 1rem;
      background: var(--accent-ochre-soft);
      border: 1px solid var(--accent-ochre-border);
      border-radius: var(--radius-md);
      margin-bottom: 1.5rem;
      font-size: var(--text-sm);
    }
    .empty-guide-banner p {
      margin: 0.2rem 0 0;
    }
    .workspace-grid {
      display: grid;
      grid-template-columns: 1.25fr 1fr;
      gap: 1.5rem;
      align-items: start;
    }
    @media (max-width: 960px) {
      .workspace-grid {
        grid-template-columns: 1fr;
      }
    }
    .panel {
      background: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 1.35rem;
    }
    .panel h2 {
      margin: 0 0 1rem;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      font-family: var(--font-display);
      font-size: var(--text-lg);
    }
    .guide-form {
      display: grid;
      gap: 0.85rem;
    }
    .two-cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.8rem;
    }
    @media (max-width: 640px) {
      .two-cols {
        grid-template-columns: 1fr;
      }
    }
    .field-group {
      display: grid;
      gap: 0.3rem;
      font-size: var(--text-xs);
      font-weight: 600;
      color: var(--ink-secondary);
    }
    .field-input {
      padding: 0.58rem 0.75rem;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      font-family: inherit;
      font-size: var(--text-sm);
      background: var(--surface-canvas);
      color: var(--ink-primary);
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.65rem 1.2rem;
      border: none;
      border-radius: var(--radius-sm);
      background: var(--brand-primary);
      color: var(--ink-on-dark);
      font-weight: 700;
      cursor: pointer;
    }
    .circuit-list,
    .manifeste-list,
    .history-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.6rem;
    }
    .circuit-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: var(--surface-canvas);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
    }
    .circuit-item div:first-child {
      display: grid;
      gap: 0.2rem;
    }
    .circuit-item__actions {
      display: flex;
      gap: 0.4rem;
    }
    .btn-mini {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.35rem 0.65rem;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-xs);
      background: var(--surface-elevated);
      text-decoration: none;
      color: var(--ink-primary);
      font-size: var(--text-xs);
      font-weight: 600;
      cursor: pointer;
    }
    .btn-mini--accent {
      background: var(--brand-soft);
      border-color: var(--brand-border);
      color: var(--brand-primary);
    }
    .manifeste-box {
      margin-top: 1.15rem;
      padding: 0.9rem;
      background: var(--surface-sand);
      border-radius: var(--radius-md);
    }
    .manifeste-box h3,
    .sub-heading {
      margin: 1rem 0 0.55rem;
      font-size: var(--text-sm);
      color: var(--ink-primary);
    }
    .history-list li {
      padding: 0.6rem;
      background: var(--surface-canvas);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      font-size: var(--text-xs);
    }
    .history-motif {
      margin: 0.3rem 0 0;
      color: var(--ink-secondary);
    }
    .muted,
    .info-text {
      color: var(--ink-muted);
      font-size: var(--text-xs);
    }
  `,
})
export class GuideWorkspacePageComponent implements OnInit {
  protected readonly authStore = inject(AuthStore);
  private readonly guideApi = inject(GuideApiService);
  private readonly circuitApi = inject(CircuitApiService);
  private readonly reservationApi = inject(ReservationApiService);

  protected readonly formatStatus = formatGuideStatusLabel;
  protected readonly badgeClass = guideStatusBadgeClass;

  protected readonly profil = signal<GuideProfil | null>(null);
  protected readonly historique = signal<GuideHistorique[]>([]);
  protected readonly circuits = signal<Circuit[]>([]);
  protected readonly manifesteCircuitId = signal<number | null>(null);
  protected readonly manifeste = signal<ManifesteParticipant[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);

  protected form: GuideSelfUpdatePayload = {
    presentationCourte: '',
    biographie: '',
    languesParlees: 'Français, Diola, Wolof',
    specialites: '',
    zonesIntervention: 'Basse-Casamance',
    anneesExperience: 1,
    numeroCarteProfessionnelle: '',
    documentsJustificatifs: '',
    tarifJournalierIndicatif: 25000,
    disponible: true,
    visibilitePublique: false,
  };

  ngOnInit(): void {
    void this.loadWorkspace();
  }

  private async loadWorkspace(): Promise<void> {
    this.loading.set(true);
    try {
      const [p, assignedCircuits] = await Promise.all([
        firstValueFrom(this.guideApi.getMonProfil()).catch(() => null),
        firstValueFrom(this.circuitApi.getMesCircuitsGuide()).catch(() => []),
      ]);
      this.profil.set(p);
      this.circuits.set(assignedCircuits ?? []);
      if (p) {
        this.form = {
          presentationCourte: p.presentationCourte ?? '',
          biographie: p.biographie ?? '',
          languesParlees: p.languesParlees ?? '',
          specialites: p.specialites ?? '',
          zonesIntervention: p.zonesIntervention ?? '',
          anneesExperience: p.anneesExperience ?? 0,
          numeroCarteProfessionnelle: p.numeroCarteProfessionnelle ?? '',
          documentsJustificatifs: p.documentsJustificatifs ?? '',
          tarifJournalierIndicatif: p.tarifJournalierIndicatif ?? null,
          disponible: p.disponible,
          visibilitePublique: p.visibilitePublique,
        };
        const hist = await firstValueFrom(this.guideApi.getHistorique(p.id)).catch(() => []);
        this.historique.set(hist ?? []);
      }
    } finally {
      this.loading.set(false);
    }
  }

  protected async saveProfil(): Promise<void> {
    this.busy.set(true);
    try {
      const saved = await firstValueFrom(this.guideApi.upsertMonProfil(this.form));
      this.profil.set(saved);
      toast.success('Profil professionnel enregistré.');
      await this.loadWorkspace();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  protected async soumettreProfil(): Promise<void> {
    this.busy.set(true);
    try {
      const updated = await firstValueFrom(this.guideApi.soumettreMonProfil());
      this.profil.set(updated);
      toast.success('Profil soumis pour validation administrative.');
      await this.loadWorkspace();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  protected async toggleDisponibilite(p: GuideProfil): Promise<void> {
    this.busy.set(true);
    try {
      const updated = await firstValueFrom(this.guideApi.changerDisponibilite(!p.disponible, p.visibilitePublique));
      this.profil.set(updated);
      toast.success(updated.disponible ? 'Vous êtes désormais disponible.' : 'Statut marqué indisponible.');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  protected async desactiverProfil(): Promise<void> {
    this.busy.set(true);
    try {
      const updated = await firstValueFrom(this.guideApi.desactiverMonProfil('Désactivation demandée par le guide'));
      this.profil.set(updated);
      toast.success('Profil guide désactivé.');
      await this.loadWorkspace();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  protected async loadManifeste(circuitId: number): Promise<void> {
    try {
      this.manifesteCircuitId.set(circuitId);
      const list = await firstValueFrom(this.reservationApi.getManifesteGuide(circuitId));
      this.manifeste.set(list ?? []);
    } catch (err) {
      toast.error(extractErrorMessage(err));
      this.manifeste.set([]);
    }
  }
}
