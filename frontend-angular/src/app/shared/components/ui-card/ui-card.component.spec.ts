import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { UiCardComponent } from './ui-card.component';

@Component({
  standalone: true,
  imports: [UiCardComponent],
  template: `
    <app-ui-card [variant]="variant()" [interactive]="interactive()" (cardClick)="onCardClick()">
      <div card-header><h3>En-tête de carte</h3></div>
      <p card-body>Contenu principal du patrimoine</p>
      <div card-footer><button>Action</button></div>
    </app-ui-card>
  `,
})
class TestHostComponent {
  readonly variant = signal<'elevated' | 'bordered' | 'flat' | 'interactive'>('elevated');
  readonly interactive = signal(false);
  clicked = false;

  onCardClick(): void {
    this.clicked = true;
  }
}

describe('UiCardComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, UiCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('devrait instancier la carte avec les slots projetés', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('En-tête de carte');
    expect(el.textContent).toContain('Contenu principal du patrimoine');
    expect(el.textContent).toContain('Action');
    expect(el.querySelector('.ui-card--elevated')).toBeTruthy();
  });

  it('devrait supporter le mode interactif avec role button et tabindex 0', () => {
    host.interactive.set(true);
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('article');
    expect(card.getAttribute('role')).toBe('button');
    expect(card.getAttribute('tabindex')).toBe('0');
    expect(card.classList).toContain('ui-card--interactive');

    card.click();
    expect(host.clicked).toBe(true);
  });
});
