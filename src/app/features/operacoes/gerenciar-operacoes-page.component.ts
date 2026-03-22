import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BrDatePipe } from '../../shared/pipes/br-date.pipe';

import {
  OperacaoResponse,
  OperacoesService,
  ProrrogacaoRequest,
  ProrrogacaoResponse,
} from './operacoes.service';

@Component({
  selector: 'app-gerenciar-operacoes-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    BrDatePipe,
  ],
  templateUrl: './gerenciar-operacoes-page.component.html',
  styleUrls: ['./gerenciar-operacoes-page.component.scss'],
})
export class GerenciarOperacoesPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(OperacoesService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loadingOperacoes = signal(false);
  readonly loadingProrrogacoes = signal(false);
  readonly savingOperacao = signal(false);
  readonly savingProrrogacao = signal(false);

  readonly operacoes = signal<OperacaoResponse[]>([]);
  readonly prorrogacoes = signal<ProrrogacaoResponse[]>([]);
  readonly selectedOperacao = signal<OperacaoResponse | null>(null);

  readonly operacaoEmEdicaoId = signal<number | null>(null);
  readonly prorrogacaoEmEdicaoId = signal<number | null>(null);

  readonly hasOperacaoSelecionada = computed(() => !!this.selectedOperacao());

  readonly operacaoForm = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(150)]],
    ativo: [true, [Validators.required]],
  });

  readonly prorrogacaoForm = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(150)]],
    dataInicio: ['', [Validators.required]],
    dataFim: ['', [Validators.required]],
    ativo: [true, [Validators.required]],
  });

  ngOnInit(): void {
    this.loadOperacoes();
  }

  loadOperacoes(): void {
    this.loadingOperacoes.set(true);

    this.service
      .listOperacoes('', 0, 100)
      .pipe(finalize(() => this.loadingOperacoes.set(false)))
      .subscribe({
        next: (response) => {
          const lista = response.content ?? [];
          this.operacoes.set(lista);

          const atual = this.selectedOperacao();

          if (atual) {
            const refreshed = lista.find((o) => o.id === atual.id) ?? null;
            this.selectedOperacao.set(refreshed);

            if (refreshed) {
              this.loadProrrogacoes(refreshed.id);
            } else {
              this.prorrogacoes.set([]);
            }
          } else if (lista.length > 0) {
            this.selectOperacao(lista[0]);
          } else {
            this.selectedOperacao.set(null);
            this.prorrogacoes.set([]);
          }
        },
        error: (err) => {
          const msg = err?.error?.message || 'Não foi possível carregar as operações.';
          this.openError(msg);
        },
      });
  }

  selectOperacao(operacao: OperacaoResponse): void {
    this.selectedOperacao.set(operacao);
    this.resetProrrogacaoForm();
    this.loadProrrogacoes(operacao.id);
  }

  loadProrrogacoes(operacaoId: number): void {
    this.loadingProrrogacoes.set(true);

    this.service
      .listProrrogacoesByOperacao(operacaoId, '', 0, 100)
      .pipe(finalize(() => this.loadingProrrogacoes.set(false)))
      .subscribe({
        next: (response) => {
          this.prorrogacoes.set(response.content ?? []);
        },
        error: (err) => {
          this.prorrogacoes.set([]);
          const msg = err?.error?.message || 'Não foi possível carregar as prorrogações.';
          this.openError(msg);
        },
      });
  }

  saveOperacao(): void {
    if (this.operacaoForm.invalid) {
      this.operacaoForm.markAllAsTouched();
      return;
    }

    const raw = this.operacaoForm.getRawValue();
    const nome = (raw.nome ?? '').trim();

    if (!nome) {
      this.operacaoForm.get('nome')?.setErrors({ required: true });
      this.operacaoForm.get('nome')?.markAsTouched();
      return;
    }

    const payload = {
      nome,
      ativo: raw.ativo ?? true,
    };

    this.savingOperacao.set(true);

    const request$ = this.operacaoEmEdicaoId()
      ? this.service.updateOperacao(this.operacaoEmEdicaoId()!, payload)
      : this.service.createOperacao(payload);

    request$
      .pipe(finalize(() => this.savingOperacao.set(false)))
      .subscribe({
        next: (operacao) => {
          this.openSuccess(
            this.operacaoEmEdicaoId()
              ? 'Operação atualizada com sucesso.'
              : 'Operação cadastrada com sucesso.'
          );

          this.resetOperacaoForm();
          this.loadOperacoes();

          setTimeout(() => {
            this.selectedOperacao.set(operacao);
            this.loadProrrogacoes(operacao.id);
          }, 0);
        },
        error: (err) => {
          const msg = err?.error?.message || 'Não foi possível salvar a operação.';
          this.openError(msg);
        },
      });
  }

  editOperacao(operacao: OperacaoResponse): void {
    this.operacaoEmEdicaoId.set(operacao.id);
    this.operacaoForm.patchValue({
      nome: operacao.nome,
      ativo: operacao.ativo,
    });
  }

  deleteOperacao(operacao: OperacaoResponse): void {
    const confirmar = window.confirm(
      `Deseja realmente excluir a operação "${operacao.nome}"?`
    );

    if (!confirmar) return;

    this.service.deleteOperacao(operacao.id).subscribe({
      next: () => {
        this.openSuccess('Operação excluída com sucesso.');
        this.selectedOperacao.set(null);
        this.prorrogacoes.set([]);
        this.resetOperacaoForm();
        this.resetProrrogacaoForm();
        this.loadOperacoes();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Não foi possível excluir a operação.';
        this.openError(msg);
      },
    });
  }

  resetOperacaoForm(): void {
    this.operacaoEmEdicaoId.set(null);
    this.operacaoForm.reset({
      nome: '',
      ativo: true,
    });
    this.operacaoForm.markAsPristine();
    this.operacaoForm.markAsUntouched();
  }

  saveProrrogacao(): void {
    const operacao = this.selectedOperacao();

    if (!operacao) {
      this.openError('Selecione uma operação antes de cadastrar a prorrogação.');
      return;
    }

    if (this.prorrogacaoForm.invalid) {
      this.prorrogacaoForm.markAllAsTouched();
      return;
    }

    const raw = this.prorrogacaoForm.getRawValue();

    const dataInicio = raw.dataInicio ?? '';
    const dataFim = raw.dataFim ?? '';

    if (dataInicio && dataFim && new Date(dataInicio) > new Date(dataFim)) {
      this.openError('A data de início não pode ser maior que a data de fim.');
      return;
    }

    const payload: ProrrogacaoRequest = {
      nome: (raw.nome ?? '').trim(),
      dataInicio,
      dataFim,
      ativo: raw.ativo ?? true,
    };

    if (!payload.nome) {
      this.prorrogacaoForm.get('nome')?.setErrors({ required: true });
      this.prorrogacaoForm.get('nome')?.markAsTouched();
      return;
    }

    this.savingProrrogacao.set(true);

    const request$ = this.prorrogacaoEmEdicaoId()
      ? this.service.updateProrrogacao(this.prorrogacaoEmEdicaoId()!, payload)
      : this.service.createProrrogacao(operacao.id, payload);

    request$
      .pipe(finalize(() => this.savingProrrogacao.set(false)))
      .subscribe({
        next: () => {
          this.openSuccess(
            this.prorrogacaoEmEdicaoId()
              ? 'Prorrogação atualizada com sucesso.'
              : 'Prorrogação cadastrada com sucesso.'
          );

          this.resetProrrogacaoForm();
          this.loadProrrogacoes(operacao.id);
        },
        error: (err) => {
          const msg = err?.error?.message || 'Não foi possível salvar a prorrogação.';
          this.openError(msg);
        },
      });
  }

  editProrrogacao(prorrogacao: ProrrogacaoResponse): void {
    this.prorrogacaoEmEdicaoId.set(prorrogacao.id);
    this.prorrogacaoForm.patchValue({
      nome: prorrogacao.nome,
      dataInicio: prorrogacao.dataInicio,
      dataFim: prorrogacao.dataFim,
      ativo: prorrogacao.ativo,
    });
  }

  deleteProrrogacao(prorrogacao: ProrrogacaoResponse): void {
    const confirmar = window.confirm(
      `Deseja realmente excluir a prorrogação "${prorrogacao.nome}"?`
    );

    if (!confirmar) return;

    this.service.deleteProrrogacao(prorrogacao.id).subscribe({
      next: () => {
        this.openSuccess('Prorrogação excluída com sucesso.');
        this.resetProrrogacaoForm();

        const operacao = this.selectedOperacao();
        if (operacao) {
          this.loadProrrogacoes(operacao.id);
        }
      },
      error: (err) => {
        const msg = err?.error?.message || 'Não foi possível excluir a prorrogação.';
        this.openError(msg);
      },
    });
  }

  resetProrrogacaoForm(): void {
    this.prorrogacaoEmEdicaoId.set(null);
    this.prorrogacaoForm.reset({
      nome: '',
      dataInicio: '',
      dataFim: '',
      ativo: true,
    });
    this.prorrogacaoForm.markAsPristine();
    this.prorrogacaoForm.markAsUntouched();
  }

  hasOperacaoError(controlName: string, errorName: string): boolean {
    const control = this.operacaoForm.get(controlName);
    return !!control && control.hasError(errorName) && (control.touched || control.dirty);
  }

  hasProrrogacaoError(controlName: string, errorName: string): boolean {
    const control = this.prorrogacaoForm.get(controlName);
    return !!control && control.hasError(errorName) && (control.touched || control.dirty);
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