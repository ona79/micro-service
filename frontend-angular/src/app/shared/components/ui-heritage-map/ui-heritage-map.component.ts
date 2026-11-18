import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as L from 'leaflet';
import { hasValidCoordinates } from '../../utils/patrimoine.utils';

export interface HeritageMapPoint {
  id: number;
  label: string;
  subtitle?: string;
  latitude: number;
  longitude: number;
  stepOrder?: number;
  memorial?: boolean;
}

@Component({
  selector: 'app-ui-heritage-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="map-shell"
      [class.map-shell--fullscreen]="isFullscreen()"
      [style.height.px]="isFullscreen() ? null : height()"
    >
      <div
        #mapCanvas
        class="map-canvas"
        role="region"
        [attr.aria-label]="ariaLabel()"
      ></div>
      @if (allowFullscreen()) {
        <button
          type="button"
          class="map-fullscreen-btn"
          [attr.aria-label]="isFullscreen() ? 'Quitter le mode plein écran' : 'Agrandir la carte en plein écran'"
          (click)="toggleFullscreen()"
        >
          {{ isFullscreen() ? '✕ Réduire' : '⛶ Plein écran' }}
        </button>
      }
    </div>
  `,
  styles: `
    .map-shell {
      position: relative;
      width: 100%;
      border-radius: var(--radius-lg);
      overflow: hidden;
      border: 1px solid var(--border-strong);
      background-color: var(--surface-sand);
      box-shadow: var(--shadow-sm);
    }

    .map-shell--fullscreen {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh !important;
      border-radius: 0;
      border: none;
      z-index: 9999;
    }

    .map-fullscreen-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 1000;
      background: var(--surface-elevated, #ffffff);
      color: var(--ink-primary, #1e293b);
      border: 1px solid var(--border-strong, #cbd5e1);
      border-radius: var(--radius-pill, 9999px);
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.1));
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .map-canvas {
      width: 100%;
      height: 100%;
    }
  `,
})
export class UiHeritageMapComponent implements AfterViewInit, OnDestroy {
  readonly points = input<readonly HeritageMapPoint[]>([]);
  readonly drawRoute = input<boolean>(false);
  readonly height = input<number>(360);
  readonly allowFullscreen = input<boolean>(true);
  readonly ariaLabel = input<string>('Carte interactive des sites patrimoniaux');
  readonly pointSelected = output<HeritageMapPoint>();

  protected readonly isFullscreen = signal<boolean>(false);

  private readonly mapCanvas = viewChild<ElementRef<HTMLDivElement>>('mapCanvas');
  private readonly platformId = inject(PLATFORM_ID);

  private map: L.Map | null = null;
  private layerGroup: L.LayerGroup | null = null;

  constructor() {
    effect(() => {
      const pts = this.points();
      const route = this.drawRoute();
      if (this.map && this.layerGroup) {
        this.renderPoints(pts, route);
      }
    });
  }

  protected toggleFullscreen(): void {
    this.isFullscreen.update((v) => !v);
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 100);
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const el = this.mapCanvas()?.nativeElement;
    if (!el) return;

    // Protection contre les environnements de test sans support Canvas/SVG complet
    try {
      this.map = L.map(el, {
        center: [14.4974, -14.4524],
        zoom: 6,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(this.map);

      this.layerGroup = L.layerGroup().addTo(this.map);
      this.renderPoints(this.points(), this.drawRoute());
    } catch {
      this.map = null;
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.layerGroup = null;
    }
  }

  private renderPoints(points: readonly HeritageMapPoint[], drawRoute: boolean): void {
    if (!this.map || !this.layerGroup) return;
    this.layerGroup.clearLayers();

    const valid = points.filter((p) => hasValidCoordinates(p.latitude, p.longitude));
    if (valid.length === 0) {
      this.map.setView([14.4974, -14.4524], 6);
      return;
    }

    const latLngs: L.LatLngExpression[] = [];

    for (const point of valid) {
      const coords: L.LatLngExpression = [Number(point.latitude), Number(point.longitude)];
      latLngs.push(coords);

      const pinClass = point.stepOrder
        ? 'heritage-pin heritage-pin--step'
        : point.memorial
          ? 'heritage-pin heritage-pin--memorial'
          : 'heritage-pin';

      const icon = L.divIcon({
        className: 'heritage-pin-wrapper',
        html: `<div class="${pinClass}">${point.stepOrder ?? ''}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const marker = L.marker(coords, { icon });

      // Construction DOM sûre sans interpolation HTML brute
      const popupContainer = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = point.stepOrder
        ? `Étape ${point.stepOrder} · ${point.label}`
        : point.label;
      popupContainer.appendChild(strong);

      if (point.subtitle) {
        const sub = document.createElement('div');
        sub.style.fontSize = '12px';
        sub.style.marginTop = '4px';
        sub.textContent = point.subtitle;
        popupContainer.appendChild(sub);
      }

      marker.bindPopup(popupContainer);
      marker.on('click', () => this.pointSelected.emit(point));
      marker.addTo(this.layerGroup);
    }

    if (drawRoute && latLngs.length >= 2) {
      L.polyline(latLngs, {
        color: '#b24c29',
        weight: 3,
        dashArray: '6 6',
        opacity: 0.9,
      }).addTo(this.layerGroup);
    }

    if (latLngs.length === 1) {
      this.map.setView(latLngs[0], 13);
    } else {
      const bounds = L.latLngBounds(latLngs);
      this.map.fitBounds(bounds, { padding: [36, 36], maxZoom: 13 });
    }
  }
}
