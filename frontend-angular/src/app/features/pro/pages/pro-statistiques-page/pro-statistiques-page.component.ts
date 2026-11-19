import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { LucideRefreshCw } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../../../../core/auth/auth.store';
import { PermissionService } from '../../../../core/auth/permissions';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
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
import { UiPageHeaderComponent } from '../../../../shared/components/ui-page-header/ui-page-header.component';
import { UiSkeletonGridComponent } from '../../../../shared/components/ui-skeleton-grid/ui-skeleton-grid.component';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import { AvisApiService } from '../../../avis/data-access/avis-api.service';
import { CircuitApiService } from '../../../circuits/data-access/circuit-api.service';
import { EvenementApiService } from '../../../evenements/data-access/evenement-api.service';
import { GuideApiService } from '../../../guides/data-access/guide-api.service';
import { NotificationApiService } from '../../../notifications/data-access/notification-api.service';
import { PaiementApiService } from '../../../paiements/data-access/paiement-api.service';
import { PatrimoineApiService } from '../../../patrimoines/data-access/patrimoine-api.service';
import { ReservationApiService } from '../../../reservations/data-access/reservation-api.service';

@Component({
  selector: 'app-pro-statistiques-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LucideRefreshCw,
    UiKpiCardComponent,
    UiPageHeaderComponent,
    UiBarChartComponent,
    UiErrorBannerComponent,
    UiSkeletonGridComponent,
    FcfaPricePipe,
  ],
  template: `
    <app-ui-page-header
      title="Statistiques"
      subtitle="Indicateurs d'activité selon votre périmètre."
    >
      <div header-actions>
        <button type="button" class="bo-btn" (click)="load()" [disabled]="loading()">
          <svg lucideRefreshCw [size]="15" aria-hidden="true"></svg>
          <span>Actualiser</span>
        </button>
      </div>
    </app-ui-page-header>

    @if (error()) {
      <app-ui-error-banner [message]="error()!" (retry)="load()" />
    } @else if (loading()) {
      <app-ui-skeleton-grid [count]="4" />
    } @else {
      @if (patrimoineStats(); as p) {
        <section class="bo-stat-section" style="margin-bottom: var(--space-6);">
          <div class="bo-panel__head">
            <h2 class="bo-panel__title">Patrimoine de Casamance</h2>
            <span class="ui-badge ui-badge--neutral">Périmètre : {{ p.scope }}</span>
          </div>
          <div class="bo-kpi-grid">
            <app-ui-kpi-card label="Total visible" [value]="p.total" />
            <app-ui-kpi-card label="Publiés" [value]="p.publies" tone="success" />
            <app-ui-kpi-card label="Brouillons / soumis" [value]="p.brouillons + p.soumis" tone="ochre" />
            <app-ui-kpi-card label="Capacité publiée" [value]="p.capaciteTotalePubliee" tone="terracotta" />
          </div>
          <div class="bo-charts-grid">
            <app-ui-bar-chart title="Par catégorie" [data]="toChart(p.parCategorie)" />
            <app-ui-bar-chart title="Par zone géographique" [data]="toChart(p.parZone)" />
          </div>
        </section>
      }

      @if (circuitStats(); as c) {
        <section class="bo-stat-section" style="margin-bottom: var(--space-6);">
          <div class="bo-panel__head">
            <h2 class="bo-panel__title">Circuits touristiques</h2>
            <span class="ui-badge ui-badge--neutral">Périmètre : {{ c.scope }}</span>
          </div>
          <div class="bo-kpi-grid">
            <app-ui-kpi-card label="Total circuits" [value]="c.total" />
            <app-ui-kpi-card label="Publiés" [value]="c.publies" tone="success" />
            <app-ui-kpi-card label="Avec guide / sans guide" [value]="c.avecGuideAffecte + ' / ' + c.sansGuide" tone="ochre" />
            <app-ui-kpi-card label="Prix moyen publié" [value]="c.prixMoyenPublie | fcfaPrice" subtitle="Durée moy. : {{ c.dureeMoyenneMinutes }} min" tone="terracotta" />
          </div>
          <div class="bo-charts-grid">
            <app-ui-bar-chart title="Circuits par difficulté" [data]="toChart(c.parDifficulte)" />
            <app-ui-bar-chart title="Modes de transport" [data]="toChart(c.parMoyenTransport)" />
          </div>
        </section>
      }

      @if (evenementStats(); as e) {
        <section class="bo-stat-section" style="margin-bottom: var(--space-6);">
          <div class="bo-panel__head">
            <h2 class="bo-panel__title">Agenda culturel &amp; événements</h2>
          </div>
          <div class="bo-kpi-grid">
            <app-ui-kpi-card label="Total" [value]="e.total" />
            <app-ui-kpi-card label="Publiés à venir" [value]="e.aVenirPublies" tone="success" />
            <app-ui-kpi-card label="Ouverts à la réservation" [value]="e.ouvertsReservation" tone="ochre" />
            <app-ui-kpi-card label="Annulés / terminés" [value]="e.annules + ' / ' + e.termines" tone="neutral" />
          </div>
          <div class="bo-charts-grid">
            <app-ui-bar-chart title="Événements par type" [data]="toChart(e.parType)" />
            <app-ui-bar-chart title="Événements par zone" [data]="toChart(e.parZone)" />
          </div>
        </section>
      }

      @if (guideStats(); as g) {
        <section class="bo-stat-section" style="margin-bottom: var(--space-6);">
          <div class="bo-panel__head">
            <h2 class="bo-panel__title">Corps des guides touristiques</h2>
          </div>
          <div class="bo-kpi-grid">
            <app-ui-kpi-card label="Dossiers guides" [value]="g.total" />
            <app-ui-kpi-card label="Validés / disponibles" [value]="g.valides + ' / ' + g.disponiblesEtValides" tone="success" />
            <app-ui-kpi-card label="En attente validation" [value]="g.enAttenteValidation" tone="ochre" />
            <app-ui-kpi-card label="Rejetés / suspendus" [value]="g.rejetes + ' / ' + g.suspendus" tone="danger" />
          </div>
          <div class="bo-charts-grid">
            <app-ui-bar-chart title="Couverture par zone" [data]="toChart(g.parZone)" />
            <app-ui-bar-chart title="Langues parlées" [data]="toChart(g.parLangue)" />
          </div>
        </section>
      }

      @if (reservationStats(); as r) {
        <section class="bo-stat-section" style="margin-bottom: var(--space-6);">
          <div class="bo-panel__head">
            <h2 class="bo-panel__title">Réservations &amp; Modération</h2>
          </div>
          <div class="bo-kpi-grid">
            <app-ui-kpi-card label="Total réservations" [value]="r.totalReservations" />
            <app-ui-kpi-card label="Confirmées" [value]="r.confirmees" tone="success" subtitle="{{ r.placesReserveesActives }} places actives" />
            <app-ui-kpi-card label="Montant confirmé" [value]="r.montantTotalConfirme | fcfaPrice" tone="terracotta" />
            @if (moderationStats(); as m) {
              <app-ui-kpi-card label="Note moyenne avis" [value]="m.noteMoyenneApprouves + ' / 5'" subtitle="Signalements ouverts : {{ m.signalementsOuverts }}" tone="ochre" />
            }
          </div>
          <div class="bo-charts-grid">
            <app-ui-bar-chart title="Circuits vs Événements réservés" [data]="resaSplitChart()" />
            @if (moderationStats(); as m) {
              <app-ui-bar-chart title="Avis par type de cible" [data]="toChart(m.avisParCible)" />
            }
          </div>
        </section>
      }

      @if (paiementStats(); as pay) {
        <section class="bo-stat-section" style="margin-bottom: var(--space-6);">
          <div class="bo-panel__head">
            <h2 class="bo-panel__title">Transactions simulées, Notifications &amp; Utilisateurs</h2>
          </div>
          <div class="bo-kpi-grid">
            <app-ui-kpi-card label="Volume accepté (simulé)" [value]="pay.montantTotalAccepteSimule | fcfaPrice" tone="success" />
            <app-ui-kpi-card label="Volume remboursé (simulé)" [value]="pay.montantTotalRembourseSimule | fcfaPrice" tone="neutral" />
            @if (notifStats(); as n) {
              <app-ui-kpi-card label="Notifications livrées / échecs" [value]="n.envoyees + ' / ' + (n.echecsTemporaires + n.echecsDefinitifs)" tone="ochre" />
            }
            @if (userStats(); as u) {
              <app-ui-kpi-card label="Utilisateurs actifs" [value]="u.actifs + ' / ' + u.total" subtitle="Journaux d'audit : {{ u.auditLogsTotal }}" tone="forest" />
            }
          </div>
          <div class="bo-charts-grid">
            @if (notifStats(); as n) {
              <app-ui-bar-chart title="Notifications par canal" [data]="toChart(n.parCanal)" />
            }
            @if (userStats(); as u) {
              <app-ui-bar-chart title="Comptes par rôle" [data]="toChart(u.parRole)" />
            }
          </div>
        </section>
      }
    }
  `,
})
export class ProStatistiquesPageComponent implements OnInit {
  protected readonly authStore = inject(AuthStore);
  private readonly permissions = inject(PermissionService);

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
  protected readonly moderationStats = signal<ModerationStats | null>(null);
  protected readonly paiementStats = signal<PaiementStats | null>(null);
  protected readonly notifStats = signal<NotificationStats | null>(null);
  protected readonly userStats = signal<UtilisateurStats | null>(null);

  protected readonly resaSplitChart = computed<ChartDatum[]>(() => {
    const r = this.reservationStats();
    if (!r) return [];
    return [
      { label: 'Circuits', value: r.reservationsParCircuit, tone: 'forest' },
      { label: 'Événements', value: r.reservationsParEvenement, tone: 'terracotta' },
    ];
  });

  ngOnInit(): void {
    void this.load();
  }

  protected toChart(rec: Record<string, number> | null | undefined): ChartDatum[] {
    if (!rec) return [];
    return Object.entries(rec).map(([label, value]) => ({ label, value }));
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const jobs: Promise<unknown>[] = [
        firstValueFrom(this.patrimoineApi.getStatistiques()).then((s) =>
          this.patrimoineStats.set(s)
        ),
      ];
      if (this.permissions.hasAny(['CIRCUIT:CREER', 'CIRCUIT:MODIFIER', 'CIRCUIT:PUBLIER'])) {
        jobs.push(
          firstValueFrom(this.circuitApi.getStatistiques()).then((s) => this.circuitStats.set(s))
        );
      }
      if (this.permissions.hasAny(['EVENEMENT:CREER', 'EVENEMENT:PUBLIER'])) {
        jobs.push(
          firstValueFrom(this.evenementApi.getStatistiques()).then((s) =>
            this.evenementStats.set(s)
          )
        );
      }
      if (this.permissions.has('GUIDE:VALIDER')) {
        jobs.push(
          firstValueFrom(this.guideApi.getStatistiques()).then((s) => this.guideStats.set(s))
        );
      }
      if (this.permissions.has('RESERVATION:LIRE_TOUT')) {
        jobs.push(
          firstValueFrom(this.reservationApi.getStatistiques()).then((s) =>
            this.reservationStats.set(s)
          )
        );
      }
      if (this.permissions.has('AVIS:MODERER')) {
        jobs.push(
          firstValueFrom(this.avisApi.getModerationStatistiques()).then((s) =>
            this.moderationStats.set(s)
          )
        );
      }
      if (this.permissions.has('PAIEMENT:LIRE_TOUT')) {
        jobs.push(
          firstValueFrom(this.paiementApi.getStatistiques()).then((s) =>
            this.paiementStats.set(s)
          )
        );
      }
      if (this.permissions.has('NOTIFICATION:LIRE_TOUT')) {
        jobs.push(
          firstValueFrom(this.notifApi.getStatistiques()).then((s) => this.notifStats.set(s))
        );
      }
      if (this.permissions.has('UTILISATEUR:LIRE_TOUT')) {
        jobs.push(this.authStore.getUserStats().then((s) => this.userStats.set(s)));
      }
      await Promise.all(jobs);
    } catch (err) {
      this.error.set(extractErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}
