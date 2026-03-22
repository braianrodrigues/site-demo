import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import {
  ChangeMyPasswordRequest,
  ProfileResponse,
  ProfileService,
  UpdateMyProfileRequest,
} from '../../core/services/profile.service';

@Component({
  selector: 'app-perfil-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './perfil-page.component.html',
  styleUrls: ['./perfil-page.component.scss'],
})
export class PerfilPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly profileService = inject(ProfileService);

  readonly loading = signal<boolean>(true);
  readonly savingProfile = signal<boolean>(false);
  readonly savingPassword = signal<boolean>(false);
  readonly profile = signal<ProfileResponse | null>(null);

  readonly profileForm = this.fb.group({
    username: [{ value: '', disabled: true }],
    email: [{ value: '', disabled: true }],
    role: [{ value: '', disabled: true }],
    areaAcesso: [{ value: '', disabled: true }],

    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    telefone: ['', [Validators.maxLength(30)]],
    endereco: ['', [Validators.maxLength(255)]],
    dataNascimento: [''],
    re: ['', [Validators.maxLength(20)]],
  });

  readonly passwordForm = this.fb.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmNewPassword: ['', [Validators.required]],
    },
    {
      validators: [PerfilPageComponent.passwordMatchValidator],
    }
  );

  readonly passwordMismatch = computed(() => {
    const form = this.passwordForm;
    return !!form.errors?.['passwordMismatch'] && (form.dirty || form.touched);
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  private static passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword')?.value ?? '';
    const confirmNewPassword = control.get('confirmNewPassword')?.value ?? '';

    if (!newPassword || !confirmNewPassword) {
      return null;
    }

    return newPassword === confirmNewPassword ? null : { passwordMismatch: true };
  }

  loadProfile(): void {
    this.loading.set(true);

    this.profileService
      .getMyProfile()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.profile.set(response);
          this.fillProfileForm(response);
        },
        error: (err) => {
          const msg = err?.error?.message || 'Não foi possível carregar o perfil.';
          this.openError(msg);
        },
      });
  }

  private fillProfileForm(data: ProfileResponse): void {
    this.profileForm.patchValue({
      username: data.username ?? '',
      email: data.email ?? '',
      role: this.formatRole(data.role),
      areaAcesso: this.formatAreaAcesso(data.areaAcesso),
      fullName: data.fullName ?? '',
      telefone: data.telefone ?? '',
      endereco: data.endereco ?? '',
      dataNascimento: data.dataNascimento ?? '',
      re: data.re ?? '',
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const raw = this.profileForm.getRawValue();
    const fullName = (raw.fullName ?? '').trim();

    if (!fullName) {
      this.profileForm.get('fullName')?.setErrors({ required: true });
      this.profileForm.get('fullName')?.markAsTouched();
      return;
    }

    const payload: UpdateMyProfileRequest = {
      fullName,
      telefone: this.toNullable(raw.telefone),
      endereco: this.toNullable(raw.endereco),
      dataNascimento: raw.dataNascimento || null,
      re: this.toNullable(raw.re),
    };

    this.savingProfile.set(true);

    this.profileService
      .updateMyProfile(payload)
      .pipe(finalize(() => this.savingProfile.set(false)))
      .subscribe({
        next: (response) => {
          this.profile.set(response);
          this.fillProfileForm(response);
          this.openSuccess('Perfil atualizado com sucesso.');
        },
        error: (err) => {
          const msg = err?.error?.message || 'Não foi possível atualizar o perfil.';
          this.openError(msg);
        },
      });
  }

  savePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const raw = this.passwordForm.getRawValue();

    const payload: ChangeMyPasswordRequest = {
      currentPassword: raw.currentPassword ?? '',
      newPassword: raw.newPassword ?? '',
      confirmNewPassword: raw.confirmNewPassword ?? '',
    };

    this.savingPassword.set(true);

    this.profileService
      .changeMyPassword(payload)
      .pipe(finalize(() => this.savingPassword.set(false)))
      .subscribe({
        next: () => {
          this.passwordForm.reset({
            currentPassword: '',
            newPassword: '',
            confirmNewPassword: '',
          });
          this.passwordForm.markAsPristine();
          this.passwordForm.markAsUntouched();
          this.openSuccess('Senha alterada com sucesso.');
        },
        error: (err) => {
          const msg = err?.error?.message || 'Não foi possível alterar a senha.';
          this.openError(msg);
        },
      });
  }

  back(): void {
    this.router.navigateByUrl('/');
  }

  hasError(
    formName: 'profile' | 'password',
    controlName: string,
    errorName: string
  ): boolean {
    if (formName === 'profile') {
      const control = this.profileForm.get(controlName);
      return !!control && control.hasError(errorName) && (control.touched || control.dirty);
    }

    const control = this.passwordForm.get(controlName);
    return !!control && control.hasError(errorName) && (control.touched || control.dirty);
  }

  private toNullable(value: string | null | undefined): string | null {
    const normalized = (value ?? '').trim();
    return normalized ? normalized : null;
  }

  private formatRole(role: string | null | undefined): string {
    switch (role) {
      case 'GESTOR':
        return 'Gestor';
      case 'ADMIN_OPERACIONAL':
        return 'Administrador Operacional';
      case 'ADMIN_ADM':
        return 'Administrador Administrativo';
      case 'USUARIO_NIVEL_I':
        return 'Usuário Nível I';
      case 'USUARIO_NIVEL_II':
        return 'Usuário Nível II';
      default:
        return role ?? '';
    }
  }

  private formatAreaAcesso(area: string | null | undefined): string {
    switch (area) {
      case 'OPERACIONAL':
        return 'Operacional';
      case 'ADMINISTRATIVO':
        return 'Administrativo';
      case 'AMBOS':
        return 'Ambos';
      default:
        return area ?? '';
    }
  }

  private openSuccess(message: string): void {
    this.snackBar.open(message, 'Fechar', {
      duration: 3500,
      panelClass: ['snackbar-success'],
    });
  }

  private openError(message: string): void {
    this.snackBar.open(message, 'Fechar', {
      duration: 4500,
      panelClass: ['snackbar-error'],
    });
  }
}