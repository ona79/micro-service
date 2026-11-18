import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiBadgeComponent } from './ui-badge.component';

describe('UiBadgeComponent', () => {
  let component: UiBadgeComponent;
  let fixture: ComponentFixture<UiBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UiBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('devrait afficher le statut par défaut avec label déduit', () => {
    expect(component).toBeTruthy();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Neutre');
    expect(el.querySelector('.ui-badge--neutral')).toBeTruthy();
  });

  it('devrait déduire automatiquement les libellés métiers français', () => {
    fixture.componentRef.setInput('status', 'valide');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Validé');

    fixture.componentRef.setInput('status', 'en_attente');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('En attente');
    expect(fixture.nativeElement.querySelector('.ui-badge--en-attente')).toBeTruthy();
  });

  it('devrait permettre de surcharger le libellé avec une chaîne personnalisée', () => {
    fixture.componentRef.setInput('status', 'publie');
    fixture.componentRef.setInput('label', 'Site Actif');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Site Actif');
  });

  it('devrait masquer la puce visuelle si showDot est faux', () => {
    fixture.componentRef.setInput('showDot', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.ui-badge__dot')).toBeFalsy();
  });
});
