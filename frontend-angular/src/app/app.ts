import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgxSonnerToaster } from 'ngx-sonner';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, NgxSonnerToaster],
  template: `
    <ngx-sonner-toaster position="bottom-right" [richColors]="true" />
    <router-outlet />
  `,
})
export class App {}
