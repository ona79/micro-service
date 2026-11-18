import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MainLayoutComponent } from './main-layout.component';

describe('MainLayoutComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('toggles mobile drawer and closes on Escape key', () => {
    const fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.detectChanges();

    const burger: HTMLButtonElement = fixture.nativeElement.querySelector('.burger-btn');
    expect(burger.getAttribute('aria-expanded')).toBe('false');

    burger.click();
    fixture.detectChanges();
    expect(burger.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('#mobile-navigation')).toBeTruthy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(burger.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('#mobile-navigation')).toBeNull();
  });

  it('navigates to /patrimoines?q=... on non-empty header search', () => {
    const fixture = TestBed.createComponent(MainLayoutComponent);
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
    const comp = fixture.componentInstance as unknown as {
      searchQuery: string;
      submitSearch: () => void;
    };
    comp.searchQuery = '  Gorée ';
    comp.submitSearch();

    expect(navSpy).toHaveBeenCalledWith(['/patrimoines'], {
      queryParams: { q: 'Gorée' },
    });
  });
});
