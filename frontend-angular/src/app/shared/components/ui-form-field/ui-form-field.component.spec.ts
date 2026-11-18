import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { UiFormFieldComponent } from './ui-form-field.component';

@Component({
  standalone: true,
  imports: [UiFormFieldComponent],
  template: `
    <app-ui-form-field
      [label]="label()"
      [forId]="forId()"
      [hint]="hint()"
      [error]="error()"
      [required]="required()"
    >
      <input [id]="forId()" type="text" class="ui-input" />
    </app-ui-form-field>
  `,
})
class TestHostComponent {
  readonly label = signal('Adresse Email');
  readonly forId = signal('email-input');
  readonly hint = signal('Format : nom@domaine.com');
  readonly error = signal<string | null>(null);
  readonly required = signal(true);
}

describe('UiFormFieldComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, UiFormFieldComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('devrait instancier le champ avec label requis et texte d\'aide', () => {
    const el: HTMLElement = fixture.nativeElement;
    const label = el.querySelector('label');
    expect(label).toBeTruthy();
    expect(label?.textContent).toContain('Adresse Email');
    expect(label?.classList).toContain('ui-form-label--required');
    expect(label?.getAttribute('for')).toBe('email-input');

    const hint = el.querySelector('#email-input-hint');
    expect(hint).toBeTruthy();
    expect(hint?.textContent).toContain('Format : nom@domaine.com');
  });

  it('devrait afficher l\'erreur accessible role=alert lorsqu\'une erreur est fournie', () => {
    host.error.set('L\'adresse email est invalide.');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const errorEl = el.querySelector('.ui-form-error');
    expect(errorEl).toBeTruthy();
    expect(errorEl?.getAttribute('role')).toBe('alert');
    expect(errorEl?.textContent).toContain('L\'adresse email est invalide.');
    expect(el.querySelector('#email-input-hint')).toBeFalsy();
  });
});
