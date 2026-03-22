import { Component, inject, TrackByFunction } from '@angular/core';
import { NgFor, NgIf, NgClass } from '@angular/common';
import { ToastService, Toast } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgFor, NgIf, NgClass],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
})
export class ToastComponent {
  ts = inject(ToastService);

  // trackBy precisa ser uma função/propriedade pública
  trackById: TrackByFunction<Toast> = (_: number, t: Toast) => t.id;

  icon(kind: Toast['kind']): string {
    switch (kind) {
      case 'success': return 'check_circle';
      case 'error'  : return 'error';
      case 'warning': return 'warning';
      default       : return 'info';
    }
  }

  dismiss(id: number) { this.ts.dismiss(id); }
}
