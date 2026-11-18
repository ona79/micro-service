import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideCheckCircle2, LucideEye, LucideRefreshCw } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import { AuthStore } from '../../../../core/auth/auth.store';
import { PermissionService } from '../../../../core/auth/permissions';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import {
  GuideHistorique,
  GuideProfil,
  StatutValidationGuide,
  formatGuideStatusLabel,
  guideStatusBadgeClass,
} from '../../../../core/models/guide.model';
import { GuideStats } from '../../../../core/models/statistics.model';
import { UiConfirmDialogComponent } from '../../../../shared/components/ui-confirm-dialog/ui-confirm-dialog.component';
import { UiDetailDrawerComponent } from '../../../../shared/components/ui-detail-drawer/ui-detail-drawer.component';
import { UiEmptyStateComponent } from '../../../../shared/components/ui-empty-state/ui-empty-state.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { UiKpiCardComponent } from '../../../../shared/components/ui-kpi-card/ui-kpi-card.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import { GuideApiService } from '../../../guides/data-access/guide-api.service';

@Component({
  selector: 'app-pro-guides-admin-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DateFrPipe,
    FcfaPricePipe,
    UiKpiCardComponent,
    UiDetailDrawerComponent,
    UiEmptyStateComponent,
    UiErrorBannerComponent,
    LucideEye,
    LucideRefreshCw,
    LucideCheckCircle2,
  ],
  template: `
    <header class="bo-header">
      <div>
        <p class="bo-header__eyebrow">Corps des guides ms-utilisateur</p>
        <h1 class="bo-header__title">Instruction &amp; validation des guides touristiques</h1>
        <p class="bo-header__lead">
          Examinez les pièces justificatives, validez les dossiers complets ou appliquez des mesures
          motivées de rejet, suspension ou réactivation.
        </p>
      </div>
      <button type="button" class="bo-btn" (click)="loadAll()" [disabled]="loading()">
        <svg lucideRefreshCw [size]="14" aria-hidden="true"></svg>
        <span>Actualiser</span>
      </button>
    </header>

    @if (stats(); as s) {
      <div class="bo-kpi-grid">
        <app-ui-kpi-card label="Total dossiers" [value]="s.total" />
        <app-ui-kpi-card label="En attente validation" [value]="s.enAttenteValidation" tone="ochre" />
        <app-ui-kpi-card label="Validés" [value]="s.valides" tone="success" subtitle="Disponibles : {{ s.disponiblesEtValides }}" />
        <app-ui-kpi-card label="Rejetés / Suspendus" [value]="s.rejetes + ' / ' + s.suspendus" tone="danger" />
      </div>
    }

    @if (actionError()) {
      <app-ui-error-banner [message]="actionError()!" [showRetry]="false" />
    }

    <section class="bo-panel">
      <div class="bo-filters">
        <div class="bo-field bo-field--grow">
          <label for="guide-q" class="bo-label">Recherche</label>
          <input id="guide-q" type="search" class="bo-input" [(ngModel)]="q" placeholder="Nom, email, zone, langue..." />
        </div>
        <div class="bo-field">
          <label for="guide-fstatut" class="bo-label">Statut validation</label>
          <select id="guide-fstatut" class="bo-select" [(ngModel)]="statutFilter" (ngModelChange)="loadGuides()">
            <option value="">Tous les statuts</option>
            <option value="EN_ATTENTE_VALIDATION">EN_ATTENTE_VALIDATION</option>
            <option value="VALIDE">VALIDE</option>
            <option value="BROUILLON">BROUILLON</option>
            <option value="REJETE">REJETE</option>
            <option value="SUSPENDU">SUSPENDU</option>
            <option value="DESACTIVE">DESACTIVE</option>
          </select>
        </div>
      </div>

      @if (error()) {
        <app-ui-error-banner [message]="error()!" (retry)="loadAll()" />
      } @else if (loading()) {
        <p class="bo-cell-sub">Chargement des dossiers guides...</p>
      } @else if (filteredGuides().length === 0) {
        <app-ui-empty-state title="Aucun dossier guide" description="Aucun guide ne correspond à ces critères." />
      } @else {
        <div class="bo-table-wrap">
          <table class="bo-table">
            <thead>
              <tr>
                <th>Guide</th>
                <th>Zones &amp; Langues</th>
                <th>Expérience &amp; Agrément</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (g of filteredGuides(); track g.id) {
                <tr>
                  <td>
                    <span class="bo-cell-title">{{ g.prenom }} {{ g.nom }}</span>
                    <span class="bo-cell-sub">{{ g.email || 'User #' + g.utilisateurId }} · {{ g.telephone || 'N/A' }}</span>
                  </td>
                  <td>
                    <span>{{ g.zonesIntervention }}</span>
                    <span class="bo-cell-sub">{{ g.languesParlees }}</span>
                  </td>
                  <td class="tabular-nums">
                    {{ g.anneesExperience }} an(s)
                    <span class="bo-cell-sub">Carte : {{ g.numeroCarteProfessionnelle || 'Non renseignée' }}</span>
                  </td>
                  <td>
                    <span [class]="badgeClass(g.statutValidation)">
                      {{ formatStatus(g.statutValidation) }}
                    </span>
                  </td>
                  <td>
                    <div class="bo-actions-cell">
                      <button type="button" class="bo-btn bo-btn--sm" (click)="openDetail(g)">
                        <svg lucideEye [size]="13" aria-hidden="true"></svg>
                        <span>Instruire / Détail</span>
                      </button>
                      @if (g.statutValidation === 'EN_ATTENTE_VALIDATION' || g.statutValidation === 'REJETE') {
                        <button type="button" class="bo-btn bo-btn--sm bo-btn--primary" (click)="valider(g)" [disabled]="busy()">
                          <svg lucideCheckCircle2 [size]="13" aria-hidden="true"></svg>
                          <span>Valider</span>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>

    <app-ui-detail-drawer
      [open]="selectedGuide() !== null"
      [title]="selectedGuide() ? selectedGuide()!.prenom + ' ' + selectedGuide()!.nom : ''"
      [eyebrow]="'Dossier Guide #' + (selectedGuide()?.id ?? '')"
      (close)="selectedGuide.set(null)"
    >
      @if (selectedGuide(); as g) {
        <dl class="bo-kv-list">
          <div class="bo-kv-row"><dt>Statut</dt><dd><span [class]="badgeClass(g.statutValidation)">{{ formatStatus(g.statutValidation) }}</span></dd></div>
          <div class="bo-kv-row"><dt>Email / Tél</dt><dd>{{ g.email || '—' }} · {{ g.telephone || '—' }}</dd></div>
          <div class="bo-kv-row"><dt>Zones / Langues</dt><dd>{{ g.zonesIntervention }} · {{ g.languesParlees }}</dd></div>
          <div class="bo-kv-row"><dt>Spécialités</dt><dd>{{ g.specialites }}</dd></div>
          <div class="bo-kv-row"><dt>N° carte pro</dt><dd>{{ g.numeroCarteProfessionnelle || 'Non fourni' }}</dd></div>
          <div class="bo-kv-row"><dt>Documents</dt><dd>{{ g.documentsJustificatifs || 'Non fourni' }}</dd></div>
          <div class="bo-kv-row"><dt>Tarif indicatif</dt><dd>{{ (g.tarifJournalierIndicatif ?? 0) | fcfaPrice }}</dd></div>
          <div class="bo-kv-row"><dt>Biographie</dt><dd>{{ g.biographie }}</dd></div>
          @if (g.motifDecision) {
            <div class="bo-kv-row"><dt>Dernier motif</dt><dd>{{ g.motifDecision }}</dd></div>
          }
        </dl>

        <div class="bo-panel" style="margin: 0;">
          @if (isSelfDossier(g)) {
            <p class="bo-notice" style="margin: 0;">
              Interdiction déontologique : vous ne pouvez pas instruire, valider ou rejeter votre propre dossier guide.
            </p>
          } @else {
            <label for="guide-motif-input" class="bo-label">Motif de décision (obligatoire pour rejet / suspension)</label>
            <textarea id="guide-motif-input" class="bo-textarea" rows="2" [(ngModel)]="decisionMotif"></textarea>
            @if (motifError()) {
              <p class="bo-error">{{ motifError() }}</p>
            }
            <div class="bo-actions-cell" style="margin-top: var(--space-3);">
              @if (permissions.has('GUIDE:VALIDER') && (g.statutValidation === 'EN_ATTENTE_VALIDATION' || g.statutValidation === 'REJETE')) {
                <button type="button" class="bo-btn bo-btn--primary" (click)="valider(g)" [disabled]="busy()">Valider dossier</button>
              }
              @if (permissions.has('GUIDE:VALIDER') && g.statutValidation === 'EN_ATTENTE_VALIDATION') {
                <button type="button" class="bo-btn bo-btn--danger" (click)="rejeter(g)" [disabled]="busy()">Rejeter (motif requis)</button>
              }
              @if (permissions.has('GUIDE:SUSPENDRE') && g.statutValidation === 'VALIDE') {
                <button type="button" class="bo-btn bo-btn--terracotta" (click)="suspendre(g)" [disabled]="busy()">Suspendre</button>
              }
              @if (permissions.has('GUIDE:VALIDER') && (g.statutValidation === 'SUSPENDU' || g.statutValidation === 'DESACTIVE')) {
                <button type="button" class="bo-btn bo-btn--primary" (click)="reactiver(g)" [disabled]="busy()">Réactiver</button>
              }
              @if (permissions.has('GUIDE:SUSPENDRE') && g.statutValidation !== 'DESACTIVE') {
                <button type="button" class="bo-btn bo-btn--danger" (click)="desactiver(g)" [disabled]="busy()">Désactiver</button>
              }
            </div>
          }
        </div>

        <section>
          <h3 class="bo-label" style="margin-bottom: var(--space-2);">Historique audit validation</h3>
          @if (historique().length === 0) {
            <p class="bo-cell-sub">Aucune transition historisée.</p>
          } @else {
            <ul style="list-style: none; padding: 0; display: grid; gap: 0.4rem;">
              @for (h of historique(); track h.id) {
                <li style="font-size: var(--text-xs); border-bottom: 1px dashed var(--border-subtle); padding-bottom: 0.3rem;">
                  <strong>{{ h.ancienStatut || 'INITIAL' }} → {{ h.nouveauStatut }}</strong>
                  · {{ h.dateTransition | dateFr: 'd MMM yyyy HH:mm' }} ({{ h.acteurRole || 'SYSTEM' }})
                  @if (h.motif) {
                    <div class="bo-cell-sub">{{ h.motif }}</div>
                  }
                </li>
              }
            </ul>
          }
        </section>
      }
    </app-ui-detail-drawer>
  `,
})
export class ProGuidesAdminPageComponent implements OnInit {
  private readonly dialog = inject(Dialog);
  protected readonly permissions = inject(PermissionService);
  protected readonly authStore = inject(AuthStore);
  private readonly api = inject(GuideApiService);

  protected isSelfDossier(g: GuideProfil): boolean {
    return Boolean(this.authStore.user()?.id && g.utilisateurId === this.authStore.user()?.id);
  }

  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly motifError = signal<string | null>(null);
  protected readonly stats = signal<GuideStats | null>(null);
  protected readonly guides = signal<GuideProfil[]>([]);
  protected readonly selectedGuide = signal<GuideProfil | null>(null);
  protected readonly historique = signal<GuideHistorique[]>([]);

  protected q = '';
  protected statutFilter: StatutValidationGuide | '' = '';
  protected decisionMotif = '';

  protected readonly formatStatus = formatGuideStatusLabel;
  protected readonly badgeClass = guideStatusBadgeClass;

  protected readonly filteredGuides = computed(() => {
    const query = this.q.trim().toLowerCase();
    return this.guides().filter((g) => {
      if (!query) return true;
      return `${g.prenom} ${g.nom} ${g.email ?? ''} ${g.zonesIntervention} ${g.languesParlees} ${g.specialites}`
        .toLowerCase()
        .includes(query);
    });
  });

  ngOnInit(): void {
    void this.loadAll();
  }

  async loadAll(): Promise<void> {
    await Promise.all([this.loadStats(), this.loadGuides()]);
  }

  async loadStats(): Promise<void> {
    try {
      this.stats.set(await firstValueFrom(this.api.getStatistiques()));
    } catch {
      // Silencieux
    }
  }

  async loadGuides(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.guides.set(await firstValueFrom(this.api.getAllAdmin(this.statutFilter || undefined)));
    } catch (err) {
      this.error.set(extractErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async openDetail(g: GuideProfil): Promise<void> {
    this.selectedGuide.set(g);
    this.motifError.set(null);
    this.decisionMotif = '';
    try {
      this.historique.set(await firstValueFrom(this.api.getHistorique(g.id)));
    } catch {
      this.historique.set([]);
    }
  }

  async valider(g: GuideProfil): Promise<void> {
    if (this.isSelfDossier(g)) {
      this.actionError.set('Interdiction déontologique : vous ne pouvez pas valider votre propre dossier guide.');
      return;
    }
    this.busy.set(true);
    this.actionError.set(null);
    try {
      const updated = await firstValueFrom(
        this.api.validerProfil(g.id, this.decisionMotif.trim() || 'Dossier vérifié et approuvé.')
      );
      toast.success(`Guide ${g.prenom} ${g.nom} validé.`);
      await this.loadAll();
      if (this.selectedGuide()?.id === g.id) {
        await this.openDetail(updated);
      }
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async rejeter(g: GuideProfil): Promise<void> {
    this.motifError.set(null);
    if (this.decisionMotif.trim().length < 5) {
      this.motifError.set('Un motif explicite (5 caractères minimum) est obligatoire pour rejeter.');
      return;
    }
    this.busy.set(true);
    try {
      const updated = await firstValueFrom(this.api.rejeterProfil(g.id, this.decisionMotif.trim()));
      toast.info('Dossier guide rejeté.');
      await this.loadAll();
      await this.openDetail(updated);
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async suspendre(g: GuideProfil): Promise<void> {
    this.motifError.set(null);
    if (this.decisionMotif.trim().length < 5) {
      this.motifError.set('Un motif explicite (5 caractères minimum) est obligatoire pour suspendre.');
      return;
    }
    this.busy.set(true);
    try {
      const updated = await firstValueFrom(this.api.suspendreProfil(g.id, this.decisionMotif.trim()));
      toast.warning('Guide suspendu.');
      await this.loadAll();
      await this.openDetail(updated);
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async reactiver(g: GuideProfil): Promise<void> {
    this.busy.set(true);
    try {
      const updated = await firstValueFrom(
        this.api.reactiverProfil(g.id, this.decisionMotif.trim() || 'Réactivation suite à réexamen.')
      );
      toast.success('Profil guide réactivé.');
      await this.loadAll();
      await this.openDetail(updated);
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async desactiver(g: GuideProfil): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open<boolean>(UiConfirmDialogComponent, {
          data: {
            title: `Désactiver le profil guide de ${g.prenom} ${g.nom} ?`,
            message: 'Le guide sera retiré de l’annuaire public et son historique restera audité.',
            confirmLabel: 'Désactiver',
            cancelLabel: 'Annuler',
            variant: 'danger',
          },
        })
        .closed
    );
    if (!ok) return;
    this.busy.set(true);
    try {
      const updated = await firstValueFrom(
        this.api.desactiverProfilParAdmin(g.id, this.decisionMotif.trim() || 'Désactivation administrative')
      );
      toast.info('Profil guide désactivé.');
      await this.loadAll();
      await this.openDetail(updated);
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
