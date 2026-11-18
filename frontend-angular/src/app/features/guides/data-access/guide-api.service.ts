import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  GuideHistorique,
  GuideProfil,
  GuideSelfUpdatePayload,
  StatutValidationGuide,
} from '../../../core/models/guide.model';

@Injectable({ providedIn: 'root' })
export class GuideApiService {
  private readonly http = inject(HttpClient);

  getPublicGuides(filters: { zone?: string; langue?: string; q?: string } = {}): Observable<GuideProfil[]> {
    let params = new HttpParams();
    if (filters.zone) params = params.set('zone', filters.zone);
    if (filters.langue) params = params.set('langue', filters.langue);
    if (filters.q) params = params.set('q', filters.q);
    return this.http.get<GuideProfil[]>('/guides', { params });
  }

  getById(id: number | string): Observable<GuideProfil> {
    return this.http.get<GuideProfil>(`/guides/${id}`);
  }

  getByUtilisateurId(utilisateurId: number | string): Observable<GuideProfil> {
    return this.http.get<GuideProfil>(`/guides/utilisateur/${utilisateurId}`);
  }

  getMonProfil(): Observable<GuideProfil> {
    return this.http.get<GuideProfil>('/guides/mon-profil');
  }

  upsertMonProfil(payload: GuideSelfUpdatePayload): Observable<GuideProfil> {
    return this.http.put<GuideProfil>('/guides/mon-profil', payload);
  }

  soumettreMonProfil(): Observable<GuideProfil> {
    return this.http.post<GuideProfil>('/guides/mon-profil/soumettre', {});
  }

  changerDisponibilite(disponible: boolean, visibilitePublique?: boolean): Observable<GuideProfil> {
    return this.http.patch<GuideProfil>('/guides/mon-profil/disponibilite', {
      disponible,
      ...(visibilitePublique != null ? { visibilitePublique } : {}),
    });
  }

  desactiverMonProfil(motif?: string): Observable<GuideProfil> {
    return this.http.post<GuideProfil>('/guides/mon-profil/desactiver', motif ? { motif } : {});
  }

  getAllAdmin(statut?: StatutValidationGuide | ''): Observable<GuideProfil[]> {
    let params = new HttpParams();
    if (statut) params = params.set('statut', statut);
    return this.http.get<GuideProfil[]>('/guides/admin/tous', { params });
  }

  getHistorique(guideId: number | string): Observable<GuideHistorique[]> {
    return this.http.get<GuideHistorique[]>(`/guides/${guideId}/historique`);
  }

  validerProfil(guideId: number | string, motif?: string): Observable<GuideProfil> {
    return this.http.post<GuideProfil>(`/guides/${guideId}/valider`, motif ? { motif } : {});
  }

  rejeterProfil(guideId: number | string, motif: string): Observable<GuideProfil> {
    return this.http.post<GuideProfil>(`/guides/${guideId}/rejeter`, { motif });
  }

  suspendreProfil(guideId: number | string, motif: string): Observable<GuideProfil> {
    return this.http.post<GuideProfil>(`/guides/${guideId}/suspendre`, { motif });
  }

  reactiverProfil(guideId: number | string, motif?: string): Observable<GuideProfil> {
    return this.http.post<GuideProfil>(`/guides/${guideId}/reactiver`, motif ? { motif } : {});
  }

  desactiverProfilParAdmin(guideId: number | string, motif?: string): Observable<GuideProfil> {
    return this.http.post<GuideProfil>(`/guides/${guideId}/desactiver`, motif ? { motif } : {});
  }
}
