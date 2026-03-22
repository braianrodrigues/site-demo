import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/login'], {
      queryParams: { redirectTo: state.url }
    });
    return false;
  }

  const allowedRoles = (route.data?.['roles'] as string[] | undefined)?.map((r) =>
    r.toUpperCase()
  );

  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  if (auth.hasAnyRole(allowedRoles)) {
    return true;
  }

  router.navigate(['/']);
  return false;
};