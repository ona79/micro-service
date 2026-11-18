import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Avis,
  AvisCreatePayload,
  AvisEligibilite,
  AvisModerationHistorique,
  AvisResume,
  AvisUpdatePayload,
  CategorieSignalement,
  CibleAvis,
  SignalementAvis,
  StatutModerationAvis,
  StatutSignalement,
} from '../../../core/models/avis.model';
import { PageResponse } from '../../../core/models/patrimoine.model';
import { ModerationStats } from '../../../core/models/statistics.model';

@Injectable({ providedIn: 'root' })
export class AvisApiService {
  private readonly http = inject(HttpClient);

  getPublicAvis(cibleType: CibleAvis, cibleId: number, page = 0, size = 8): Observable<PageResponse<Avis>> {
    const params = new HttpParams()
      .set('cibleType', cibleType)
      .set('cibleId', String(cibleId))
      .set('page', String(page))
      .set('size', String(size));
    return this.http.get<PageResponse<Avis>>('/avis', { params });
  }

  getResume(cibleType: CibleAvis, cibleId: number): Observable<AvisResume> {
    const params = new HttpParams().set('cibleType', cibleType).set('cibleId', String(cibleId));
    return this.http.get<AvisResume>('/avis/resume', { params });
  }

  getResumesBatch(cibleType: CibleAvis, cibleIds: number[]): Observable<AvisResume[]> {
    const params = new HttpParams()
      .set('cibleType', cibleType)
      .set('cibleIds', cibleIds.join(','));
    return this.http.get<AvisResume[]>('/avis/resumes', { params });
  }

  verifierEligibilite(cibleType: CibleAvis, cibleId: number): Observable<AvisEligibilite> {
    const params = new HttpParams().set('cibleType', cibleType).set('cibleId', String(cibleId));
    return this.http.get<AvisEligibilite>('/avis/eligibilite', { params });
  }

  getMesAvis(): Observable<Avis[]> {
    return this.http.get<Avis[]>('/avis/mes-avis');
  }

  creerAvis(payload: AvisCreatePayload): Observable<Avis> {
    return this.http.post<Avis>('/avis', payload);
  }

  modifierAvis(id: number, payload: AvisUpdatePayload): Observable<Avis> {
    return this.http.put<Avis>(`/avis/${id}`, payload);
  }

  repondreAvis(id: number, reponse: string): Observable<Avis> {
    return this.http.post<Avis>(`/avis/${id}/reponse`, { reponse });
  }

  supprimerAvis(id: number): Observable<void> {
    return this.http.delete<void>(`/avis/${id}`);
  }

  signalerAvis(id: number, categorie: CategorieSignalement, motif: string): Observable<SignalementAvis> {
    return this.http.post<SignalementAvis>(`/avis/${id}/signaler`, { categorie, motif });
  }

  getAvisModeration(cibleType?: CibleAvis | '', statut?: StatutModerationAvis | ''): Observable<Avis[]> {
    let params = new HttpParams();
    if (cibleType) params = params.set('cibleType', cibleType);
    if (statut) params = params.set('statut', statut);
    return this.http.get<Avis[]>('/moderation/avis', { params });
  }

  getSignalementsModeration(statut?: StatutSignalement | ''): Observable<SignalementAvis[]> {
    let params = new HttpParams();
    if (statut) params = params.set('statut', statut);
    return this.http.get<SignalementAvis[]>('/moderation/signalements', { params });
  }

  getHistoriqueModeration(avisId: number): Observable<AvisModerationHistorique[]> {
    return this.http.get<AvisModerationHistorique[]>(`/moderation/avis/${avisId}/historique`);
  }

  deciderModerationAvis(
    avisId: number,
    decision: StatutModerationAvis,
    justification: string
  ): Observable<Avis> {
    return this.http.post<Avis>(`/moderation/avis/${avisId}/decision`, { decision, justification });
  }

  traiterSignalement(
    signalementId: number,
    decisionSignalement: StatutSignalement,
    commentaire: string,
    statutAvisCible?: StatutModerationAvis
  ): Observable<SignalementAvis> {
    return this.http.post<SignalementAvis>(`/moderation/signalements/${signalementId}/decision`, {
      decisionSignalement,
      commentaire,
      ...(statutAvisCible ? { statutAvisCible } : {}),
    });
  }

  getModerationStatistiques(): Observable<ModerationStats> {
    return this.http.get<ModerationStats>('/moderation/statistiques');
  }
}
