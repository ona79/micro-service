import { Dialog } from '@angular/cdk/dialog';
import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  LucideCheck,
  LucideRefreshCw,
  LucideSearch,
  LucideTicket,
} from '@lucide/angular';
import { toast } from 'ngx-sonner';
import { firstValueFrom, map } from 'rxjs';
import { Reservation, StatutReservation, TypeReservation } from '../../../../core/models/reservation.model';
import { UiConfirmDialogComponent } from '../../../../shared/components/ui-confirm-dialog/ui-confirm-dialog.component';
import { UiEmptyStateComponent } from '../../../../shared/components/ui-empty-state/ui-empty-state.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { UiSkeletonGridComponent } from '../../../../shared/components/ui-skeleton-grid/ui-skeleton-grid.component';
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
    LucideCheck,
    LucideRefreshCw,
    LucideSearch,
    LucideTicket,
    UiSkeletonGridComponent,
    UiErrorBannerComponent,
    UiEmptyStateComponent,
    DateFrPipe,
    FcfaPricePipe,
  ],
  templateUrl: './reserver-page.component.html',
  styleUrl: './reserver-page.component.css',
})
export class ReserverPageComponent implements OnInit {
  protected readonly reservationStore = inject(ReservationStore);
  protected readonly circuitStore = inject(CircuitStore);
  protected readonly evenementStore = inject(EvenementStore);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(Dialog);

  protected readonly submittedAttempt = signal(false);
  protected readonly lastCreated = signal<Reservation | null>(null);
  protected readonly statusFilter = signal<StatusFilter>('ALL');
  protected readonly ledgerSearch = signal('');

  protected readonly form = this.fb.group({
    typeReservation: this.fb.control<TypeReservation>('CIRCUIT', [Validators.required]),
    circuitId: this.fb.control<string>(''),
    evenementId: this.fb.control<string>(''),
    nomClient: this.fb.control<string>('', [Validators.required, Validators.minLength(2)]),
    emailClient: this.fb.control<string>('', [Validators.required, Validators.email]),
    telephoneClient: this.fb.control<string>(''),
    nombrePlaces: this.fb.control<number>(1, [
      Validators.required,
      Validators.min(1),
      Validators.pattern(/^\d+$/),
    ]),
  });

  private readonly queryParamsSignal = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => ({
        type: params.get('type') === 'EVENEMENT' ? ('EVENEMENT' as const) : params.get('type') === 'CIRCUIT' ? ('CIRCUIT' as const) : null,
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
        const haystack = `${res.nomClient} ${res.emailClient} ${res.id} ${circuitName} ${eventName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  });

  constructor() {
    // Synchronise dynamiquement le formulaire lorsque les queryParams changent
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

    // Pré-sélectionne le 1er élément disponible si aucun n'est encore sélectionné
    effect(() => {
      const circuits = this.circuitStore.items();
      if (circuits.length > 0 && !this.form.controls.circuitId.value) {
        this.form.controls.circuitId.setValue(String(circuits[0].id));
      }
    });

    effect(() => {
      const evts = this.evenementStore.items();
      if (evts.length > 0 && !this.form.controls.evenementId.value) {
        this.form.controls.evenementId.setValue(String(evts[0].id));
      }
    });
  }

  ngOnInit(): void {
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

    try {
      const created = await this.reservationStore.createReservation({
        nomClient: raw.nomClient.trim(),
        emailClient: raw.emailClient.trim(),
        telephoneClient: raw.telephoneClient.trim() || null,
        nombrePlaces: Number(raw.nombrePlaces),
        typeReservation: raw.typeReservation,
        circuitId: isCircuit ? Number(raw.circuitId) : null,
        evenementId: !isCircuit ? Number(raw.evenementId) : null,
      });

      this.lastCreated.set(created);
      this.submittedAttempt.set(false);
      this.form.patchValue({
        nomClient: '',
        emailClient: '',
        telephoneClient: '',
        nombrePlaces: 1,
      });
      this.form.controls.nomClient.markAsUntouched();
      this.form.controls.emailClient.markAsUntouched();
      this.form.controls.telephoneClient.markAsUntouched();

      toast.success(`Réservation #${created.id} confirmée pour ${created.nomClient}`);
    } catch {
      toast.error('La réservation n’a pas pu être enregistrée.');
    }
  }

  protected async requestCancellation(res: Reservation): Promise<void> {
    const targetTitle =
      res.typeReservation === 'CIRCUIT'
        ? this.resolveCircuitName(res)
        : this.resolveEvenementName(res);

    const dialogRef = this.dialog.open<boolean>(UiConfirmDialogComponent, {
      data: {
        title: `Annuler la réservation #${res.id} ?`,
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
      toast.success(`Réservation #${res.id} annulée.`);
    } catch {
      toast.error(`Impossible d'annuler la réservation #${res.id}.`);
    }
  }

  protected resolveCircuitName(res: Reservation): string {
    if (res.circuit) return res.circuit.nomCircuit;
    if (!res.circuitId) return 'Circuit';
    return (
      this.circuitStore.items().find((c) => c.id === res.circuitId)?.nomCircuit ??
      `Circuit #${res.circuitId}`
    );
  }

  protected resolveEvenementName(res: Reservation): string {
    if (res.evenement) return res.evenement.nomEvenement;
    if (!res.evenementId) return 'Événement';
    return (
      this.evenementStore.items().find((e) => e.id === res.evenementId)?.nomEvenement ??
      `Événement #${res.evenementId}`
    );
  }
}
