import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import QRCode from 'qrcode';
import { Billet, ValidationBilletRequest, ValidationBilletResponse } from '../../../core/models/billet.model';

@Injectable({ providedIn: 'root' })
export class BilletApiService {
  private readonly http = inject(HttpClient);

  getBillets(reservationId: number | string): Observable<Billet[]> {
    return this.http.get<Billet[]>(`/reservations/${reservationId}/billets`);
  }

  validerBillet(tokenQr: string): Observable<ValidationBilletResponse> {
    const payload: ValidationBilletRequest = { tokenQr: tokenQr.trim() };
    return this.http.post<ValidationBilletResponse>('/visites/valider', payload);
  }

  verifierBillet(tokenQr: string): Observable<Billet> {
    const params = new HttpParams().set('tokenQr', tokenQr.trim());
    return this.http.get<Billet>('/visites/verifier', { params });
  }

  async generateQrCodeSvg(tokenQr: string): Promise<string> {
    try {
      return await QRCode.toString(tokenQr, {
        type: 'svg',
        margin: 1,
        color: {
          dark: '#064e3b', // Vert émeraude sombre profond
          light: '#ffffff',
        },
      });
    } catch (err) {
      console.error('Erreur génération QR Code SVG', err);
      return '';
    }
  }

  async generateQrCodeDataUrl(tokenQr: string): Promise<string> {
    try {
      return await QRCode.toDataURL(tokenQr, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 256,
        color: {
          dark: '#064e3b',
          light: '#ffffff',
        },
      });
    } catch (err) {
      console.error('Erreur génération QR Code DataURL', err);
      return '';
    }
  }
}
