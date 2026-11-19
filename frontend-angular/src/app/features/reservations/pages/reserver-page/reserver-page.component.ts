import { Dialog } from '@angular/cdk/dialog';
import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideCalendar,
  LucideCheck,
  LucideRefreshCw,
  LucideSearch,
  LucideTicket,
} from '@lucide/angular';
import { toast } from 'ngx-sonner';
import { firstValueFrom, map } from 'rxjs';
import { AuthStore } from '../../../../core/auth/auth.store';
import { environment } from '../../../../../environments/environment';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import { SeoService } from '../../../../core/services/seo.service';
import {
  Reservation,
  ReservationParticipant,
  StatutReservation,
  TypeReservation,
  formatReservationStatusLabel,
  reservationStatusBadgeClass,
} from '../../../../core/models/reservation.model';
import { UiConfirmDialogComponent } from '../../../../shared/components/ui-confirm-dialog/ui-confirm-dialog.component';
import { UiEmptyStateComponent } from '../../../../shared/components/ui-empty-state/ui-empty-state.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { UiLoadingStateComponent } from '../../../../shared/components/ui-loading-state/ui-loading-state.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import { CircuitStore } from '../../../circuits/data-access/circuit.store';
import { EvenementStore } from '../../../evenements/data-access/evenement.store';
import { ReservationStore } from '../../data-access/reservation.store';

type StatusFilter = 'ALL' | StatutReservation;

@Component({
  selector: 'app-reserver-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    Toolbar,
    ToolbarWidget,
    LucideArrowRight,
    LucideCalendar,
    LucideCheck,
    LucideTicket,
    UiErrorBannerComponent,
    FcfaPricePipe,
  ],
  templateUrl: './reserver-page.component.html',
  styleUrl: './reserver-page.component.css',
})
export class ReserverPageComponent implements OnInit {
  protected readonly authStore = inject(AuthStore);
  protected readonly reservationStore = inject(ReservationStore);
  protected readonly circuitStore = inject(CircuitStore);
  protected readonly evenementStore = inject(EvenementStore);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(Dialog);
  private readonly seo = inject(SeoService);

  protected readonly submittedAttempt = signal(false);
  protected readonly lastCreated = signal<Reservation | null>(null);
  protected readonly statusFilter = signal<StatusFilter>('ALL');
  protected readonly ledgerSearch = signal('');
  protected readonly expandedHistoryId = signal<number | null>(null);
  protected readonly extraParticipants = signal<ReservationParticipant[]>([]);
  protected readonly pageSize = 6;
  protected readonly currentPage = signal(0);

  protected readonly formatReservationStatusLabel = formatReservationStatusLabel;
  protected readonly reservationStatusBadgeClass = reservationStatusBadgeClass;

  protected readonly defaultDate = this.computeTomorrowIsoDate();

  protected readonly form = this.fb.group({
    typeReservation: this.fb.control<TypeReservation>('CIRCUIT', [Validators.required]),
    circuitId: this.fb.control<string>(''),
    evenementId: this.fb.control<string>(''),
    datePrestation: this.fb.control<string>(this.defaultDate),
    creneauPrestation: this.fb.control<string>('Matin (09h00)'),
    nomClient: this.fb.control<string>('', [Validators.required, Validators.minLength(2)]),
    emailClient: this.fb.control<string>('', [Validators.required, Validators.email]),
    telephoneClient: this.fb.control<string>(''),
    nombrePlaces: this.fb.control<number>(1, [
      Validators.required,
      Validators.min(1),
      Validators.pattern(/^\d+$/),
    ]),
    commentaire: this.fb.control<string>(''),
    soumettrePourPaiement: this.fb.control<boolean>(true),
  });

  private readonly queryParamsSignal = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => ({
        type:
          params.get('type') === 'EVENEMENT'
            ? ('EVENEMENT' as const)
            : params.get('type') === 'CIRCUIT'
              ? ('CIRCUIT' as const)
              : null,
        circuitId: params.get('circuitId') ?? '',
        evenementId: params.get('evenementId') ?? '',
      }))
    ),
    { initialValue: { type: null, circuitId: '', evenementId: '' } }
  );

  private readonly formValueSignal = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly selectedType = computed<TypeReservation>(
    () => this.formValueSignal().typeReservation ?? 'CIRCUIT'
  );

  protected readonly selectedCircuit = computed(() => {
    const id = Number(this.formValueSignal().circuitId);
    if (!id) return null;
    return this.circuitStore.items().find((c) => c.id === id) ?? null;
  });

  protected readonly selectedEvenement = computed(() => {
    const id = Number(this.formValueSignal().evenementId);
    if (!id) return null;
    return this.evenementStore.items().find((ev) => ev.id === id) ?? null;
  });

  protected readonly reservableCircuits = computed(() =>
    this.circuitStore
      .items()
      .filter((c) => (c.statutCircuit ?? 'PUBLIE') === 'PUBLIE')
  );

  protected readonly reservableEvenements = computed(() =>
    this.evenementStore
      .items()
      .filter((ev) => (ev.statutEvenement ?? 'PUBLIE') === 'PUBLIE')
  );

  protected readonly estimatedTotal = computed<number | null>(() => {
    const places = Number(this.formValueSignal().nombrePlaces ?? 0);
    if (!Number.isFinite(places) || places < 1) return null;
    if (this.selectedType() === 'CIRCUIT') {
      const cir = this.selectedCircuit();
      return cir ? cir.prix * places : null;
    }
    const ev = this.selectedEvenement();
    return ev ? ev.prix * places : null;
  });

  protected readonly filteredReservations = computed(() => {
    const status = this.statusFilter();
    const q = this.ledgerSearch().trim().toLowerCase();

    return this.reservationStore.items().filter((res) => {
      if (status !== 'ALL' && res.statut !== status) return false;
      if (q) {
        const circuitName = this.resolveCircuitName(res);
        const eventName = this.resolveEvenementName(res);
        const haystack = `${res.referenceReservation ?? ''} ${res.nomClient} ${res.emailClient} ${res.id} ${circuitName} ${eventName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredReservations().length / this.pageSize))
  );

  protected readonly pagedReservations = computed(() => {
    const safePage = Math.min(this.currentPage(), this.totalPages() - 1);
    const start = safePage * this.pageSize;
    return this.filteredReservations().slice(start, start + this.pageSize);
  });

  constructor() {
    effect(() => {
      const user = this.authStore.user();
      if (user) {
        if (!this.form.controls.nomClient.value && !this.form.controls.nomClient.dirty) {
          this.form.controls.nomClient.setValue(`${user.prenom} ${user.nom}`.trim());
        }
        if (!this.form.controls.emailClient.value && !this.form.controls.emailClient.dirty) {
          this.form.controls.emailClient.setValue(user.email);
        }
        if (
          !this.form.controls.telephoneClient.value &&
          !this.form.controls.telephoneClient.dirty &&
          user.telephone
        ) {
          this.form.controls.telephoneClient.setValue(user.telephone);
        }
      }
    });

    effect(() => {
      const qp = this.queryParamsSignal();
      if (qp.type) {
        this.form.controls.typeReservation.setValue(qp.type);
      }
      if (qp.circuitId) {
        this.form.controls.circuitId.setValue(qp.circuitId);
      }
      if (qp.evenementId) {
        this.form.controls.evenementId.setValue(qp.evenementId);
      }
    });

    effect(() => {
      const circuits = this.reservableCircuits();
      if (circuits.length > 0 && !this.form.controls.circuitId.value) {
        this.form.controls.circuitId.setValue(String(circuits[0].id));
      }
    });

    effect(() => {
      const evts = this.reservableEvenements();
      if (evts.length > 0 && !this.form.controls.evenementId.value) {
        const firstOpen = evts.find((e) => e.ouvertReservation === true) ?? evts[0];
        this.form.controls.evenementId.setValue(String(firstOpen.id));
      }
    });
  }

  ngOnInit(): void {
    this.seo.update({
      title: 'Réserver une Visite',
      description:
        'Comptoir de réservation de circuits et événements culturels de Casamance avec contrôle de capacité serveur.',
      canonicalPath: '/reserver',
    });
    void this.refreshAll();
  }

  protected refreshAll(): void {
    void this.reservationStore.reload();
    void this.circuitStore.ensureLoaded();
    void this.evenementStore.ensureLoaded();
  }

  protected setTypeReservation(type: TypeReservation): void {
    this.form.controls.typeReservation.setValue(type);
    this.reservationStore.clearSubmitError();
  }

  protected setStatusFilter(filter: StatusFilter): void {
    this.statusFilter.set(filter);
    this.currentPage.set(0);
  }

  protected async verifierDisponibilite(): Promise<void> {
    const raw = this.form.getRawValue();
    const id =
      raw.typeReservation === 'CIRCUIT' ? Number(raw.circuitId) : Number(raw.evenementId);
    if (!Number.isFinite(id) || id <= 0) return;

    await this.reservationStore.loadDisponibilite(
      raw.typeReservation,
      id,
      raw.typeReservation === 'CIRCUIT' ? raw.datePrestation || undefined : undefined
    );
  }

  protected addParticipant(): void {
    const max = Math.max(1, Number(this.form.controls.nombrePlaces.value || 1));
    if (this.extraParticipants().length >= max) return;
    this.extraParticipants.update((list) => [
      ...list,
      { nomComplet: '', email: '', categorie: 'ADULTE' },
    ]);
  }

  protected removeParticipant(idx: number): void {
    this.extraParticipants.update((list) => list.filter((_, i) => i !== idx));
  }

  protected updateParticipant(idx: number, field: keyof ReservationParticipant, value: string): void {
    this.extraParticipants.update((list) =>
      list.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    );
  }

  protected hasTargetSelection(): boolean {
    const raw = this.form.getRawValue();
    return raw.typeReservation === 'CIRCUIT'
      ? Boolean(raw.circuitId)
      : Boolean(raw.evenementId);
  }

  protected isInvalid(controlName: keyof typeof this.form.controls): boolean {
    const ctrl = this.form.controls[controlName];
    return ctrl.invalid && (ctrl.touched || this.submittedAttempt());
  }

  protected readonly openMenuId = signal<number | null>(null);
  protected readonly isDemo = environment.demo;

  protected readonly selectedTargetLabel = computed(() => {
    if (this.selectedType() === 'CIRCUIT') {
      return this.selectedCircuit()?.nomCircuit ?? 'Aucun circuit sélectionné';
    }
    return this.selectedEvenement()?.nomEvenement ?? 'Aucun événement sélectionné';
  });

  protected toggleRowMenu(id: number): void {
    this.openMenuId.update((curr) => (curr === id ? null : id));
  }

  protected canPayReservation(res: Reservation): boolean {
    return res.statut === 'EN_ATTENTE_PAIEMENT' || res.statut === 'BROUILLON';
  }

  protected canCancelReservation(res: Reservation): boolean {
    return ['BROUILLON', 'EN_ATTENTE_PAIEMENT', 'CONFIRMEE'].includes(res.statut);
  }

  protected async onSubmit(): Promise<void> {
    this.submittedAttempt.set(true);
    this.lastCreated.set(null);
    this.reservationStore.clearSubmitError();

    if (this.form.invalid || !this.hasTargetSelection()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const isCircuit = raw.typeReservation === 'CIRCUIT';
    const validParticipants = this.extraParticipants()
      .filter((p) => p.nomComplet && p.nomComplet.trim().length > 0)
      .map((p) => ({
        nomComplet: p.nomComplet.trim(),
        email: p.email?.trim() || null,
        telephone: p.telephone?.trim() || null,
        categorie: p.categorie || 'ADULTE',
      }));

    try {
      const created = await this.reservationStore.createReservation({
        nomClient: raw.nomClient.trim(),
        emailClient: raw.emailClient.trim(),
        telephoneClient: raw.telephoneClient.trim() || null,
        nombrePlaces: Number(raw.nombrePlaces),
        datePrestation: isCircuit ? raw.datePrestation || this.defaultDate : null,
        creneauPrestation: isCircuit ? raw.creneauPrestation || 'Matin (09h00)' : null,
        commentaire: raw.commentaire.trim() || null,
        typeReservation: raw.typeReservation,
        circuitId: isCircuit ? Number(raw.circuitId) : null,
        evenementId: !isCircuit ? Number(raw.evenementId) : null,
        soumettrePourPaiement: raw.soumettrePourPaiement,
        participants: validParticipants,
      });

      this.lastCreated.set(created);
      this.submittedAttempt.set(false);
      this.extraParticipants.set([]);
      this.form.patchValue({
        nombrePlaces: 1,
        commentaire: '',
        soumettrePourPaiement: true,
      });

      if (created.statut === 'CONFIRMEE') {
        toast.success(
          `Réservation ${created.referenceReservation || 'n° ' + created.id} confirmée avec succès (offre gratuite).`
        );
      } else if (created.statut === 'EN_ATTENTE_PAIEMENT') {
        toast.success(
          `Réservation ${created.referenceReservation || 'n° ' + created.id} créée : passez au paiement${this.isDemo ? ' simulé' : ''}.`
        );
      } else {
        toast.success(`Réservation brouillon ${created.id} enregistrée.`);
      }
    } catch {
      toast.error('La réservation n’a pas pu être enregistrée.');
    }
  }

  protected async submitDraft(res: Reservation): Promise<void> {
    try {
      await this.reservationStore.soumettreReservation(res.id);
      toast.success(`Réservation ${res.id} soumise pour paiement.`);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  }

  protected async requestCancellation(res: Reservation): Promise<void> {
    const targetTitle =
      res.typeReservation === 'CIRCUIT'
        ? this.resolveCircuitName(res)
        : this.resolveEvenementName(res);

    const dialogRef = this.dialog.open<boolean>(UiConfirmDialogComponent, {
      data: {
        title: `Annuler la réservation ${res.referenceReservation || 'n° ' + res.id} ?`,
        message: `Vous êtes sur le point d'annuler la réservation de ${res.nomClient} (${res.nombrePlaces} place(s)) pour « ${targetTitle} ». Cette action libérera les places réservées.`,
        confirmLabel: 'Confirmer l’annulation',
        cancelLabel: 'Conserver',
        variant: 'danger',
      },
    });

    const confirmed = await firstValueFrom(dialogRef.closed);
    if (!confirmed) return;

    try {
      await this.reservationStore.cancelReservation(res.id);
      toast.success(`Réservation ${res.id} annulée.`);
    } catch {
      toast.error(`Impossible d'annuler la réservation ${res.id}.`);
    }
  }

  protected toggleHistory(reservationId: number): void {
    this.expandedHistoryId.update((curr) => (curr === reservationId ? null : reservationId));
  }

  protected resolveCircuitName(res: Reservation): string {
    if (res.circuit) return res.circuit.nomCircuit;
    if (!res.circuitId) return 'Circuit';
    return (
      this.circuitStore.items().find((c) => c.id === res.circuitId)?.nomCircuit ??
      `Circuit ${res.circuitId}`
    );
  }

  protected resolveEvenementName(res: Reservation): string {
    if (res.evenement) return res.evenement.nomEvenement;
    if (!res.evenementId) return 'Événement';
    return (
      this.evenementStore.items().find((e) => e.id === res.evenementId)?.nomEvenement ??
      `Événement ${res.evenementId}`
    );
  }

  private computeTomorrowIsoDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
}
