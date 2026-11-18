import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NotificationApiService } from './notification-api.service';

@Injectable({ providedIn: 'root' })
export class NotificationStore {
  private readonly api = inject(NotificationApiService);

  private readonly _unreadCount = signal(0);
  readonly unreadCount = this._unreadCount.asReadonly();

  async refreshUnreadCount(): Promise<void> {
    try {
      const res = await firstValueFrom(this.api.getMonCompteurNonLues());
      this._unreadCount.set(res?.unreadCount ?? 0);
    } catch {
      // Garde l'UI silencieuse si l'utilisateur n'est pas connecté ou en mode isolé
    }
  }

  setUnreadCount(count: number): void {
    this._unreadCount.set(Math.max(0, count));
  }

  decrementUnread(): void {
    this._unreadCount.update((c) => Math.max(0, c - 1));
  }

  clear(): void {
    this._unreadCount.set(0);
  }
}
