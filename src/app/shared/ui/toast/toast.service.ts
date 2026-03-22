import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  title?: string;
  timeout?: number; // ms
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  toasts = this._toasts.asReadonly();

  private seq = 0;

  private push(kind: ToastKind, message: string, opts?: { title?: string; timeout?: number }): number {
    const id = ++this.seq;
    const t: Toast = {
      id,
      kind,
      message,
      title: opts?.title,
      timeout: opts?.timeout ?? 4000,
    };
    this._toasts.update(arr => [...arr, t]);

    if (t.timeout && t.timeout > 0) {
      setTimeout(() => this.dismiss(id), t.timeout);
    }
    return id;
  }

  success(msg: string, opts?: { title?: string; timeout?: number }) { return this.push('success', msg, opts); }
  error  (msg: string, opts?: { title?: string; timeout?: number }) { return this.push('error',   msg, opts); }
  info   (msg: string, opts?: { title?: string; timeout?: number }) { return this.push('info',    msg, opts); }
  warn   (msg: string, opts?: { title?: string; timeout?: number }) { return this.push('warning', msg, opts); }

  dismiss(id: number) {
    this._toasts.update(arr => arr.filter(t => t.id !== id));
  }

  clear() { this._toasts.set([]); }
}
