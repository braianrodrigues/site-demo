// src/app/core/auth.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  const token = auth.getToken();

  const isAbsolute   = /^https?:\/\//i.test(req.url);
  const isApiRelative = req.url.startsWith('/api/');

  let authReq = req;

  if (token && (isAbsolute || isApiRelative)) {
    // NÃO forçar Accept aqui para não quebrar chamadas de blob (fotos)
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    
    if (req.responseType === 'json' || req.responseType === 'text') {
      headers['Accept'] = 'application/json';
    }

    authReq = req.clone({ setHeaders: headers });
  }

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        auth.logout();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};
