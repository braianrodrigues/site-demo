import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-primeiro-acesso',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './primeiro-acesso.component.html',
  styleUrls: ['./primeiro-acesso.component.scss']
})
export class PrimeiroAcessoComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  private auth = inject(AuthService);

  loading = signal(false);
  error = signal('');
  hideSenha = signal(true);
  hideConfirmacao = signal(true);

  form = this.fb.group({
    novaSenha: ['', [Validators.required, Validators.minLength(6)]],
    confirmarSenha: ['', [Validators.required, Validators.minLength(6)]],
  });

  get f() {
    return this.form.controls;
  }

  strength(): number {
    const senha = this.form.get('novaSenha')?.value ?? '';
    if (!senha) return 0;

    let score = 0;

    if (senha.length >= 6) score += 20;
    if (senha.length >= 8) score += 20;
    if (senha.length >= 10) score += 15;
    if (/[a-z]/.test(senha)) score += 10;
    if (/[A-Z]/.test(senha)) score += 10;
    if (/\d/.test(senha)) score += 10;
    if (/[^A-Za-z0-9]/.test(senha)) score += 15;

    return Math.min(score, 100);
  }

  strengthLabel(): string {
    const s = this.strength();
    if (s >= 85) return 'Muito forte';
    if (s >= 65) return 'Forte';
    if (s >= 40) return 'Média';
    if (s > 0) return 'Fraca';
    return '—';
  }

  strengthClass(): string {
    const s = this.strength();
    if (s >= 85) return 'very-good';
    if (s >= 65) return 'good';
    if (s >= 40) return 'medium';
    if (s > 0) return 'weak';
    return 'empty';
  }

  passwordsMatch(): boolean {
    const a = this.form.get('novaSenha')?.value ?? '';
    const b = this.form.get('confirmarSenha')?.value ?? '';
    return !!a && !!b && a === b;
  }

  showMatchState(): boolean {
    const confirmar = this.form.get('confirmarSenha')?.value ?? '';
    return !!confirmar;
  }

  salvar(): void {
    this.error.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const novaSenha = this.form.get('novaSenha')?.value ?? '';
    const confirmarSenha = this.form.get('confirmarSenha')?.value ?? '';

    if (novaSenha !== confirmarSenha) {
      this.error.set('As senhas não coincidem.');
      return;
    }

    this.loading.set(true);

    this.http.patch(
      `${environment.API_URL}/api/auth/primeiro-acesso/senha`,
      { novaSenha }
    ).subscribe({
      next: async () => {
        this.auth.marcarSenhaComoAtualizada();
        this.loading.set(false);
        await this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Erro ao alterar senha.');
      }
    });
  }
}