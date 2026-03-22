import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/login'], {
      queryParams: { redirectTo: state.url }
    });
    return false;
  }

  const precisaTrocarSenha = auth.precisaTrocarSenha();
  const indoParaPrimeiroAcesso = state.url.startsWith('/primeiro-acesso');

  if (precisaTrocarSenha && !indoParaPrimeiroAcesso) {
    router.navigate(['/primeiro-acesso']);
    return false;
  }

  return true;
};