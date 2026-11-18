import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { extractErrorMessage } from '../../../core/models/api-error.model';
import {
  Paiement,
  PaiementInitiatePayload,
  PaiementStats,
  SimulationPaiementPayload,
} from '../../../core/models/paiement.model';
import { generateIdempotencyKey } from '../../../core/utils/idempotency.util';
import { PaiementApiService } from './paiement-api.service';

@Injectable({ providedIn: 'root' })
export class PaiementStore {
  private readonly api = inject(PaiementApiService);

  private readonly _items = signal<Paiement[]>([]);
  private readonly _activePaiement = signal<Paiement | null>(null);
  private readonly _stats = signal<PaiementStats | null>(null);
  private readonly _loading = signal(false);
  private readonly _processing = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly items = this._items.asReadonly();
  readonly activePaiement = this._activePaiement.asReadonly();
  readonly stats = this._stats.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly processing = this._processing.asReadonly();
  readonly error = this._error.asReadonly();

  async reload(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const data = await firstValueFrom(this.api.getAll());
      this._items.set(Array.isArray(data) ? data : []);
    } catch (err) {
      this._error.set(extractErrorMessage(err));
    } finally {
      this._loading.set(false);
    }
  }

  async loadByReservation(reservationId: number): Promise<Paiement[]> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const list = await firstValueFrom(this.api.getByReservation(reservationId));
      const safeList = Array.isArray(list) ? list : [];
      this._items.set(safeList);
      this._activePaiement.set(safeList[0] ?? null);
      return safeList;
    } catch (err) {
      this._error.set(extractErrorMessage(err));
      return [];
    } finally {
      this._loading.set(false);
    }
  }

  async initierPaiement(
    payload: PaiementInitiatePayload,
    idempotencyKey = generateIdempotencyKey('pay-init')
  ): Promise<Paiement> {
    this._processing.set(true);
    this._error.set(null);
    try {
      const created = await firstValueFrom(this.api.initier(payload, idempotencyKey));
      this._activePaiement.set(created);
      return created;
    } catch (err) {
      this._error.set(extractErrorMessage(err));
      throw err;
    } finally {
      this._processing.set(false);
    }
  }

  async simulerDecision(
    paiementId: number,
    payload: SimulationPaiementPayload,
    idempotencyKey = generateIdempotencyKey('pay-sim')
  ): Promise<Paiement> {
    this._processing.set(true);
    this._error.set(null);
    try {
      const updated = await firstValueFrom(this.api.simuler(paiementId, payload, idempotencyKey));
      this._activePaiement.set(updated);
      return updated;
    } catch (err) {
      this._error.set(extractErrorMessage(err));
      throw err;
    } finally {
      this._processing.set(false);
    }
  }

  async rembourserPaiement(paiementId: number, motif?: string): Promise<Paiement> {
    this._processing.set(true);
    this._error.set(null);
    try {
      const updated = await firstValueFrom(this.api.rembourser(paiementId, motif));
      await this.reload();
      return updated;
    } catch (err) {
      this._error.set(extractErrorMessage(err));
      throw err;
    } finally {
      this._processing.set(false);
    }
  }

  async loadStatistiques(): Promise<PaiementStats | null> {
    try {
      const stats = await firstValueFrom(this.api.getStatistiques());
      this._stats.set(stats);
      return stats;
    } catch {
      return null;
    }
  }

  clearError(): void {
    this._error.set(null);
  }
}
