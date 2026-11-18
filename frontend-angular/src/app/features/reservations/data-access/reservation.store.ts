import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { extractErrorMessage } from '../../../core/models/api-error.model';
import {
  DisponibilitePrestation,
  Reservation,
  ReservationCreatePayload,
  ReservationStats,
  TypeReservation,
} from '../../../core/models/reservation.model';
import { generateIdempotencyKey } from '../../../core/utils/idempotency.util';
import { ReservationApiService } from './reservation-api.service';

@Injectable({ providedIn: 'root' })
export class ReservationStore {
  private readonly api = inject(ReservationApiService);

  private readonly _items = signal<Reservation[]>([]);
  private readonly _loading = signal(false);
  private readonly _listError = signal<string | null>(null);
  private readonly _submitting = signal(false);
  private readonly _submitError = signal<string | null>(null);
  private readonly _cancelingId = signal<number | null>(null);
  private readonly _cancelError = signal<string | null>(null);
  private readonly _disponibilite = signal<DisponibilitePrestation | null>(null);
  private readonly _disponibiliteLoading = signal(false);
  private readonly _disponibiliteError = signal<string | null>(null);
  private readonly _stats = signal<ReservationStats | null>(null);

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly listError = this._listError.asReadonly();
  readonly submitting = this._submitting.asReadonly();
  readonly submitError = this._submitError.asReadonly();
  readonly cancelingId = this._cancelingId.asReadonly();
  readonly cancelError = this._cancelError.asReadonly();
  readonly disponibilite = this._disponibilite.asReadonly();
  readonly disponibiliteLoading = this._disponibiliteLoading.asReadonly();
  readonly disponibiliteError = this._disponibiliteError.asReadonly();
  readonly stats = this._stats.asReadonly();

  async reload(): Promise<void> {
    this._loading.set(true);
    this._listError.set(null);

    try {
      const data = await firstValueFrom(this.api.getAll());
      this._items.set(Array.isArray(data) ? data : []);
    } catch (err) {
      this._listError.set(extractErrorMessage(err));
    } finally {
      this._loading.set(false);
    }
  }

  async loadDisponibilite(
    type: TypeReservation,
    prestationId: number,
    date?: string | null
  ): Promise<DisponibilitePrestation | null> {
    this._disponibiliteLoading.set(true);
    this._disponibiliteError.set(null);
    try {
      const dto = await firstValueFrom(this.api.getDisponibilite(type, prestationId, date));
      this._disponibilite.set(dto);
      return dto;
    } catch (err) {
      this._disponibilite.set(null);
      this._disponibiliteError.set(extractErrorMessage(err));
      return null;
    } finally {
      this._disponibiliteLoading.set(false);
    }
  }

  async createReservation(
    payload: ReservationCreatePayload,
    idempotencyKey = generateIdempotencyKey('res')
  ): Promise<Reservation> {
    this._submitting.set(true);
    this._submitError.set(null);

    try {
      const created = await firstValueFrom(this.api.create(payload, idempotencyKey));
      await this.reload();
      return created;
    } catch (err) {
      const message = extractErrorMessage(err);
      this._submitError.set(message);
      throw err;
    } finally {
      this._submitting.set(false);
    }
  }

  async soumettreReservation(id: number): Promise<Reservation> {
    const updated = await firstValueFrom(this.api.soumettre(id));
    await this.reload();
    return updated;
  }

  async cancelReservation(id: number, motif?: string): Promise<Reservation> {
    this._cancelingId.set(id);
    this._cancelError.set(null);

    try {
      const updated = await firstValueFrom(this.api.cancel(id, motif));
      await this.reload();
      return updated;
    } catch (err) {
      const message = extractErrorMessage(err);
      this._cancelError.set(message);
      throw err;
    } finally {
      this._cancelingId.set(null);
    }
  }

  async synchroniserPaiement(id: number): Promise<Reservation> {
    const updated = await firstValueFrom(this.api.synchroniser(id));
    await this.reload();
    return updated;
  }

  async loadStatistiques(): Promise<ReservationStats | null> {
    try {
      const stats = await firstValueFrom(this.api.getStatistiques());
      this._stats.set(stats);
      return stats;
    } catch {
      return null;
    }
  }

  clearSubmitError(): void {
    this._submitError.set(null);
  }

  clearCancelError(): void {
    this._cancelError.set(null);
  }
}
