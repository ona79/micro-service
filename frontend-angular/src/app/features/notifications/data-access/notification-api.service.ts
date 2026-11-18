import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  NotificationCompteur,
  NotificationItem,
  NotificationPageResponse,
  StatutNotification,
} from '../../../core/models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private readonly http = inject(HttpClient);

  getMesNotifications(
    page = 0,
    size = 12,
    nonLuesOnly = false,
    typeEvenement?: string
  ): Observable<NotificationPageResponse> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size))
      .set('nonLuesOnly', String(nonLuesOnly));
    if (typeEvenement) {
      params = params.set('typeEvenement', typeEvenement);
    }
    return this.http.get<NotificationPageResponse>('/notifications/mes-notifications', { params });
  }

  getMonCompteurNonLues(): Observable<NotificationCompteur> {
    return this.http.get<NotificationCompteur>('/notifications/mes-notifications/compteur');
  }

  marquerCommeLue(id: number): Observable<NotificationItem> {
    return this.http.patch<NotificationItem>(`/notifications/${id}/lire`, {});
  }

  marquerToutesCommeLues(): Observable<{ marqueesLues: number; unreadCount: number }> {
    return this.http.patch<{ marqueesLues: number; unreadCount: number }>('/notifications/tout-lire', {});
  }

  getAllAdminPaged(
    page = 0,
    size = 20,
    statut?: StatutNotification | '',
    typeEvenement?: string
  ): Observable<NotificationPageResponse> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    if (statut) params = params.set('statut', statut);
    if (typeEvenement) params = params.set('typeEvenement', typeEvenement);
    return this.http.get<NotificationPageResponse>('/notifications/toutes', { params });
  }

  relancerNotification(id: number): Observable<NotificationItem> {
    return this.http.post<NotificationItem>(`/notifications/${id}/relancer`, {});
  }

  forcerRepriseEchecs(): Observable<{ notificationsLivrees: number }> {
    return this.http.post<{ notificationsLivrees: number }>('/notifications/relancer-echecs', {});
  }
}
