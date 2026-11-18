import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideRefreshCw } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../../../../core/auth/auth.store';
import { PermissionService } from '../../../../core/auth/permissions';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import { Circuit } from '../../../../core/models/circuit.model';
import { GuideProfil, formatGuideStatusLabel, guideStatusBadgeClass } from '../../../../core/models/guide.model';
import { PaiementStats } from '../../../../core/models/paiement.model';
import { ReservationStats } from '../../../../core/models/reservation.model';
import {
  CircuitStats,
  EvenementStats,
  GuideStats,
  ModerationStats,
  NotificationStats,
  PatrimoineStats,
  UtilisateurStats,
} from '../../../../core/models/statistics.model';
import { ChartDatum, UiBarChartComponent } from '../../../../shared/components/ui-bar-chart/ui-bar-chart.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { UiKpiCardComponent } from '../../../../shared/components/ui-kpi-card/ui-kpi-card.component';
import { UiSkeletonGridComponent } from '../../../../shared/components/ui-skeleton-grid/ui-skeleton-grid.component';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import { AvisApiService } from '../../../avis/data-access/avis-api.service';
import { CircuitApiService } from '../../../circuits/data-access/circuit-api.service';
import { EvenementApiService } from '../../../evenements/data-access/evenement-api.service';
import { GuideApiService } from '../../../guides/data-access/guide-api.service';
import { NotificationApiService } from '../../../notifications/data-access/notification-api.service';
import { NotificationStore } from '../../../notifications/data-access/notification.store';
import { PaiementApiService } from '../../../paiements/data-access/paiement-api.service';
import { PatrimoineApiService } from '../../../patrimoines/data-access/patrimoine-api.service';
import { ReservationApiService } from '../../../reservations/data-access/reservation-api.service';

@Component({
  selector: 'app-pro-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    LucideRefreshCw,
    UiKpiCardComponent,
    UiBarChartComponent,
    UiErrorBannerComponent,
    UiSkeletonGridComponent,
    FcfaPricePipe,
  ],
  template: `
    <header class="bo-header">
      <div>
        <p class="bo-header__eyebrow">Poste de pilotage · {{ authStore.roleLabel() }}</p>
        <h1 class="bo-header__title">
          Bonjour {{ authStore.user()?.prenom }}, voici votre synthèse opérationnelle
        </h1>
        <p class="bo-header__lead">
          Indicateurs calculés côté serveur en temps réel selon vos permissions RBAC actives.
        </p>
      </div>
      <div class="bo-header__actions">
        <button type="button" class="bo-btn" (click)="load()" [disabled]="loading()">
          <svg lucideRefreshCw [size]="15" aria-hidden="true"></svg>
          <span>Actualiser</span>
        </button>
        <a routerLink="/pro/statistiques" class="bo-btn bo-btn--primary">Analyses détaillées</a>
      </div>
    </header>

    @if (error()) {
      <app-ui-error-banner [message]="error()!" (retry)="load()" />
    } @else if (loading()) {
      <app-ui-skeleton-grid [count]="4" />
    } @else {
      @if (authStore.isGuide()) {
        @if (monProfilGuide(); as profil) {
          <section class="bo-panel">
            <div class="bo-panel__head">
              <div>
                <h2 class="bo-panel__title">Statut de votre dossier guide</h2>
                <p class="bo-cell-sub">
                  Zones : {{ profil.zonesIntervention }} · Langues : {{ profil.languesParlees }}
                </p>
              </div>
              <span [class]="guideBadge(profil.statutValidation)">
                {{ formatGuideStatus(profil.statutValidation) }}
              </span>
            </div>
            @if (profil.motifDecision) {
              <p class="bo-notice">Observation récente : {{ profil.motifDecision }}</p>
            }
            <div class="bo-actions-cell" style="margin-top: var(--space-3);">
              <a routerLink="/pro/mon-profil-guide" class="bo-btn bo-btn--primary">Gérer mon profil</a>
              <a routerLink="/pro/manifestes" class="bo-btn">Voir mes manifestes</a>
            </div>
          </section>
        } @else {
          <section class="bo-panel">
            <h2 class="bo-panel__title">Initialisez votre profil guide</h2>
            <p class="bo-header__lead">
              Votre compte dispose du rôle Guide touristique. Complétez votre profil et soumettez-le
              pour apparaître dans l’annuaire officiel de Casamance.
            </p>
            <div style="margin-top: var(--space-3);">
              <a routerLink="/pro/mon-profil-guide" class="bo-btn bo-btn--primary">Créer mon dossier guide</a>
            </div>
          </section>
        }

        <div class="bo-kpi-grid">
          <app-ui-kpi-card
            label="Mes circuits rattachés"
            [value]="circuitStats()?.total ?? mesCircuits().length"
            subtitle="Circuits assignés à votre identifiant"
            link="/pro/circuits"
          />
          <app-ui-kpi-card
            label="Circuits publiés"
            [value]="circuitStats()?.publies ?? 0"
            tone="success"
            subtitle="Visibles sur le catalogue touristique"
            link="/pro/circuits"
          />
          <app-ui-kpi-card
            label="Circuits en brouillon / soumis"
            [value]="(circuitStats()?.brouillons ?? 0) + (circuitStats()?.soumis ?? 0)"
            tone="ochre"
            subtitle="En attente de finalisation ou publication"
            link="/pro/circuits"
          />
          <app-ui-kpi-card
            label="Notifications non lues"
            [value]="notificationStore.unreadCount()"
            tone="terracotta"
            subtitle="Alertes métier & affectations"
            link="/pro/notifications"
          />
        </div>
      } @else if (authStore.isConservateur()) {
        <div class="bo-kpi-grid">
          <app-ui-kpi-card
            label="Sites patrimoniaux"
            [value]="patrimoineStats()?.total ?? 0"
            subtitle="Toutes fiches du référentiel"
            link="/pro/patrimoines"
          />
          <app-ui-kpi-card
            label="Fiches publiées"
            [value]="patrimoineStats()?.publies ?? 0"
            tone="success"
            subtitle="Accessibles aux touristes et circuits"
            link="/pro/patrimoines"
          />
          <app-ui-kpi-card
            label="Brouillons & soumis"
            [value]="(patrimoineStats()?.brouillons ?? 0) + (patrimoineStats()?.soumis ?? 0)"
            tone="ochre"
            subtitle="En cours de rédaction ou relecture"
            link="/pro/patrimoines"
          />
          <app-ui-kpi-card
            label="Capacité d'accueil publiée"
            [value]="patrimoineStats()?.capaciteTotalePubliee ?? 0"
            tone="terracotta"
            subtitle="Tarif moyen : {{ patrimoineStats()?.tarifMoyenPublie ?? 0 | fcfaPrice }}"
            link="/pro/statistiques"
          />
        </div>

        <div class="bo-charts-grid">
          <app-ui-bar-chart
            title="Répartition par catégorie patrimoniale"
            subtitle="Inventaire complet conservateur"
            [data]="patrimoineCategoryChart()"
          />
          <app-ui-bar-chart
            title="Répartition par zone de Casamance"
            subtitle="Basse, Moyenne et Haute-Casamance"
            [data]="patrimoineZoneChart()"
          />
        </div>
      } @else {
        <!-- GESTIONNAIRE_SITE ou ADMINISTRATEUR -->
        <div class="bo-kpi-grid">
          <app-ui-kpi-card
            label="Circuits publiés / total"
            [value]="(circuitStats()?.publies ?? 0) + ' / ' + (circuitStats()?.total ?? 0)"
            subtitle="Sans guide : {{ circuitStats()?.sansGuide ?? 0 }}"
            link="/pro/circuits"
          />
          <app-ui-kpi-card
            label="Événements à venir"
            [value]="evenementStats()?.aVenirPublies ?? 0"
            tone="ochre"
            subtitle="Ouverts résa : {{ evenementStats()?.ouvertsReservation ?? 0 }}"
            link="/pro/evenements"
          />
          <app-ui-kpi-card
            label="Guides en attente"
            [value]="guideStats()?.enAttenteValidation ?? 0"
            tone="terracotta"
            subtitle="Validés : {{ guideStats()?.valides ?? 0 }}"
            link="/pro/guides"
          />
          <app-ui-kpi-card
            label="Signalements ouverts"
            [value]="moderationStats()?.signalementsOuverts ?? 0"
            [tone]="(moderationStats()?.signalementsOuverts ?? 0) > 0 ? 'danger' : 'success'"
            subtitle="Avis approuvés : {{ moderationStats()?.approuves ?? 0 }}"
            link="/pro/moderation"
          />
          <app-ui-kpi-card
            label="Réservations confirmées"
            [value]="reservationStats()?.confirmees ?? 0"
            tone="success"
            subtitle="En attente paiement : {{ reservationStats()?.enAttentePaiement ?? 0 }}"
            link="/pro/reservations"
          />
          @if (permissions.has('PAIEMENT:LIRE_TOUT')) {
            <app-ui-kpi-card
              label="Revenus simulés acceptés"
              [value]="(paiementStats()?.montantTotalAccepteSimule ?? 0) | fcfaPrice"
              tone="forest"
              subtitle="Acceptées : {{ paiementStats()?.acceptees ?? 0 }} · Outbox : {{ paiementStats()?.outboxEnAttente ?? 0 }}"
              link="/pro/paiements"
            />
          }
          @if (permissions.has('NOTIFICATION:LIRE_TOUT')) {
            <app-ui-kpi-card
              label="Notifications en échec"
              [value]="(notifStats()?.echecsTemporaires ?? 0) + (notifStats()?.echecsDefinitifs ?? 0)"
              [tone]="((notifStats()?.echecsTemporaires ?? 0) + (notifStats()?.echecsDefinitifs ?? 0)) > 0 ? 'danger' : 'success'"
              subtitle="Total journalisées : {{ notifStats()?.total ?? 0 }}"
              link="/pro/notifications"
            />
          }
          @if (permissions.has('UTILISATEUR:LIRE_TOUT')) {
            <app-ui-kpi-card
              label="Alertes sécurité (24h)"
              [value]="userStats()?.alertesSecurite24h ?? 0"
              [tone]="(userStats()?.alertesSecurite24h ?? 0) > 0 ? 'danger' : 'neutral'"
              subtitle="Comptes actifs : {{ userStats()?.actifs ?? 0 }} / {{ userStats()?.total ?? 0 }}"
              link="/pro/utilisateurs"
            />
          }
        </div>

        <div class="bo-charts-grid">
          <app-ui-bar-chart
            title="État des réservations"
            subtitle="Vue agrégée depuis ms-reservation"
            [data]="reservationChart()"
          />
          @if (permissions.has('PAIEMENT:LIRE_TOUT') && paiementStats()) {
            <app-ui-bar-chart
              title="Canaux de paiement simulés (XOF)"
              subtitle="Wave Sénégal vs Orange Money"
              [data]="paiementCanalChart()"
            />
          } @else {
            <app-ui-bar-chart
              title="Validation des guides touristiques"
              subtitle="Répartition des statuts sur la plateforme"
              [data]="guideStatutChart()"
            />
          }
        </div>
      }
    }
  `,
})
export class ProDashboardPageComponent implements OnInit {
  protected readonly authStore = inject(AuthStore);
  protected readonly permissions = inject(PermissionService);
  protected readonly notificationStore = inject(NotificationStore);

  private readonly patrimoineApi = inject(PatrimoineApiService);
  private readonly circuitApi = inject(CircuitApiService);
  private readonly evenementApi = inject(EvenementApiService);
  private readonly guideApi = inject(GuideApiService);
  private readonly reservationApi = inject(ReservationApiService);
  private readonly paiementApi = inject(PaiementApiService);
  private readonly avisApi = inject(AvisApiService);
  private readonly notifApi = inject(NotificationApiService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly patrimoineStats = signal<PatrimoineStats | null>(null);
  protected readonly circuitStats = signal<CircuitStats | null>(null);
  protected readonly evenementStats = signal<EvenementStats | null>(null);
  protected readonly guideStats = signal<GuideStats | null>(null);
  protected readonly reservationStats = signal<ReservationStats | null>(null);
  protected readonly paiementStats = signal<PaiementStats | null>(null);
  protected readonly moderationStats = signal<ModerationStats | null>(null);
  protected readonly notifStats = signal<NotificationStats | null>(null);
  protected readonly userStats = signal<UtilisateurStats | null>(null);

  protected readonly monProfilGuide = signal<GuideProfil | null>(null);
  protected readonly mesCircuits = signal<Circuit[]>([]);

  protected readonly formatGuideStatus = formatGuideStatusLabel;
  protected readonly guideBadge = guideStatusBadgeClass;

  protected readonly patrimoineCategoryChart = computed<ChartDatum[]>(() => {
    const map = this.patrimoineStats()?.parCategorie ?? {};
    return Object.entries(map).map(([label, value]) => ({ label, value }));
  });

  protected readonly patrimoineZoneChart = computed<ChartDatum[]>(() => {
    const map = this.patrimoineStats()?.parZone ?? {};
    return Object.entries(map).map(([label, value]) => ({ label, value }));
  });

  protected readonly reservationChart = computed<ChartDatum[]>(() => {
    const r = this.reservationStats();
    if (!r) return [];
    return [
      { label: 'Confirmées', value: r.confirmees, tone: 'success' },
      { label: 'En attente paiement', value: r.enAttentePaiement, tone: 'ochre' },
      { label: 'Brouillons', value: r.brouillon, tone: 'neutral' },
      { label: 'Annulées', value: r.annulees, tone: 'danger' },
      { label: 'Expirées', value: r.expirees, tone: 'neutral' },
      { label: 'Remboursées', value: r.remboursees, tone: 'terracotta' },
    ];
  });

  protected readonly paiementCanalChart = computed<ChartDatum[]>(() => {
    const p = this.paiementStats();
    if (!p) return [];
    return [
      { label: 'Wave Sénégal (XOF)', value: p.montantWaveSimule, tone: 'forest' },
      { label: 'Orange Money (XOF)', value: p.montantOrangeMoneySimule, tone: 'terracotta' },
    ];
  });

  protected readonly guideStatutChart = computed<ChartDatum[]>(() => {
    const g = this.guideStats();
    if (!g) return [];
    return [
      { label: 'Validés', value: g.valides, tone: 'success' },
      { label: 'En attente', value: g.enAttenteValidation, tone: 'ochre' },
      { label: 'Brouillons', value: g.brouillons, tone: 'neutral' },
      { label: 'Rejetés / Suspendus', value: g.rejetes + g.suspendus, tone: 'danger' },
    ];
  });

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const tasks: Promise<unknown>[] = [];

      if (this.authStore.isGuide()) {
        tasks.push(
          firstValueFrom(this.guideApi.getMonProfil())
            .then((p) => this.monProfilGuide.set(p))
            .catch(() => this.monProfilGuide.set(null)),
          firstValueFrom(this.circuitApi.getStatistiques()).then((s) => this.circuitStats.set(s)),
          firstValueFrom(this.circuitApi.getMesCircuitsGuide()).then((c) => this.mesCircuits.set(c))
        );
      } else if (this.authStore.isConservateur()) {
        tasks.push(
          firstValueFrom(this.patrimoineApi.getStatistiques()).then((s) =>
            this.patrimoineStats.set(s)
          )
        );
      } else {
        tasks.push(
          firstValueFrom(this.patrimoineApi.getStatistiques()).then((s) =>
            this.patrimoineStats.set(s)
          ),
          firstValueFrom(this.circuitApi.getStatistiques()).then((s) => this.circuitStats.set(s)),
          firstValueFrom(this.evenementApi.getStatistiques()).then((s) =>
            this.evenementStats.set(s)
          ),
          firstValueFrom(this.guideApi.getStatistiques()).then((s) => this.guideStats.set(s)),
          firstValueFrom(this.reservationApi.getStatistiques()).then((s) =>
            this.reservationStats.set(s)
          ),
          firstValueFrom(this.avisApi.getModerationStatistiques()).then((s) =>
            this.moderationStats.set(s)
          )
        );
        if (this.permissions.has('PAIEMENT:LIRE_TOUT')) {
          tasks.push(
            firstValueFrom(this.paiementApi.getStatistiques()).then((s) =>
              this.paiementStats.set(s)
            )
          );
        }
        if (this.permissions.has('NOTIFICATION:LIRE_TOUT')) {
          tasks.push(
            firstValueFrom(this.notifApi.getStatistiques()).then((s) => this.notifStats.set(s))
          );
        }
        if (this.permissions.has('UTILISATEUR:LIRE_TOUT')) {
          tasks.push(this.authStore.getUserStats().then((s) => this.userStats.set(s)));
        }
      }

      await Promise.all(tasks);
    } catch (err) {
      this.error.set(extractErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}
