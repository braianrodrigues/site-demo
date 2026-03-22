import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  CadastroTelefonicoResponse,
  CadastroTelefonicoService,
} from './cadastro-telefonico.service';

@Component({
  selector: 'app-cadastro-telefonico-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './cadastro-telefonico-list.component.html',
  styleUrls: ['./cadastro-telefonico-list.component.scss'],
})
export class CadastroTelefonicoListComponent implements OnInit {
  private readonly service = inject(CadastroTelefonicoService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly loading = signal(false);

  /** lista original vinda do backend */
  private allItems: CadastroTelefonicoResponse[] = [];

  /** lista exibida na tabela */
  readonly items = signal<CadastroTelefonicoResponse[]>([]);

  /** filtros */
  readonly searchNumero = signal('');
  readonly searchNome = signal('');
  readonly searchOperadora = signal('');
  readonly searchOperacao = signal('');
  readonly searchProrrogacao = signal('');

  ngOnInit(): void {
    this.load();
  }

  /**
   * Carrega registros do backend
   */
  load(): void {
    this.loading.set(true);

    this.service
      .list(0, 100)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.allItems = response.content ?? [];
          this.items.set(this.allItems);
        },
        error: (err) => {
          const msg =
            err?.error?.message ||
            'Não foi possível carregar os cadastros telefônicos.';
          this.openError(msg);
        },
      });
  }

  /**
   * Aplica filtros localmente (igual tela de produtividade)
   */
  aplicarFiltro(): void {
    const numero = this.searchNumero().toLowerCase();
    const nome = this.searchNome().toLowerCase();
    const operadora = this.searchOperadora().toLowerCase();
    const operacao = this.searchOperacao().toLowerCase();
    const prorrogacao = this.searchProrrogacao().toLowerCase();

    const filtrados = this.allItems.filter((item) => {
      return (
        (!numero ||
          item.numeroTelefone?.toLowerCase().includes(numero)) &&
        (!nome ||
          item.nome?.toLowerCase().includes(nome)) &&
        (!operadora ||
          item.operadora?.toLowerCase().includes(operadora)) &&
        (!operacao ||
          item.operacaoNome?.toLowerCase().includes(operacao)) &&
        (!prorrogacao ||
          item.prorrogacaoDescricao?.toLowerCase().includes(prorrogacao))
      );
    });

    this.items.set(filtrados);
  }

  /**
   * Verifica se algum filtro está ativo
   */
  temFiltroAtivo(): boolean {
    return !!(
      this.searchNumero() ||
      this.searchNome() ||
      this.searchOperadora() ||
      this.searchOperacao() ||
      this.searchProrrogacao()
    );
  }

  /**
   * Navegação
   */
  novo(): void {
    this.router.navigate(['/operacoes/cadastro-telefonico/novo']);
  }

  editar(id: number): void {
    this.router.navigate(['/operacoes/cadastro-telefonico', id, 'editar']);
  }

  visualizar(id: number): void {
    this.router.navigate(['/operacoes/cadastro-telefonico', id, 'visualizar']);
  }

  excluir(id: number): void {
    const confirmar = window.confirm(
      'Deseja realmente excluir este cadastro telefônico?'
    );

    if (!confirmar) return;

    this.service.delete(id).subscribe({
      next: () => {
        this.openSuccess('Cadastro telefônico excluído com sucesso.');
        this.load();
      },
      error: (err) => {
        const msg =
          err?.error?.message ||
          'Não foi possível excluir o cadastro telefônico.';
        this.openError(msg);
      },
    });
  }

  /**
   * Filtros
   */
  setFilterNumero(value: string): void {
    this.searchNumero.set(value);
    this.aplicarFiltro();
  }

  setFilterNome(value: string): void {
    this.searchNome.set(value);
    this.aplicarFiltro();
  }

  setFilterOperadora(value: string): void {
    this.searchOperadora.set(value);
    this.aplicarFiltro();
  }

  setFilterOperacao(value: string): void {
    this.searchOperacao.set(value);
    this.aplicarFiltro();
  }

  setFilterProrrogacao(value: string): void {
    this.searchProrrogacao.set(value);
    this.aplicarFiltro();
  }

  /**
   * Formata data da prorrogação
   */
  formatProrrogacaoDescricao(value: string | null | undefined): string {
    if (!value) return '-';

    return value.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_, ano, mes, dia) => {
      return `${dia}-${mes}-${ano}`;
    });
  }

  /**
   * Snackbar sucesso
   */
  private openSuccess(message: string): void {
    this.snackBar.open(message, 'Fechar', {
      duration: 3500,
      panelClass: ['snackbar-success'],
    });
  }

  /**
   * Snackbar erro
   */
  private openError(message: string): void {
    this.snackBar.open(message, 'Fechar', {
      duration: 4500,
      panelClass: ['snackbar-error'],
    });
  }
}