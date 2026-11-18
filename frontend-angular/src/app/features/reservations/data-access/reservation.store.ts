import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { extractErrorMessage } from '../../../core/models/api-error.model';
import {
  Reservation,
  ReservationCreatePayload,
} from '../../../core/models/reservation.model';
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

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly listError = this._listError.asReadonly();
  readonly submitting = this._submitting.asReadonly();
  readonly submitError = this._submitError.asReadonly();
  readonly cancelingId = this._cancelingId.asReadonly();
  readonly cancelError = this._cancelError.asReadonly();

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

  async createReservation(payload: ReservationCreatePayload): Promise<Reservation> {
    this._submitting.set(true);
    this._submitError.set(null);

    try {
      const created = await firstValueFrom(this.api.create(payload));
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

  async cancelReservation(id: number): Promise<Reservation> {
    this._cancelingId.set(id);
    this._cancelError.set(null);

    try {
      const updated = await firstValueFrom(this.api.cancel(id));
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

  clearSubmitError(): void {
    this._submitError.set(null);
  }

  clearCancelError(): void {
    this._cancelError.set(null);
  }
}
