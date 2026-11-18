import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiButtonComponent } from './ui-button.component';

describe('UiButtonComponent', () => {
  let component: UiButtonComponent;
  let fixture: ComponentFixture<UiButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UiButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('devrait instancier le composant avec les styles par défaut', () => {
    expect(component).toBeTruthy();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn.classList).toContain('ui-btn');
    expect(btn.classList).toContain('ui-btn--primary');
    expect(btn.classList).toContain('ui-btn--md');
  });

  it('devrait appliquer les variantes et tailles demandées', () => {
    fixture.componentRef.setInput('variant', 'danger');
    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button');
    expect(btn.classList).toContain('ui-btn--danger');
    expect(btn.classList).toContain('ui-btn--lg');
  });

  it('devrait désactiver le bouton et émettre aria-busy en état loading', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button');
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelector('.ui-btn__spinner')).toBeTruthy();
  });

  it('devrait propager le clic si actif', () => {
    let clicked = false;
    component.clicked.subscribe(() => {
      clicked = true;
    });

    const btn = fixture.nativeElement.querySelector('button');
    btn.click();
    expect(clicked).toBe(true);
  });

  it('ne devrait pas émettre de clic si désactivé', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    let clicked = false;
    component.clicked.subscribe(() => {
      clicked = true;
    });

    const btn = fixture.nativeElement.querySelector('button');
    btn.click();
    expect(clicked).toBe(false);
  });
});
