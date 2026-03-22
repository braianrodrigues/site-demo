import {
  Component,
  ViewChild,
  inject,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy,
  computed
} from '@angular/core';

import {
  Router,
  RouterLink,
  RouterOutlet,
  RouterLinkActive,
  NavigationEnd
} from '@angular/router';

import { MatSidenav } from '@angular/material/sidenav';
import { NgIf, TitleCasePipe } from '@angular/common';

import { ToastComponent } from './shared/ui/toast/toast.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';

import { AuthService } from './core/auth.service';

/* RxJS */
import { Subject, fromEvent } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgIf,
    TitleCasePipe,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatSidenavModule,
    MatListModule,
    MatTooltipModule,
    MatExpansionModule,
    ToastComponent
  ],
  templateUrl: './app.component.html'
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('snav', { static: false })
  snav?: MatSidenav;

  auth = inject(AuthService);
  private router = inject(Router);

  notifications = 3;

  private destroy$ = new Subject<void>();

  // Compatível com signal/computed do AuthService
  isLogged = computed(() => this.auth.isAuthenticated());

  ngAfterViewInit(): void {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.snav?.close());

    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(takeUntil(this.destroy$))
      .subscribe((ev) => {
        if (ev.key === 'Escape') {
          this.snav?.close();
        }
      });
  }

  toggleSidenav(): void {
    this.snav?.toggle();
  }

  openProfile(): void {
    this.snav?.close();
    this.router.navigate(['/perfil']);
  }

  logout(): void {
    this.snav?.close();
    this.auth.logout();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}