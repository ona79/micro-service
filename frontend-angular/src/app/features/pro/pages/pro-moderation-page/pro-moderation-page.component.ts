import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideEye, LucideRefreshCw } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import {
  Avis,
  AvisModerationHistorique,
  CibleAvis,
  SignalementAvis,
  StatutModerationAvis,
  StatutSignalement,
  formatModerationStatusLabel,
  moderationBadgeClass,
} from '../../../../core/models/avis.model';
import { ModerationStats } from '../../../../core/models/statistics.model';
import { UiDetailDrawerComponent } from '../../../../shared/components/ui-detail-drawer/ui-detail-drawer.component';
import { UiEmptyStateComponent } from '../../../../shared/components/ui-empty-state/ui-empty-state.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { UiKpiCardComponent } from '../../../../shared/components/ui-kpi-card/ui-kpi-card.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { AvisApiService } from '../../../avis/data-access/avis-api.service';

@Component({
  selector: 'app-pro-moderation-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DateFrPipe,
    UiKpiCardComponent,
    UiDetailDrawerComponent,
    UiEmptyStateComponent,
    UiErrorBannerComponent,
    LucideEye,
    LucideRefreshCw,
  ],
  template: `
    <header class="bo-header">
      <div>
        <p class="bo-header__eyebrow">Modération &amp; Qualité ms-reservation</p>
        <h1 class="bo-header__title">Modération des avis &amp; signalements</h1>
        <p class="bo-header__lead">
          Traitez les signalements ouverts et modérez les avis avec justification obligatoire (5
          caractères min.) et journalisation immuable.
        </p>
      </div>
      <button type="button" class="bo-btn" (click)="loadAll()" [disabled]="loading()">
        <svg lucideRefreshCw [size]="14" aria-hidden="true"></svg>
        <span>Actualiser</span>
      </button>
    </header>

    @if (stats(); as s) {
      <div class="bo-kpi-grid">
        <app-ui-kpi-card label="Signalements ouverts" [value]="s.signalementsOuverts" [tone]="s.signalementsOuverts > 0 ? 'danger' : 'success'" subtitle="Total signalements : {{ s.totalSignalements }}" />
        <app-ui-kpi-card label="Avis approuvés" [value]="s.approuves" tone="success" subtitle="Note moy. : {{ s.noteMoyenneApprouves }} / 5" />
        <app-ui-kpi-card label="Avis masqués / rejetés" [value]="s.masques + ' / ' + s.rejetes" tone="ochre" />
        <app-ui-kpi-card label="Total avis vérifiés" [value]="s.totalAvis" />
      </div>
    }

    <div class="bo-tabs" role="tablist">
      <button type="button" role="tab" class="bo-tab" [class.bo-tab--active]="activeTab() === 'signalements'" (click)="activeTab.set('signalements')">
        File des signalements ({{ signalements().length }})
      </button>
      <button type="button" role="tab" class="bo-tab" [class.bo-tab--active]="activeTab() === 'avis'" (click)="activeTab.set('avis')">
        Tous les avis ({{ avis().length }})
      </button>
    </div>

    @if (actionError()) {
      <app-ui-error-banner title="Décision refusée" [message]="actionError()!" [showRetry]="false" />
    }

    @if (activeTab() === 'signalements') {
      <section class="bo-panel">
        <div class="bo-filters">
          <div class="bo-field">
            <label for="sig-statut" class="bo-label">Statut signalement</label>
            <select id="sig-statut" class="bo-select" [(ngModel)]="sigStatut" (ngModelChange)="loadSignalements()">
              <option value="OUVERT">OUVERT (à traiter)</option>
              <option value="VALIDE_CONTENU_RETIRE">VALIDE_CONTENU_RETIRE</option>
              <option value="REJETE_ABUSIF">REJETE_ABUSIF</option>
              <option value="">Tous</option>
            </select>
          </div>
        </div>

        @if (error()) {
          <app-ui-error-banner [message]="error()!" (retry)="loadAll()" />
        } @else if (loading()) {
          <p class="bo-cell-sub">Chargement des signalements...</p>
        } @else if (signalements().length === 0) {
          <app-ui-empty-state title="Aucun signalement" description="La file sélectionnée est vide." />
        } @else {
          <div class="bo-table-wrap">
            <table class="bo-table">
              <thead>
                <tr>
                  <th>Date &amp; Catégorie</th>
                  <th>Motif signalement</th>
                  <th>Avis ciblé</th>
                  <th>Statut</th>
                  <th>Décision</th>
                </tr>
              </thead>
              <tbody>
                @for (s of signalements(); track s.id) {
                  <tr>
                    <td>
                      <strong>#{{ s.id }} · {{ s.categorie }}</strong>
                      <span class="bo-cell-sub">{{ s.dateSignalement | dateFr: 'd MMM yyyy HH:mm' }} par {{ s.signaleParNom }}</span>
                    </td>
                    <td>{{ s.motif }}</td>
                    <td>
                      <span class="bo-cell-title">Avis #{{ s.avisId }} ({{ s.avisStatutActuel || 'INCONNU' }})</span>
                      @if (s.avis) {
                        <span class="bo-cell-sub">« {{ s.avis.commentaire }} »</span>
                      }
                    </td>
                    <td>
                      <span class="ui-badge" [class.ui-badge--warning]="s.statut === 'OUVERT'" [class.ui-badge--danger]="s.statut === 'VALIDE_CONTENU_RETIRE'" [class.ui-badge--neutral]="s.statut === 'REJETE_ABUSIF'">
                        {{ s.statut }}
                      </span>
                    </td>
                    <td>
                      <div class="bo-actions-cell">
                        @if (s.avis) {
                          <button type="button" class="bo-btn bo-btn--sm" (click)="openAvisHistory(s.avis!)">
                            <svg lucideEye [size]="12" aria-hidden="true"></svg>
                            <span>Historique</span>
                          </button>
                        }
                        @if (s.statut === 'OUVERT') {
                          <button type="button" class="bo-btn bo-btn--sm bo-btn--danger" (click)="openSigDecision(s, 'VALIDE_CONTENU_RETIRE')">
                            Retirer / Masquer avis
                          </button>
                          <button type="button" class="bo-btn bo-btn--sm" (click)="openSigDecision(s, 'REJETE_ABUSIF')">
                            Rejeter signalement
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
    } @else {
      <section class="bo-panel">
        <div class="bo-filters">
          <div class="bo-field">
            <label for="mod-cible" class="bo-label">Cible</label>
            <select id="mod-cible" class="bo-select" [(ngModel)]="cibleFilter" (ngModelChange)="loadAvis()">
              <option value="">Toutes</option>
              <option value="PATRIMOINE">PATRIMOINE</option>
              <option value="CIRCUIT">CIRCUIT</option>
              <option value="EVENEMENT">EVENEMENT</option>
              <option value="GUIDE">GUIDE</option>
            </select>
          </div>
          <div class="bo-field">
            <label for="mod-statut" class="bo-label">Statut modération</label>
            <select id="mod-statut" class="bo-select" [(ngModel)]="avisStatutFilter" (ngModelChange)="loadAvis()">
              <option value="">Tous</option>
              <option value="APPROUVE">APPROUVE</option>
              <option value="EN_ATTENTE">EN_ATTENTE</option>
              <option value="MASQUE">MASQUE</option>
              <option value="REJETE">REJETE</option>
            </select>
          </div>
        </div>

        @if (avis().length === 0) {
          <app-ui-empty-state title="Aucun avis" description="Aucun avis trouvé pour ce filtre." />
        } @else {
          <div class="bo-table-wrap">
            <table class="bo-table">
              <thead>
                <tr>
                  <th>Auteur &amp; Note</th>
                  <th>Cible &amp; Commentaire</th>
                  <th>Statut</th>
                  <th>Modération</th>
                </tr>
              </thead>
              <tbody>
                @for (a of avis(); track a.id) {
                  <tr>
                    <td>
                      <span class="bo-cell-title">{{ a.auteurNom }}</span>
                      <span class="bo-cell-sub">{{ a.note }} / 5 · {{ a.datePublication | dateFr: 'd MMM yyyy' }}</span>
                    </td>
                    <td>
                      <span class="ui-badge ui-badge--neutral">{{ a.cibleType }} #{{ a.cibleId }}</span>
                      <span class="bo-cell-sub">{{ a.commentaire }}</span>
                    </td>
                    <td>
                      <span [class]="modBadge(a.statutModeration)">{{ modLabel(a.statutModeration) }}</span>
                    </td>
                    <td>
                      <div class="bo-actions-cell">
                        <button type="button" class="bo-btn bo-btn--sm" (click)="openAvisHistory(a)">
                          <svg lucideEye [size]="12" aria-hidden="true"></svg>
                          <span>Audit</span>
                        </button>
                        @if (a.statutModeration !== 'MASQUE' && a.statutModeration !== 'REJETE') {
                          <button type="button" class="bo-btn bo-btn--sm bo-btn--terracotta" (click)="openAvisDecision(a, 'MASQUE')">Masquer</button>
                        }
                        @if (a.statutModeration === 'MASQUE' || a.statutModeration === 'EN_ATTENTE') {
                          <button type="button" class="bo-btn bo-btn--sm bo-btn--primary" (click)="openAvisDecision(a, 'APPROUVE')">Approuver</button>
                        }
                        @if (a.statutModeration !== 'REJETE') {
                          <button type="button" class="bo-btn bo-btn--sm bo-btn--danger" (click)="openAvisDecision(a, 'REJETE')">Rejeter</button>
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
    }

    <app-ui-detail-drawer
      [open]="drawerOpen()"
      [title]="drawerTitle()"
      eyebrow="Justification &amp; audit modération"
      (close)="closeDrawer()"
    >
      @if (pendingSigDecision(); as ps) {
        <div class="bo-panel" style="margin: 0;">
          <p class="bo-cell-title">Traiter signalement #{{ ps.sig.id }} → {{ ps.decision }}</p>
          <p class="bo-cell-sub">{{ ps.sig.motif }}</p>
          <label for="sig-justif" class="bo-label" style="margin-top: var(--space-3);">Justification obligatoire (5 car. min.) *</label>
          <textarea id="sig-justif" class="bo-textarea" rows="3" [(ngModel)]="justification"></textarea>
          @if (justifError()) {
            <p class="bo-error">{{ justifError() }}</p>
          }
          <div class="bo-actions-cell" style="margin-top: var(--space-3);">
            <button type="button" class="bo-btn bo-btn--primary" (click)="confirmSigDecision()" [disabled]="busy()">
              Valider décision
            </button>
            <button type="button" class="bo-btn" (click)="closeDrawer()">Annuler</button>
          </div>
        </div>
      }

      @if (pendingAvisDecision(); as pa) {
        <div class="bo-panel" style="margin: 0;">
          <p class="bo-cell-title">Modérer avis #{{ pa.avis.id }} → {{ pa.decision }}</p>
          <p class="bo-cell-sub">« {{ pa.avis.commentaire }} »</p>
          <label for="avis-justif" class="bo-label" style="margin-top: var(--space-3);">Justification obligatoire (5 car. min.) *</label>
          <textarea id="avis-justif" class="bo-textarea" rows="3" [(ngModel)]="justification"></textarea>
          @if (justifError()) {
            <p class="bo-error">{{ justifError() }}</p>
          }
          <div class="bo-actions-cell" style="margin-top: var(--space-3);">
            <button type="button" class="bo-btn bo-btn--primary" (click)="confirmAvisDecision()" [disabled]="busy()">
              Confirmer modération
            </button>
            <button type="button" class="bo-btn" (click)="closeDrawer()">Annuler</button>
          </div>
        </div>
      }

      @if (historique().length > 0) {
        <section>
          <h3 class="bo-label" style="margin-bottom: var(--space-2);">Journal immuable de modération</h3>
          <ul style="list-style: none; padding: 0; display: grid; gap: 0.35rem;">
            @for (h of historique(); track h.id) {
              <li style="font-size: var(--text-xs); border-bottom: 1px dashed var(--border-subtle); padding-bottom: 0.3rem;">
                <strong>{{ h.ancienStatut || 'INITIAL' }} → {{ h.nouveauStatut }}</strong>
                · {{ h.dateDecision | dateFr: 'd MMM yyyy HH:mm' }} ({{ h.acteurRole }})
                <div class="bo-cell-sub">{{ h.justification }}</div>
              </li>
            }
          </ul>
        </section>
      }
    </app-ui-detail-drawer>
  `,
})
export class ProModerationPageComponent implements OnInit {
  private readonly avisApi = inject(AvisApiService);

  protected readonly activeTab = signal<'signalements' | 'avis'>('signalements');
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly justifError = signal<string | null>(null);
  protected readonly stats = signal<ModerationStats | null>(null);
  protected readonly signalements = signal<SignalementAvis[]>([]);
  protected readonly avis = signal<Avis[]>([]);
  protected readonly historique = signal<AvisModerationHistorique[]>([]);

  protected readonly drawerOpen = signal(false);
  protected readonly drawerTitle = signal('');
  protected readonly pendingSigDecision = signal<{ sig: SignalementAvis; decision: StatutSignalement } | null>(null);
  protected readonly pendingAvisDecision = signal<{ avis: Avis; decision: StatutModerationAvis } | null>(null);

  protected sigStatut: StatutSignalement | '' = 'OUVERT';
  protected cibleFilter: CibleAvis | '' = '';
  protected avisStatutFilter: StatutModerationAvis | '' = '';
  protected justification = '';

  protected readonly modLabel = formatModerationStatusLabel;
  protected readonly modBadge = moderationBadgeClass;

  ngOnInit(): void {
    void this.loadAll();
  }

  async loadAll(): Promise<void> {
    await Promise.all([this.loadStats(), this.loadSignalements(), this.loadAvis()]);
  }

  async loadStats(): Promise<void> {
    try {
      this.stats.set(await firstValueFrom(this.avisApi.getModerationStatistiques()));
    } catch {
      // Silencieux
    }
  }

  async loadSignalements(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.signalements.set(
        await firstValueFrom(this.avisApi.getSignalementsModeration(this.sigStatut || undefined))
      );
    } catch (err) {
      this.error.set(extractErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async loadAvis(): Promise<void> {
    try {
      this.avis.set(
        await firstValueFrom(
          this.avisApi.getAvisModeration(this.cibleFilter || undefined, this.avisStatutFilter || undefined)
        )
      );
    } catch {
      // Silencieux si onglet secondaire
    }
  }

  async openAvisHistory(a: Avis): Promise<void> {
    this.pendingSigDecision.set(null);
    this.pendingAvisDecision.set(null);
    this.drawerTitle.set(`Historique avis #${a.id}`);
    this.drawerOpen.set(true);
    try {
      this.historique.set(await firstValueFrom(this.avisApi.getHistoriqueModeration(a.id)));
    } catch {
      this.historique.set([]);
    }
  }

  openSigDecision(sig: SignalementAvis, decision: StatutSignalement): void {
    this.pendingAvisDecision.set(null);
    this.pendingSigDecision.set({ sig, decision });
    this.justification = '';
    this.justifError.set(null);
    this.drawerTitle.set(`Signalement #${sig.id}`);
    this.historique.set([]);
    this.drawerOpen.set(true);
  }

  openAvisDecision(a: Avis, decision: StatutModerationAvis): void {
    this.pendingSigDecision.set(null);
    this.pendingAvisDecision.set({ avis: a, decision });
    this.justification = '';
    this.justifError.set(null);
    this.drawerTitle.set(`Modérer avis #${a.id}`);
    this.historique.set([]);
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.pendingSigDecision.set(null);
    this.pendingAvisDecision.set(null);
    this.justifError.set(null);
  }

  async confirmSigDecision(): Promise<void> {
    const p = this.pendingSigDecision();
    if (!p) return;
    if (this.justification.trim().length < 5) {
      this.justifError.set('Une justification d’au moins 5 caractères est obligatoire.');
      return;
    }
    this.busy.set(true);
    this.actionError.set(null);
    try {
      await firstValueFrom(
        this.avisApi.traiterSignalement(
          p.sig.id,
          p.decision,
          this.justification.trim(),
          p.decision === 'VALIDE_CONTENU_RETIRE' ? 'MASQUE' : undefined
        )
      );
      toast.success(`Signalement #${p.sig.id} traité.`);
      this.closeDrawer();
      await this.loadAll();
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async confirmAvisDecision(): Promise<void> {
    const p = this.pendingAvisDecision();
    if (!p) return;
    if (this.justification.trim().length < 5) {
      this.justifError.set('Une justification d’au moins 5 caractères est obligatoire.');
      return;
    }
    this.busy.set(true);
    this.actionError.set(null);
    try {
      await firstValueFrom(
        this.avisApi.deciderModerationAvis(p.avis.id, p.decision, this.justification.trim())
      );
      toast.success(`Avis #${p.avis.id} mis à jour (${p.decision}).`);
      this.closeDrawer();
      await this.loadAll();
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
