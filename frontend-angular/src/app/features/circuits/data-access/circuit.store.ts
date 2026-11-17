import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { extractErrorMessage } from '../../../core/models/api-error.model';
import { Circuit } from '../../../core/models/circuit.model';
import { CircuitApiService } from './circuit-api.service';

@Injectable({ providedIn: 'root' })
export class CircuitStore {
  private readonly api = inject(CircuitApiService);

  private readonly _items = signal<Circuit[]>([]);
  private readonly _loaded = signal(false);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly items = this._items.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  private inFlightPromise: Promise<void> | null = null;

  async ensureLoaded(): Promise<void> {
    if (this._loaded()) return;
    return this.reload();
  }

  async reload(): Promise<void> {
    if (this.inFlightPromise) {
      return this.inFlightPromise;
    }

    this._loading.set(true);
    this._error.set(null);

    this.inFlightPromise = firstValueFrom(this.api.getAll())
      .then((data) => {
        this._items.set(Array.isArray(data) ? data : []);
        this._loaded.set(true);
      })
      .catch((err) => {
        this._error.set(extractErrorMessage(err));
      })
      .finally(() => {
        this._loading.set(false);
        this.inFlightPromise = null;
      });

    return this.inFlightPromise;
  }

  async loadById(id: number | string): Promise<Circuit> {
    return firstValueFrom(this.api.getById(id));
  }
}
