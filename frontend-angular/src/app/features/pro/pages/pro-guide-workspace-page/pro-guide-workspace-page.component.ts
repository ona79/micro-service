import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAlertCircle, LucideAward, LucideCalendar, LucideCheckCircle2, LucideSend } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import { AuthStore } from '../../../../core/auth/auth.store';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import {
  GuideHistorique,
  GuideProfil,
  formatGuideStatusLabel,
  guideStatusBadgeClass,
} from '../../../../core/models/guide.model';
import { GuideAgendaItem } from '../../../../core/models/reservation.model';
import { UiAvisSectionComponent } from '../../../../shared/components/ui-avis-section/ui-avis-section.component';
import { UiConfirmDialogComponent } from '../../../../shared/components/ui-confirm-dialog/ui-confirm-dialog.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { UiModalComponent } from '../../../../shared/components/ui-modal/ui-modal.component';
import { UiPageHeaderComponent } from '../../../../shared/components/ui-page-header/ui-page-header.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { GuideApiService } from '../../../guides/data-access/guide-api.service';
import { ReservationApiService } from '../../../reservations/data-access/reservation-api.service';

@Component({
  selector: 'app-pro-guide-workspace-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DateFrPipe,
    UiAvisSectionComponent,
    UiErrorBannerComponent,
    UiPageHeaderComponent,
    UiModalComponent,
    LucideAward,
    LucideSend,
    LucideCheckCircle2,
    LucideCalendar,
    LucideAlertCircle,
  ],
  template: `
    <app-ui-page-header
      eyebrow="Espace Guide Touristique Local"
      title="Mon dossier professionnel & disponibilité"
      subtitle="Consultez vos informations agréées, gérez votre visibilité et suivez vos validations."
    >
      <div header-actions>
        <a routerLink="/pro/circuits" class="bo-btn">Mes circuits</a>
        <a routerLink="/pro/manifestes" class="bo-btn">Mes manifestes</a>
        <button type="button" class="bo-btn bo-btn--primary" (click)="editOpen.set(true)">
          Modifier mon dossier
        </button>
      </div>
    </app-ui-page-header>

    @if (loadError()) {
      <app-ui-error-banner [message]="loadError()!" (retry)="loadWorkspace()" />
    } @else if (loading()) {
      <p class="bo-cell-sub">Chargement de votre dossier guide...</p>
    } @else {
      @if (actionError()) {
        <app-ui-error-banner
          title="Opération impossible"
          [message]="actionError()!"
          [showRetry]="false"
        />
      }

      @if (profil(); as p) {
        <section class="bo-panel">
          <div class="bo-panel__head">
            <div class="bo-actions-cell">
              <span [class]="badgeClass(p.statutValidation)">
                <svg lucideAward [size]="13" aria-hidden="true"></svg>
                {{ formatStatus(p.statutValidation) }}
              </span>
              @if (p.visibilitePublique) {
                <span class="ui-badge ui-badge--success">Visible annuaire public</span>
              } @else {
                <span class="ui-badge ui-badge--neutral">Non visible publiquement</span>
              }
              <span class="ui-badge" [class.ui-badge--success]="p.disponible" [class.ui-badge--neutral]="!p.disponible">
                {{ p.disponible ? 'Disponible' : 'Indisponible' }}
              </span>
            </div>

            <div class="bo-actions-cell">
              @if (p.statutValidation === 'BROUILLON' || p.statutValidation === 'REJETE') {
                <button type="button" class="bo-btn bo-btn--primary" (click)="soumettre()" [disabled]="busy()">
                  <svg lucideSend [size]="14" aria-hidden="true"></svg>
                  <span>Soumettre pour validation</span>
                </button>
              }
              @if (p.statutValidation === 'VALIDE') {
                <button type="button" class="bo-btn" (click)="toggleDisponibilite(p)" [disabled]="busy()">
                  {{ p.disponible ? 'Marquer indisponible' : 'Marquer disponible' }}
                </button>
                <button type="button" class="bo-btn" (click)="toggleVisibilite(p)" [disabled]="busy()">
                  {{ p.visibilitePublique ? 'Masquer annuaire' : 'Rendre visible annuaire' }}
                </button>
              }
              @if (p.statutValidation !== 'DESACTIVE') {
                <button type="button" class="bo-btn bo-btn--danger" (click)="desactiver()" [disabled]="busy()">
                  Désactiver mon profil
                </button>
              }
            </div>
          </div>

          @if (p.motifDecision) {
            <p class="bo-notice">Décision administrative : {{ p.motifDecision }}</p>
          }
        </section>
      }

      <div class="bo-charts-grid">
        <section class="bo-panel">
          <div class="bo-panel__head">
            <h2 class="bo-panel__title">Mon dossier guide</h2>
            <button type="button" class="bo-btn" (click)="editOpen.set(true)">Modifier</button>
          </div>
          @if (profil(); as p) {
            <dl class="bo-kv-list">
              <div class="bo-kv-row"><dt>Présentation</dt><dd>{{ p.presentationCourte }}</dd></div>
              <div class="bo-kv-row"><dt>Zones d'intervention</dt><dd>{{ p.zonesIntervention }}</dd></div>
              <div class="bo-kv-row"><dt>Langues parlées</dt><dd>{{ p.languesParlees }}</dd></div>
              <div class="bo-kv-row"><dt>Spécialités</dt><dd>{{ p.specialites || '—' }}</dd></div>
              <div class="bo-kv-row"><dt>Tarif journalier</dt><dd>{{ p.tarifJournalierIndicatif ?? '—' }} XOF</dd></div>
              <div class="bo-kv-row"><dt>N° carte pro</dt><dd>{{ p.numeroCarteProfessionnelle || '—' }}</dd></div>
            </dl>
          } @else {
            <p class="bo-cell-sub">Dossier non encore initialisé. Cliquez sur « Modifier mon dossier » pour le compléter.</p>
          }
        </section>

        <app-ui-modal
          [open]="editOpen()"
          title="Éditer mon profil guide"
          [showFooter]="false"
          (closed)="editOpen.set(false)"
        >
          <form [formGroup]="guideForm" (ngSubmit)="saveProfil()" class="bo-form-grid" novalidate>
            <div class="bo-field bo-form-span2">
              <label for="guide-pres" class="bo-label">Présentation courte *</label>
              <input id="guide-pres" type="text" class="bo-input" formControlName="presentationCourte" />
              @if (guideForm.controls.presentationCourte.touched && guideForm.controls.presentationCourte.invalid) {
                <p class="bo-error">La présentation courte est obligatoire (5 caractères minimum).</p>
              }
            </div>

            <div class="bo-field bo-form-span2">
              <label for="guide-bio" class="bo-label">Biographie détaillée (20 caractères min.) *</label>
              <textarea id="guide-bio" class="bo-textarea" rows="4" formControlName="biographie"></textarea>
              @if (guideForm.controls.biographie.touched && guideForm.controls.biographie.invalid) {
                <p class="bo-error">Une biographie d'au moins 20 caractères est obligatoire.</p>
              }
            </div>

            <div class="bo-field">
              <label for="guide-langues" class="bo-label">Langues parlées *</label>
              <input id="guide-langues" type="text" class="bo-input" formControlName="languesParlees" placeholder="Français, Diola, Wolof" />
            </div>

            <div class="bo-field">
              <label for="guide-zones" class="bo-label">Zones d'intervention *</label>
              <input id="guide-zones" type="text" class="bo-input" formControlName="zonesIntervention" placeholder="Oussouye, Carabane, Ziguinchor" />
            </div>

            <div class="bo-field bo-form-span2">
              <label for="guide-spec" class="bo-label">Spécialités *</label>
              <input id="guide-spec" type="text" class="bo-input" formControlName="specialites" />
            </div>

            <div class="bo-field">
              <label for="guide-exp" class="bo-label">Années d'expérience *</label>
              <input id="guide-exp" type="number" min="0" max="70" class="bo-input" formControlName="anneesExperience" />
            </div>

            <div class="bo-field">
              <label for="guide-tarif" class="bo-label">Tarif journalier indicatif (XOF)</label>
              <input id="guide-tarif" type="number" min="0" step="500" class="bo-input" formControlName="tarifJournalierIndicatif" />
            </div>

            <div class="bo-field">
              <label for="guide-carte" class="bo-label">N° carte professionnelle</label>
              <input id="guide-carte" type="text" class="bo-input" formControlName="numeroCarteProfessionnelle" />
            </div>

            <div class="bo-field">
              <label for="guide-docs" class="bo-label">Documents justificatifs</label>
              <input id="guide-docs" type="text" class="bo-input" formControlName="documentsJustificatifs" />
            </div>

            <div class="bo-form-span2 bo-actions-cell">
              <button type="submit" class="bo-btn bo-btn--primary" [disabled]="busy()">
                <svg lucideCheckCircle2 [size]="15" aria-hidden="true"></svg>
                <span>{{ busy() ? 'Enregistrement...' : 'Enregistrer mon dossier' }}</span>
              </button>
              <button type="button" class="bo-btn" (click)="editOpen.set(false)">Annuler</button>
            </div>
          </form>
        </app-ui-modal>

        <section class="bo-panel">
          <div class="bo-panel__head">
            <h2 class="bo-panel__title">Historique des validations &amp; transitions</h2>
          </div>
          @if (historique().length === 0) {
            <p class="bo-cell-sub">Aucune décision enregistrée pour le moment.</p>
          } @else {
            <ul style="list-style: none; padding: 0; display: grid; gap: var(--space-3);">
              @for (h of historique(); track h.id) {
                <li style="border-bottom: 1px dashed var(--border-subtle); padding-bottom: var(--space-2);">
                  <div class="bo-actions-cell">
                    <span class="ui-badge ui-badge--neutral">
                      {{ h.ancienStatut || 'INITIAL' }} → {{ h.nouveauStatut }}
                    </span>
                    <span class="bo-cell-sub">{{ h.dateTransition | dateFr: 'd MMM yyyy HH:mm' }}</span>
                  </div>
                  @if (h.motif) {
                    <p style="font-size: var(--text-sm); margin: 0.3rem 0 0;">{{ h.motif }}</p>
                  }
                </li>
              }
            </ul>
          }
        </section>
      </div>

      <section class="bo-panel" style="margin-top: var(--space-6);">
        <div class="bo-panel__head">
          <div>
            <h2 class="bo-panel__title" style="display: flex; align-items: center; gap: var(--space-2);">
              <svg lucideCalendar [size]="18" aria-hidden="true"></svg>
              <span>Mon Agenda &amp; Calendrier des Prestations</span>
            </h2>
            <p class="bo-cell-sub">
              Vue chronologique de vos visites guidées, occupation des places et alertes de conflits d’horaires.
            </p>
          </div>
          <button type="button" class="bo-btn" (click)="loadAgenda()" [disabled]="loadingAgenda()">
            <span>Actualiser l'agenda</span>
          </button>
        </div>

        @if (loadingAgenda()) {
          <p class="bo-cell-sub">Chargement de votre planning...</p>
        } @else if (agendaError()) {
          <app-ui-error-banner [message]="agendaError()!" (retry)="loadAgenda()" />
        } @else if (agenda().length === 0) {
          <div style="padding: var(--space-6); text-align: center; color: var(--ink-muted);">
            <p style="margin: 0; font-size: var(--text-sm);">
              Aucune prestation réservée ou programmée sur vos circuits pour le mois à venir.
            </p>
          </div>
        } @else {
          <div class="bo-table-wrap">
            <table class="bo-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Créneau</th>
                  <th>Circuit</th>
                  <th>Places réservées</th>
                  <th>Réservations</th>
                  <th>Statut d'agenda</th>
                </tr>
              </thead>
              <tbody>
                @for (item of agenda(); track item.circuitId + '-' + item.date + '-' + item.creneau) {
                  <tr [style.background-color]="item.conflit ? 'rgba(239, 68, 68, 0.08)' : null">
                    <td>
                      <strong>{{ item.date | dateFr: 'EEE d MMM yyyy' }}</strong>
                    </td>
                    <td>
                      <span class="ui-badge ui-badge--neutral">{{ item.creneau }}</span>
                    </td>
                    <td>
                      <strong>{{ item.nomCircuit }}</strong>
                      <span class="bo-cell-sub" style="display: block;">Réf circuit {{ item.circuitId }}</span>
                    </td>
                    <td class="tabular-nums">
                      <strong>{{ item.placesOccupees }}</strong>
                      @if (item.placesMax > 0) {
                        <span class="bo-cell-sub"> / {{ item.placesMax }} max</span>
                      }
                    </td>
                    <td class="tabular-nums">
                      {{ item.nombreReservations }} dossier(s)
                    </td>
                    <td>
                      @if (item.conflit) {
                        <span class="ui-badge ui-badge--danger" style="display: inline-flex; align-items: center; gap: 4px;" title="Attention : deux circuits différents sont programmés sur la même plage horaire !">
                          <svg lucideAlertCircle [size]="12" aria-hidden="true"></svg>
                          Conflit détecté
                        </span>
                      } @else {
                        <span class="ui-badge ui-badge--success" style="display: inline-flex; align-items: center; gap: 4px;">
                          <svg lucideCheckCircle2 [size]="12" aria-hidden="true"></svg>
                          Confirmé
                        </span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      @if (authStore.user(); as u) {
        <section class="bo-panel">
          <app-ui-avis-section cibleType="GUIDE" [cibleId]="u.id" />
        </section>
      }
    }
  `,
})
export class ProGuideWorkspacePageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(Dialog);
  protected readonly authStore = inject(AuthStore);
  private readonly guideApi = inject(GuideApiService);
  private readonly reservationApi = inject(ReservationApiService);

  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly editOpen = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  protected readonly profil = signal<GuideProfil | null>(null);
  protected readonly historique = signal<GuideHistorique[]>([]);

  protected readonly agenda = signal<GuideAgendaItem[]>([]);
  protected readonly loadingAgenda = signal(false);
  protected readonly agendaError = signal<string | null>(null);

  protected readonly formatStatus = formatGuideStatusLabel;
  protected readonly badgeClass = guideStatusBadgeClass;

  protected readonly guideForm = this.fb.nonNullable.group({
    presentationCourte: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
    biographie: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(4000)]],
    languesParlees: ['Français', [Validators.required]],
    zonesIntervention: ['Ziguinchor, Basse-Casamance', [Validators.required]],
    specialites: ['Histoire & Patrimoine culturel', [Validators.required]],
    anneesExperience: [0, [Validators.required, Validators.min(0), Validators.max(70)]],
    tarifJournalierIndicatif: [0 as number | null, [Validators.min(0)]],
    numeroCarteProfessionnelle: [''],
    documentsJustificatifs: [''],
  });

  ngOnInit(): void {
    void this.loadWorkspace();
    void this.loadAgenda();
  }

  async loadWorkspace(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    this.actionError.set(null);
    try {
      const p = await firstValueFrom(this.guideApi.getMonProfil());
      this.profil.set(p);
      this.guideForm.patchValue({
        presentationCourte: p.presentationCourte ?? '',
        biographie: p.biographie ?? '',
        languesParlees: p.languesParlees ?? 'Français',
        zonesIntervention: p.zonesIntervention ?? '',
        specialites: p.specialites ?? '',
        anneesExperience: p.anneesExperience ?? 0,
        tarifJournalierIndicatif: p.tarifJournalierIndicatif ?? null,
        numeroCarteProfessionnelle: p.numeroCarteProfessionnelle ?? '',
        documentsJustificatifs: p.documentsJustificatifs ?? '',
      });
      const hist = await firstValueFrom(this.guideApi.getHistorique(p.id));
      this.historique.set(hist);
    } catch (err) {
      const msg = extractErrorMessage(err);
      if (msg.toLowerCase().includes('introuvable') || msg.includes('404')) {
        this.profil.set(null);
      } else {
        this.loadError.set(msg);
      }
    } finally {
      this.loading.set(false);
    }
  }

  async saveProfil(): Promise<void> {
    this.actionError.set(null);
    if (this.guideForm.invalid) {
      this.guideForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    try {
      const v = this.guideForm.getRawValue();
      const saved = await firstValueFrom(
        this.guideApi.upsertMonProfil({
          presentationCourte: v.presentationCourte.trim(),
          biographie: v.biographie.trim(),
          languesParlees: v.languesParlees.trim(),
          zonesIntervention: v.zonesIntervention.trim(),
          specialites: v.specialites.trim(),
          anneesExperience: Number(v.anneesExperience),
          tarifJournalierIndicatif: v.tarifJournalierIndicatif != null ? Number(v.tarifJournalierIndicatif) : null,
          numeroCarteProfessionnelle: v.numeroCarteProfessionnelle.trim() || null,
          documentsJustificatifs: v.documentsJustificatifs.trim() || null,
        })
      );
      this.profil.set(saved);
      toast.success('Profil guide enregistré avec succès.');
      const hist = await firstValueFrom(this.guideApi.getHistorique(saved.id));
      this.historique.set(hist);
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async soumettre(): Promise<void> {
    this.busy.set(true);
    this.actionError.set(null);
    try {
      const updated = await firstValueFrom(this.guideApi.soumettreMonProfil());
      this.profil.set(updated);
      toast.success('Dossier soumis pour validation administrative.');
      this.historique.set(await firstValueFrom(this.guideApi.getHistorique(updated.id)));
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async toggleDisponibilite(p: GuideProfil): Promise<void> {
    this.busy.set(true);
    this.actionError.set(null);
    try {
      const updated = await firstValueFrom(
        this.guideApi.changerDisponibilite(!p.disponible, p.visibilitePublique)
      );
      this.profil.set(updated);
      toast.success(updated.disponible ? 'Statut : Disponible.' : 'Statut : Indisponible.');
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async toggleVisibilite(p: GuideProfil): Promise<void> {
    this.busy.set(true);
    this.actionError.set(null);
    try {
      const updated = await firstValueFrom(
        this.guideApi.changerDisponibilite(p.disponible, !p.visibilitePublique)
      );
      this.profil.set(updated);
      toast.success(updated.visibilitePublique ? 'Profil visible publiquement.' : 'Profil masqué de l’annuaire.');
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async desactiver(): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialog
        .open<boolean>(UiConfirmDialogComponent, {
          data: {
            title: 'Désactiver votre profil guide ?',
            message:
              'Votre profil ne sera plus visible dans l’annuaire public ni disponible pour de nouveaux circuits.',
            confirmLabel: 'Confirmer la désactivation',
            cancelLabel: 'Conserver actif',
            variant: 'danger',
          },
        })
        .closed
    );
    if (!confirmed) return;

    this.busy.set(true);
    this.actionError.set(null);
    try {
      const updated = await firstValueFrom(
        this.guideApi.desactiverMonProfil('Désactivation volontaire par le guide')
      );
      this.profil.set(updated);
      toast.info('Votre profil guide a été désactivé.');
      this.historique.set(await firstValueFrom(this.guideApi.getHistorique(updated.id)));
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async loadAgenda(): Promise<void> {
    this.loadingAgenda.set(true);
    this.agendaError.set(null);
    try {
      const items = await firstValueFrom(this.reservationApi.getGuideAgenda());
      this.agenda.set(items ?? []);
    } catch (err) {
      this.agendaError.set(extractErrorMessage(err));
    } finally {
      this.loadingAgenda.set(false);
    }
  }
}
