import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideEye, LucideMoreHorizontal, LucideRefreshCw } from '@lucide/angular';
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
import {
  FilterStatusPill,
  UiFilterBarComponent,
} from '../../../../shared/components/ui-filter-bar/ui-filter-bar.component';
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
    UiDetailDrawerComponent,
    UiEmptyStateComponent,
    UiErrorBannerComponent,
    UiFilterBarComponent,
    LucideMoreHorizontal,
    LucideRefreshCw,
  ],
  template: `
    <header class="bo-header">
      <h1 class="bo-header__title">Modération</h1>
      <button type="button" class="bo-btn" (click)="loadAll()" [disabled]="loading()">
        <svg lucideRefreshCw [size]="14" aria-hidden="true"></svg>
        <span>Actualiser</span>
      </button>
    </header>

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
        <app-ui-filter-bar
          [showSearch]="false"
          [statusPills]="sigStatusPills()"
          [activeStatus]="sigStatut || 'ALL'"
          (statusChange)="sigStatut = $event === 'ALL' ? '' : $any($event); loadSignalements()"
          [resultsLabel]="signalements().length + ' signalement(s)'"
        />

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
                      <strong>{{ s.id }} · {{ s.categorie }}</strong>
                      <span class="bo-cell-sub">{{ s.dateSignalement | dateFr: 'd MMM yyyy HH:mm' }} par {{ s.signaleParNom }}</span>
                    </td>
                    <td>{{ s.motif }}</td>
                    <td>
                      <span class="bo-cell-one bo-cell-title" [title]="s.avis?.commentaire || ('Avis ' + s.avisId)">
                        Avis {{ s.avisId }} ({{ s.avisStatutActuel || 'INCONNU' }})
                      </span>
                    </td>
                    <td>
                      <span class="ui-badge" [class.ui-badge--warning]="s.statut === 'OUVERT'" [class.ui-badge--danger]="s.statut === 'VALIDE_CONTENU_RETIRE'" [class.ui-badge--neutral]="s.statut === 'REJETE_ABUSIF'">
                        {{ s.statut }}
                      </span>
                    </td>
                    <td>
                      <div class="bo-actions-cell">
                        @if (s.statut === 'OUVERT') {
                          <button type="button" class="bo-btn bo-btn--sm bo-btn--primary" (click)="openSigDecision(s, 'REJETE_ABUSIF')">
                            Rejeter sig.
                          </button>
                        } @else if (s.avis) {
                          <button type="button" class="bo-btn bo-btn--sm" (click)="openAvisHistory(s.avis!)">
                            Historique
                          </button>
                        }
                        @if (s.avis || s.statut === 'OUVERT') {
                          <div class="bo-row-menu">
                            <button
                              type="button"
                              class="bo-btn bo-btn--sm bo-btn--icon"
                              aria-label="Plus d'actions"
                              (click)="toggleSigMenu(s.id)"
                            >
                              <svg lucideMoreHorizontal [size]="15" aria-hidden="true"></svg>
                            </button>
                            @if (openSigMenuId() === s.id) {
                              <div class="bo-row-menu__dropdown" role="menu">
                                @if (s.avis) {
                                  <button type="button" class="bo-row-menu__item" role="menuitem" (click)="openSigMenuId.set(null); openAvisHistory(s.avis!)">
                                    Historique
                                  </button>
                                }
                                @if (s.statut === 'OUVERT') {
                                  <button type="button" class="bo-row-menu__item bo-row-menu__item--danger" role="menuitem" (click)="openSigMenuId.set(null); openSigDecision(s, 'VALIDE_CONTENU_RETIRE')">
                                    Retirer / Masquer avis
                                  </button>
                                }
                              </div>
                            }
                          </div>
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
        <app-ui-filter-bar
          [showSearch]="false"
          [statusPills]="avisStatusPills()"
          [activeStatus]="avisStatutFilter || 'ALL'"
          (statusChange)="avisStatutFilter = $event === 'ALL' ? '' : $any($event); loadAvis()"
          [resultsLabel]="avis().length + ' avis'"
          [hasActiveFilters]="!!(cibleFilter || avisStatutFilter)"
          (reset)="cibleFilter = ''; avisStatutFilter = ''; loadAvis()"
        >
          <ng-container filter-primary>
            <select id="mod-cible" aria-label="Cible" class="ui-filter-control" [(ngModel)]="cibleFilter" (ngModelChange)="loadAvis()">
              <option value="">Cible : Toutes</option>
              <option value="PATRIMOINE">PATRIMOINE</option>
              <option value="CIRCUIT">CIRCUIT</option>
              <option value="EVENEMENT">EVENEMENT</option>
              <option value="GUIDE">GUIDE</option>
            </select>
          </ng-container>
        </app-ui-filter-bar>

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
                      <span class="bo-cell-one bo-cell-title" [title]="a.auteurNom + ' · ' + a.note + '/5'">{{ a.auteurNom }} ({{ a.note }}/5)</span>
                    </td>
                    <td>
                      <span class="bo-cell-one" [title]="a.commentaire">{{ a.cibleType }} {{ a.cibleId }} · {{ a.commentaire }}</span>
                    </td>
                    <td>
                      <span [class]="modBadge(a.statutModeration)">{{ modLabel(a.statutModeration) }}</span>
                    </td>
                    <td>
                      <div class="bo-actions-cell">
                        @if (a.statutModeration === 'MASQUE' || a.statutModeration === 'EN_ATTENTE') {
                          <button type="button" class="bo-btn bo-btn--sm bo-btn--primary" (click)="openAvisDecision(a, 'APPROUVE')">Approuver</button>
                        } @else {
                          <button type="button" class="bo-btn bo-btn--sm" (click)="openAvisHistory(a)">Audit</button>
                        }
                        <div class="bo-row-menu">
                          <button
                            type="button"
                            class="bo-btn bo-btn--sm bo-btn--icon"
                            aria-label="Plus d'actions"
                            (click)="toggleAvisMenu(a.id)"
                          >
                            <svg lucideMoreHorizontal [size]="15" aria-hidden="true"></svg>
                          </button>
                          @if (openAvisMenuId() === a.id) {
                            <div class="bo-row-menu__dropdown" role="menu">
                              <button type="button" class="bo-row-menu__item" role="menuitem" (click)="openAvisMenuId.set(null); openAvisHistory(a)">
                                Audit
                              </button>
                              @if (a.statutModeration !== 'MASQUE' && a.statutModeration !== 'REJETE') {
                                <button type="button" class="bo-row-menu__item" role="menuitem" (click)="openAvisMenuId.set(null); openAvisDecision(a, 'MASQUE')">
                                  Masquer
                                </button>
                              }
                              @if (a.statutModeration !== 'REJETE') {
                                <button type="button" class="bo-row-menu__item bo-row-menu__item--danger" role="menuitem" (click)="openAvisMenuId.set(null); openAvisDecision(a, 'REJETE')">
                                  Rejeter
                                </button>
                              }
                            </div>
                          }
                        </div>
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
          <p class="bo-cell-title">Traiter signalement {{ ps.sig.id }} → {{ ps.decision }}</p>
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
          <p class="bo-cell-title">Modérer avis {{ pa.avis.id }} → {{ pa.decision }}</p>
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
  protected readonly openSigMenuId = signal<number | null>(null);
  protected readonly openAvisMenuId = signal<number | null>(null);

  protected toggleSigMenu(id: number): void {
    this.openSigMenuId.update((curr) => (curr === id ? null : id));
  }

  protected toggleAvisMenu(id: number): void {
    this.openAvisMenuId.update((curr) => (curr === id ? null : id));
  }

  protected readonly sigStatusPills = computed<FilterStatusPill[]>(() => {
    const s = this.stats();
    return [
      { id: 'OUVERT', label: 'Ouverts', count: s?.signalementsOuverts, tone: 'danger' },
      { id: 'VALIDE_CONTENU_RETIRE', label: 'Retirés' },
      { id: 'REJETE_ABUSIF', label: 'Rejetés' },
      { id: 'ALL', label: 'Tous' },
    ];
  });

  protected readonly avisStatusPills = computed<FilterStatusPill[]>(() => {
    const s = this.stats();
    return [
      { id: 'ALL', label: 'Tous', count: s?.totalAvis },
      { id: 'APPROUVE', label: 'Approuvés', count: s?.approuves },
      { id: 'EN_ATTENTE', label: 'En attente', count: s?.enAttente },
      { id: 'MASQUE', label: 'Masqués', count: s?.masques },
      { id: 'REJETE', label: 'Rejetés', count: s?.rejetes },
    ];
  });
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
    this.drawerTitle.set(`Historique avis ${a.id}`);
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
    this.drawerTitle.set(`Signalement ${sig.id}`);
    this.historique.set([]);
    this.drawerOpen.set(true);
  }

  openAvisDecision(a: Avis, decision: StatutModerationAvis): void {
    this.pendingSigDecision.set(null);
    this.pendingAvisDecision.set({ avis: a, decision });
    this.justification = '';
    this.justifError.set(null);
    this.drawerTitle.set(`Modérer avis ${a.id}`);
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
      toast.success(`Signalement ${p.sig.id} traité.`);
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
      toast.success(`Avis ${p.avis.id} mis à jour (${p.decision}).`);
      this.closeDrawer();
      await this.loadAll();
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
