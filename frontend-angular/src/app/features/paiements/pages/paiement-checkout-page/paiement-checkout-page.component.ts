import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  LucideAlertCircle,
  LucideArrowRight,
  LucideCalendar,
  LucideCheck,
  LucideRefreshCw,
  LucideShieldCheck,
  LucideTicket,
  LucideUsers,
} from '@lucide/angular';
import { toast } from 'ngx-sonner';
import { firstValueFrom } from 'rxjs';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import {
  DecisionSimulation,
  ModePaiement,
  Paiement,
  formatModePaiementLabel,
  formatPaiementStatusLabel,
  paiementStatusBadgeClass,
} from '../../../../core/models/paiement.model';
import {
  Reservation,
  formatReservationStatusLabel,
  reservationStatusBadgeClass,
} from '../../../../core/models/reservation.model';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { UiSkeletonGridComponent } from '../../../../shared/components/ui-skeleton-grid/ui-skeleton-grid.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import { ReservationApiService } from '../../../reservations/data-access/reservation-api.service';
import { PaiementStore } from '../../data-access/paiement.store';

@Component({
  selector: 'app-paiement-checkout-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    LucideAlertCircle,
    LucideArrowRight,
    LucideCalendar,
    LucideCheck,
    LucideRefreshCw,
    LucideShieldCheck,
    LucideTicket,
    LucideUsers,
    UiSkeletonGridComponent,
    UiErrorBannerComponent,
    DateFrPipe,
    FcfaPricePipe,
  ],
  templateUrl: './paiement-checkout-page.component.html',
  styleUrl: './paiement-checkout-page.component.css',
})
export class PaiementCheckoutPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reservationApi = inject(ReservationApiService);
  protected readonly paiementStore = inject(PaiementStore);

  protected readonly reservation = signal<Reservation | null>(null);
  protected readonly tentatives = signal<Paiement[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly syncing = signal(false);

  protected readonly selectedMode = signal<ModePaiement>('WAVE');
  protected readonly telephoneSimule = signal('+221 77 123 45 67');
  protected readonly simulationMotif = signal('');

  protected readonly activePaiement = computed<Paiement | null>(() => {
    const storeActive = this.paiementStore.activePaiement();
    const res = this.reservation();
    if (storeActive && res && storeActive.reservationId === res.id) {
      return storeActive;
    }
    const list = this.tentatives();
    if (list.length === 0) return null;
    return (
      list.find((p) => p.statut === 'EN_COURS' || p.statut === 'INITIE') ??
      list.find((p) => p.statut === 'ACCEPTE' || p.statut === 'REMBOURSE') ??
      list[0]
    );
  });

  protected readonly canInitiate = computed(() => {
    const res = this.reservation();
    if (!res || res.statut !== 'EN_ATTENTE_PAIEMENT') return false;
    const current = this.activePaiement();
    if (!current) return true;
    return ['REFUSE', 'EXPIRE', 'ANNULE'].includes(current.statut);
  });

  protected readonly canSimulate = computed(() => {
    const p = this.activePaiement();
    return Boolean(p && (p.statut === 'EN_COURS' || p.statut === 'INITIE'));
  });

  protected readonly needsManualSync = computed(() => {
    const p = this.activePaiement();
    const res = this.reservation();
    return Boolean(
      p &&
        res &&
        p.statut === 'ACCEPTE' &&
        (p.synchroReservationStatut !== 'SYNCHRONISEE' || res.statut === 'EN_ATTENTE_PAIEMENT')
    );
  });

  protected readonly formatReservationStatusLabel = formatReservationStatusLabel;
  protected readonly reservationStatusBadgeClass = reservationStatusBadgeClass;
  protected readonly formatPaiementStatusLabel = formatPaiementStatusLabel;
  protected readonly paiementStatusBadgeClass = paiementStatusBadgeClass;
  protected readonly formatModePaiementLabel = formatModePaiementLabel;

  ngOnInit(): void {
    const rawId =
      this.route.snapshot.paramMap.get('reservationId') ??
      this.route.snapshot.queryParamMap.get('reservationId');
    const reservationId = Number(rawId);
    if (!Number.isFinite(reservationId) || reservationId <= 0) {
      this.loading.set(false);
      this.loadError.set('Aucune réservation valide sélectionnée pour le règlement simulé.');
      return;
    }
    void this.loadAll(reservationId);
  }

  protected async loadAll(reservationId?: number): Promise<void> {
    const targetId = reservationId ?? this.reservation()?.id;
    if (!targetId) return;

    this.loading.set(true);
    this.loadError.set(null);
    this.paiementStore.clearError();

    try {
      const [res, list] = await Promise.all([
        firstValueFrom(this.reservationApi.getById(targetId)),
        this.paiementStore.loadByReservation(targetId),
      ]);
      this.reservation.set(res);
      this.tentatives.set(list);
      if (res.telephoneClient && !this.telephoneSimule()) {
        this.telephoneSimule.set(res.telephoneClient);
      }
    } catch (err) {
      this.loadError.set(extractErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected async submitDraftReservation(): Promise<void> {
    const res = this.reservation();
    if (!res || res.statut !== 'BROUILLON') return;
    this.syncing.set(true);
    try {
      const updated = await firstValueFrom(this.reservationApi.soumettre(res.id));
      this.reservation.set(updated);
      toast.success('Réservation soumise et verrouillée pour paiement.');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      this.syncing.set(false);
    }
  }

  protected async lancerInitiation(): Promise<void> {
    const res = this.reservation();
    if (!res) return;

    try {
      const initiated = await this.paiementStore.initierPaiement({
        reservationId: res.id,
        modePaiement: this.selectedMode(),
        numeroTelephoneSimule: this.telephoneSimule().trim() || null,
      });
      await this.refreshReservationAndAttempts(res.id, initiated);
      toast.info(
        `Session ${this.selectedMode() === 'WAVE' ? 'Wave' : 'Orange Money'} simulée prête (${initiated.referenceTransaction}).`
      );
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  }

  protected async executerSimulation(decision: DecisionSimulation): Promise<void> {
    const res = this.reservation();
    const p = this.activePaiement();
    if (!res || !p) return;

    try {
      const updated = await this.paiementStore.simulerDecision(p.id, {
        decision,
        motif: this.simulationMotif().trim() || null,
      });
      this.simulationMotif.set('');
      await this.refreshReservationAndAttempts(res.id, updated);

      if (updated.statut === 'ACCEPTE') {
        toast.success(`Paiement simulé accepté (${updated.referenceTransaction}).`);
      } else if (updated.statut === 'REFUSE') {
        toast.error('Paiement simulé refusé par le portefeuille de test.');
      } else if (updated.statut === 'EXPIRE') {
        toast.warning('Session de paiement simulée marquée expirée.');
      } else {
        toast.info('Tentative de paiement simulée annulée.');
      }
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  }

  protected async relancerSynchronisation(): Promise<void> {
    const res = this.reservation();
    if (!res) return;
    this.syncing.set(true);
    try {
      const synced = await firstValueFrom(this.reservationApi.synchroniser(res.id));
      this.reservation.set(synced);
      const list = await this.paiementStore.loadByReservation(res.id);
      this.tentatives.set(list);
      toast.success('Statut synchronisé avec ms-paiement.');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      this.syncing.set(false);
    }
  }

  private async refreshReservationAndAttempts(reservationId: number, updated: Paiement): Promise<void> {
    const [res, list] = await Promise.all([
      firstValueFrom(this.reservationApi.getById(reservationId)),
      this.paiementStore.loadByReservation(reservationId),
    ]);
    this.reservation.set(res);
    this.tentatives.set(
      list.some((item) => item.id === updated.id) ? list : [updated, ...list]
    );
  }
}
