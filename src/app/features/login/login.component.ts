import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../core/auth.service';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  username = '';
  password = '';
  error = '';
  loading = false;

  submit(): void {
    if (this.loading) return;

    this.error = '';

    const username = this.username.trim();
    const password = this.password;

    if (!username || !password) {
      this.error = 'Informe usuário e senha.';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.auth.login(username, password).subscribe({
      next: async (res) => {
        if (res.user?.precisaTrocarSenha) {
          this.loading = false;
          this.cdr.detectChanges();
          await this.router.navigateByUrl('/primeiro-acesso');
          return;
        }

        const redirectTo =
          this.route.snapshot.queryParamMap.get('redirectTo') || '/';

        this.loading = false;
        this.cdr.detectChanges();
        await this.router.navigateByUrl(redirectTo);
      },
      error: (e) => {
        console.error('[LOGIN] erro na autenticação', e);

        if (e?.status === 401) {
          this.error = 'Usuário ou senha incorretos.';
        } else {
          this.error = e?.error?.message || 'Falha ao autenticar.';
        }

        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}