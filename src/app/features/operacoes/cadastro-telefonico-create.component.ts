import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import {
  CadastroTelefonicoRequest,
  CadastroTelefonicoResponse,
  CadastroTelefonicoService,
} from './cadastro-telefonico.service';
import {
  OperacaoResponse,
  ProrrogacaoResponse,
} from './operacoes.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-cadastro-telefonico-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './cadastro-telefonico-create.component.html',
  styleUrls: ['./cadastro-telefonico-create.component.scss'],
})
export class CadastroTelefonicoCreateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly service = inject(CadastroTelefonicoService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly readonlyMode = signal(false);

  readonly operacoes = signal<OperacaoResponse[]>([]);
  readonly prorrogacoes = signal<ProrrogacaoResponse[]>([]);
  readonly cadastroAtual = signal<CadastroTelefonicoResponse | null>(null);

  readonly operadoras = this.service.operadoraOptions;
  readonly situacoes = this.service.situacaoOptions;
  readonly planos = this.service.planoOptions;
  readonly possuiRegistrosOptions = this.service.possuiRegistrosOptions;

  readonly cadastroId = computed<number | null>(() => {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? Number(id) : null;
  });

  readonly isEditMode = computed(() => !!this.cadastroId());

  readonly title = computed(() => {
    if (this.readonlyMode()) return 'Cadastro Telefônico — Visualizar';
    if (this.isEditMode()) return 'Cadastro Telefônico — Editar';
    return 'Cadastro Telefônico — Novo';
  });

  readonly form = this.fb.group({
    cadastradoPor: [''],
    dataCadastro: [this.today()],
    numeroTelefone: [''],
    operadora: [''],
    situacao: [''],
    plano: [''],
    possuiRegistrosAnteriores: [''],

    operacaoNome: [''],
    prorrogacaoDescricao: [''],

    nome: [''],
    rg: [''],
    cpf: [''],
    endereco: [''],
    cidade: [''],
    dataAtivacao: [this.today()],
    dataConsulta: [this.today()],
    observacoes: [''],
  });

  ngOnInit(): void {
    this.readonlyMode.set(this.route.snapshot.data['readonly'] === true);

    this.prefillUsuarioAtual();
    this.setupOperacaoChangeListener();
    this.loadOperacoes();

    const id = this.cadastroId();
    if (id) {
      this.loadCadastro(id);
    } else if (this.readonlyMode()) {
      this.form.disable({ emitEvent: false });
    }
  }

  private prefillUsuarioAtual(): void {
    const nomeAtual = this.auth.getCurrentUserName()?.trim();
    if (nomeAtual) {
      this.form.patchValue({ cadastradoPor: nomeAtual }, { emitEvent: false });
    }
  }

  private setupOperacaoChangeListener(): void {
    this.form.get('operacaoNome')?.valueChanges.subscribe((operacaoNome) => {
      this.form.patchValue({ prorrogacaoDescricao: '' }, { emitEvent: false });
      this.prorrogacoes.set([]);

      if (operacaoNome) {
        const operacaoSelecionada = this.operacoes().find(o => o.nome === operacaoNome);
        if (operacaoSelecionada?.id) {
          this.loadProrrogacoes(operacaoSelecionada.id);
        }
      }
    });
  }

  loadOperacoes(): void {
    this.service.listOperacoesAtivas().subscribe({
      next: (lista) => {
        this.operacoes.set(lista ?? []);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Não foi possível carregar as operações.';
        this.openError(msg);
      },
    });
  }

  loadProrrogacoes(operacaoId: number): void {
    this.service.listProrrogacoesAtivasByOperacao(operacaoId).subscribe({
      next: (lista) => {
        this.prorrogacoes.set(lista ?? []);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Não foi possível carregar as prorrogações.';
        this.openError(msg);
      },
    });
  }

  loadCadastro(id: number): void {
    this.loading.set(true);

    this.service
      .getById(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (item: CadastroTelefonicoResponse) => {
          this.cadastroAtual.set(item);

          this.form.patchValue(
            {
              cadastradoPor: item.cadastradoPor ?? '',
              dataCadastro: item.dataCadastro ?? this.today(),
              numeroTelefone: item.numeroTelefone ?? '',
              operadora: item.operadora ?? '',
              situacao: item.situacao ?? '',
              plano: item.plano ?? '',
              possuiRegistrosAnteriores: item.possuiRegistrosAnteriores ?? '',

              operacaoNome: item.operacaoNome ?? '',
              prorrogacaoDescricao: item.prorrogacaoDescricao ?? '',

              nome: item.nome ?? '',
              rg: item.rg ?? '',
              cpf: item.cpf ?? '',
              endereco: item.endereco ?? '',
              cidade: item.cidade ?? '',
              dataAtivacao: item.dataAtivacao ?? '',
              dataConsulta: item.dataConsulta ?? this.today(),
              observacoes: item.observacoes ?? '',
            },
            { emitEvent: false }
          );

          const operacaoNome = item.operacaoNome ?? '';
          if (operacaoNome) {
            const operacaoSelecionada = this.operacoes().find(o => o.nome === operacaoNome);

            if (operacaoSelecionada?.id) {
              this.service.listProrrogacoesAtivasByOperacao(operacaoSelecionada.id).subscribe({
                next: (lista) => {
                  this.prorrogacoes.set(lista ?? []);

                  if (this.readonlyMode()) {
                    this.form.disable({ emitEvent: false });
                  }
                },
                error: () => {
                  this.prorrogacoes.set([]);

                  if (this.readonlyMode()) {
                    this.form.disable({ emitEvent: false });
                  }
                },
              });
            } else if (this.readonlyMode()) {
              this.form.disable({ emitEvent: false });
            }
          } else if (this.readonlyMode()) {
            this.form.disable({ emitEvent: false });
          }
        },
        error: (err) => {
          const msg =
            err?.error?.message || 'Não foi possível carregar o cadastro telefônico.';
          this.openError(msg);
        },
      });
  }

  save(): void {
    if (this.readonlyMode()) return;

    const raw = this.form.getRawValue();

    const payload: CadastroTelefonicoRequest = {
      cadastradoPor: this.toNullable(raw.cadastradoPor),
      dataCadastro: raw.dataCadastro || null,
      numeroTelefone: this.toNullable(raw.numeroTelefone),
      operadora: this.toNullable(raw.operadora),
      situacao: this.toNullable(raw.situacao),
      plano: this.toNullable(raw.plano),
      possuiRegistrosAnteriores: this.toNullable(raw.possuiRegistrosAnteriores),

      operacaoNome: this.toNullable(raw.operacaoNome),
      prorrogacaoDescricao: this.toNullable(raw.prorrogacaoDescricao),

      nome: this.toNullable(raw.nome),
      rg: this.toNullable(raw.rg),
      cpf: this.toNullable(raw.cpf),
      endereco: this.toNullable(raw.endereco),
      cidade: this.toNullable(raw.cidade),
      dataAtivacao: raw.dataAtivacao || null,
      dataConsulta: raw.dataConsulta || null,
      observacoes: this.toNullable(raw.observacoes),
    };

    this.saving.set(true);

    const id = this.cadastroId();
    const request$ = id
      ? this.service.update(id, payload)
      : this.service.create(payload);

    request$
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.openSuccess(
            id
              ? 'Cadastro telefônico atualizado com sucesso.'
              : 'Cadastro telefônico criado com sucesso.'
          );
          this.router.navigate(['/operacoes/cadastro-telefonico']);
        },
        error: (err) => {
          const msg =
            err?.error?.message || 'Não foi possível salvar o cadastro telefônico.';
          this.openError(msg);
        },
      });
  }

  back(): void {
    this.router.navigate(['/operacoes/cadastro-telefonico']);
  }

  getOperacoesDoSelect(): string[] {
    const listaAtiva = this.operacoes()
      .map(item => item.nome)
      .filter((item): item is string => !!item);

    const historica = this.cadastroAtual()?.operacaoNome;
    if (historica && !listaAtiva.includes(historica)) {
      return [historica, ...listaAtiva];
    }

    return listaAtiva;
  }

  getProrrogacoesDoSelect(): string[] {
    const listaAtiva = this.prorrogacoes()
      .map(item => item.descricaoExibicao)
      .filter((item): item is string => !!item);

    const historica = this.cadastroAtual()?.prorrogacaoDescricao;
    if (historica && !listaAtiva.includes(historica)) {
      return [historica, ...listaAtiva];
    }

    return listaAtiva;
  }

  formatProrrogacaoDescricao(value: string | null | undefined): string {
    if (!value) return '';

    return value.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_, ano, mes, dia) => {
      return `${dia}-${mes}-${ano}`;
    });
  }

  isOperacaoHistorica(nome: string | null | undefined): boolean {
    if (!nome) return false;
    return !this.operacoes().some(item => item.nome === nome);
  }

  isProrrogacaoHistorica(descricao: string | null | undefined): boolean {
    if (!descricao) return false;
    return !this.prorrogacoes().some(item => item.descricaoExibicao === descricao);
  }

  private toNullable(value: string | null | undefined): string | null {
    const normalized = (value ?? '').trim();
    return normalized ? normalized : null;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
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