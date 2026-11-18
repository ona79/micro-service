import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiLoadingStateComponent } from './ui-loading-state.component';

describe('UiLoadingStateComponent', () => {
  let component: UiLoadingStateComponent;
  let fixture: ComponentFixture<UiLoadingStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiLoadingStateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UiLoadingStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('devrait afficher le spinner et le message par défaut avec role status', () => {
    expect(component).toBeTruthy();
    const el: HTMLElement = fixture.nativeElement;
    const container = el.querySelector('.ui-loading');
    expect(container).toBeTruthy();
    expect(container?.getAttribute('role')).toBe('status');
    expect(container?.getAttribute('aria-live')).toBe('polite');
    expect(el.textContent).toContain('Chargement des données en cours...');
  });

  it('devrait adapter la taille du spinner', () => {
    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('.ui-loading__spinner');
    expect(spinner.classList).toContain('ui-spinner--lg');
  });

  it('devrait supporter un message personnalisé', () => {
    fixture.componentRef.setInput('message', 'Calcul des disponibilités...');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Calcul des disponibilités...');
  });
});
