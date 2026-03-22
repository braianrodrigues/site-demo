// src/app/features/produtividade/produtividade-create.component.ts
import { CommonModule, Location } from '@angular/common';
import {
  Component,
  ViewChild,
  ElementRef,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
} from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatMenuModule } from '@angular/material/menu';

import { Subscription, firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

import { UsersService, UserDTO } from '../users/users.service';
import { AuthService } from '../../core/auth.service';
import { ProdutividadeApiService } from './produtividade-api.service';
import { ToastService } from '../../shared/ui/toast/toast.service';

import {
  ProdutividadeCreateRequest,
  ProdutividadeResponseDTO,
} from './produtividade.models';

type UserLite = { id: number; nome: string };
type OperacaoLite = { id: number; nome: string };

type BopKey = 'bopm' | 'bopc';
type DrugWeightKey = 'maconha' | 'cocaina' | 'crack' | 'haxixe' | 'skank';

@Component({
  selector: 'app-produtividade-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatCardModule,
    MatIconModule,
    MatDividerModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSlideToggleModule,
    MatAutocompleteModule,
    MatMenuModule,
  ],
  templateUrl: './produtividade-create.component.html',
  styleUrl: './produtividade-create.component.scss',
})
export class ProdutividadeCreateComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly location = inject(Location);
  private readonly usersService = inject(UsersService);
  private readonly api = inject(ProdutividadeApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  private subs = new Subscription();

  saving = signal(false);
  loading = signal(false);
  loadingUsers = signal(false);

  recordId = signal<number | null>(null);
  readonlyMode = signal(false);

  bopmChecking = signal(false);
  bopmDuplicate = signal(false);

  isAdmin = computed(() => this.auth.hasRole('ADMIN'));
  currentUserId = computed(() => (this.auth as any)?.getCurrentUserId?.() ?? null);

  currentUserName = computed(() => {
    const u = (this.auth as any)?.user?.() as any;
    return (this.auth as any)?.getCurrentUserName?.() ?? u?.fullName ?? u?.name ?? '';
  });

  naturezaOptions = [
    { value: 'OPERACAO_POLICIAL', label: 'Operação Policial' },
    { value: 'CAPTURA_DE_PROCURADO', label: 'Captura de Procurado' },
    { value: 'TRAFICO_DE_DROGAS', label: 'Tráfico de Drogas' },
    { value: 'ASSOCIACAO_CRIMINOSA', label: 'Associação Criminosa' },
    { value: 'FURTO', label: 'Furto' },
    { value: 'ROUBO', label: 'Roubo' },
    { value: 'PORTE_DE_ARMA', label: 'Porte de Arma' },
    { value: 'RECEPTACAO', label: 'Receptação' },
    { value: 'HOMICIDIO', label: 'Homicídio' },
    { value: 'AMEACA', label: 'Ameaça' },
    { value: 'LESAO_CORPORAL', label: 'Lesão Corporal' },
    { value: 'ESTUPRO', label: 'Estupro' },
    { value: 'PRISAO_CIVIL', label: 'Prisão Civil' },
    { value: 'MDIP', label: 'Mdip' },
    { value: 'OUTROS', label: 'Outros' },
  ];

  acaoOptions = ['Não'];
  equipeOptions = ['Equipe A', 'Equipe B'];
  execucaoOptions = [    
    'Outros',
  ];

  simNaoOptions = ['Sim', 'Não'];
  faccaoOptions = ['Não', 'Outras'];

  armaTipoOptions = [
    'Pistola',
    'Revólver',
    'Fuzil',
    'Espingarda',
    'Metralhadora',
    'Submetralhadora',
    'Rifle',
    'Carabina',
    'Munição',
    'Outros',
  ];

  armaMarcaOptions = [
    'Taurus',
    'Imbel',
    'Glock',
    'Colt',
    'Sig Sauer',
    'Kalashnikov',
    'AHK',
    'Rossi',
    'CBC',
    'Benelli',
  ];

  celularMarcaOptions = [
    'Samsung',
    'Apple',
    'Xiaomi',
    'Motorola',
    'LG',
    'Nokia',
    'Sony',
    'Huawei',
    'Asus',
    'Outros',
  ];

  private readonly _users = signal<UserLite[]>([]);
  users = computed(() => this._users());

  private readonly _operacoes = signal<OperacaoLite[]>([]);
  private readonly _operacaoSuggestions = signal<OperacaoLite[]>([]);
  operationSuggestions = computed(() => this._operacaoSuggestions());

  private readonly _selectedOperation = signal<OperacaoLite | null>(null);
  selectedOperation = computed(() => this._selectedOperation());

  vincularOperacaoCtrl = new FormControl<boolean>(false, { nonNullable: true });
  operationSearchCtrl = new FormControl<string | OperacaoLite>('');

  qualTabIndex = 0;
  armaTabIndex = 0;
  celTabIndex = 0;

  @ViewChild('qualTabs') qualTabs: any;
  @ViewChild('mainTabs') mainTabs: any;

  @ViewChild('bopmEl') bopmEl?: ElementRef<HTMLInputElement>;
  @ViewChild('bopcEl') bopcEl?: ElementRef<HTMLInputElement>;

  private moneyInputTimer: any = null;

  form = this.fb.group({
    cadastradoPorUserId: [null as number | null, Validators.required],

    data: [null as Date | null, Validators.required],
    natureza: [null as string | null, Validators.required],
    equipe: [null as string | null, Validators.required],
    execucao: [null as string | null],
    acoes: [null as string | null],

    bopm: ['', Validators.required],
    bopc: [''],

    operacaoId: [null as number | null],

    qualificacoes: this.fb.array<FormGroup>([this.createQualificacaoFG()]),
    armas: this.fb.array<FormGroup>([this.createArmaFG()]),
    celulares: this.fb.array<FormGroup>([this.createCelularFG()]),

    drogas: this.fb.group({
      maconha: [''],
      cocaina: [''],
      crack: [''],
      haxixe: [''],
      skank: [''],

      lancaPerfume: [''],
      lsd: [''],
      ecstasy: [''],
      cigarro: [''],
      outrasDrogas: [''],
      explosivos: [''],
      peDeMaconha: [''],
    }),

    veiculos: this.fb.group({
      carro: [''],
      moto: [''],
      caminhao: [''],
      camionete: [''],
    }),

    valores: [''],
    outros: [''],
    sintese: [''],
  });

  private readonly sinteseTemplates: Record<string, string> = {
    procurado:
      'RUA #### Nº #### - BAIRRO ###### - CIDADE #### /SP, ÁREA DA ####ª CIA DO ####º BPM/I, INDICIADO: ##########, RG: ##.###.###-X SSP/SP. APÓS LEVANTAMENTO PELO SIPOM, FOI IDENTIFICADO A PARTE E REPASSADO OS DADOS PARA O POLICIAMENTO OSTENSIVO, O QUAL LOCALIZOU O INDIVIDUO. FOI REALIZADO PESQUISA VIA COPOM ONDE CONFIRMOU A SITUAÇÃO DE PROCURADO, SENDO ENTÃO CONDUZIDO AO PLANTÃO POLICIAL DE ########/SP, FICANDO A DISPOSIÇÃO DA JUSTIÇA. BOPM ###### E BOPC ##### /ANO.',
  };

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const rid = idParam ? Number(idParam) : null;
    this.recordId.set(Number.isFinite(rid as any) ? rid : null);

    this.readonlyMode.set(!!this.route.snapshot.data?.['readonly']);

    const uid = this.currentUserId();
    if (uid != null) this.form.controls.cadastradoPorUserId.setValue(uid);

    if (!this.isAdmin()) {
      this.form.controls.cadastradoPorUserId.disable({ emitEvent: false });
    } else {
      this.loadUsersFromBackend();
    }

    this.subs.add(
      this.form.controls.data.valueChanges.subscribe(() => {
        this.refreshBopDisplay('bopm');
        this.refreshBopDisplay('bopc');
        void this.checkBopmDuplicate();
      })
    );

    this.subs.add(
      this.form.controls.bopm.valueChanges.subscribe(() => {
        this.bopmDuplicate.set(false);
        this.setControlError(this.form.controls.bopm, 'duplicateBopm', false);
      })
    );

    this.loadOperacoesMock();
    this.bindOperacaoLogic();
    this.bindOperacaoRequiredRule();

    this.bindDrugWeightMasking();

    const id = this.recordId();
    if (id != null) {
      this.loadById(id);
    } else if (this.readonlyMode()) {
      this.disableWholeFormForReadonly();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.moneyInputTimer) clearTimeout(this.moneyInputTimer);
  }

  get qualificacoesFA(): FormArray<FormGroup> {
    return this.form.get('qualificacoes') as FormArray<FormGroup>;
  }

  get armasFA(): FormArray<FormGroup> {
    return this.form.get('armas') as FormArray<FormGroup>;
  }

  get celularesFA(): FormArray<FormGroup> {
    return this.form.get('celulares') as FormArray<FormGroup>;
  }

  private createQualificacaoFG(): FormGroup {
    return this.fb.group({
      nome: [''],
      rg: [''],
      cpf: [''],
      endereco: [''],
      artigo: [''],
      sindicado: [null as string | null],
      faccao: [null as string | null],
      banco: [null as string | null],
    });
  }

  private createArmaFG(): FormGroup {
    return this.fb.group({
      tipo: [null as string | null],
      marca: [null as string | null],
      modelo: [''],
      qtdeMunicoes: [null as number | null],
    });
  }

  private createCelularFG(): FormGroup {
    return this.fb.group({
      marca: [null as string | null],
      modelo: [''],
    });
  }

  private loadUsersFromBackend(): void {
    this.loadingUsers.set(true);

    this.usersService.listUsers({ page: 0, size: 200 }).subscribe({
      next: (page: any) => {
        const content: UserDTO[] = Array.isArray(page) ? page : page.content ?? [];
        const mapped: UserLite[] = content.map((u) => ({ id: u.id, nome: u.fullName }));
        mapped.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        this._users.set(mapped);

        this.loadingUsers.set(false);

        const id = this.currentUserId();
        if (id != null && !this.form.controls.cadastradoPorUserId.value) {
          this.form.controls.cadastradoPorUserId.setValue(id);
        }
      },
      error: (err) => {
        console.error('Erro ao carregar usuários', err);
        this.loadingUsers.set(false);
      },
    });
  }

  cancel(): void {
    this.location.back();
  }

  async save(): Promise<void> {
    try {
      if (this.readonlyMode()) return;

      this.form.markAllAsTouched();
      this.form.updateValueAndValidity({ onlySelf: false, emitEvent: false });

      this.refreshBopDisplay('bopm');
      this.refreshBopDisplay('bopc');

      this.formatMoneyNow();

      await this.checkBopmDuplicate();
      this.form.updateValueAndValidity({ onlySelf: false, emitEvent: false });

      if (this.form.invalid) {
        if (this.mainTabs) this.mainTabs.selectedIndex = 0;
        console.warn('[save] form inválido. Campos:');
        this.logInvalidControls(this.form, 'form');
        this.focusFirstInvalidControl();
        alert('Existem campos obrigatórios pendentes. Verifique a aba "Dados iniciais".');
        return;
      }

      this.saving.set(true);

      const payload = this.buildCreatePayload();
      const rid = this.recordId();

      if (rid != null) {
        this.api.update(rid, payload).subscribe({
          next: () => {
            this.saving.set(false);

            this.router.navigate(['/produtividade'], {
              state: {
                snack: {
                  type: 'success',
                  message: 'Produtividade atualizada com sucesso.',
                },
              },
            });
          },
          error: (err: HttpErrorResponse) => {
            this.saving.set(false);
            console.error('Erro ao atualizar produtividade', err);
            console.error('backend error body:', err.error);

            const msg =
              (err.error as any)?.message ??
              err.message ??
              'Erro ao atualizar produtividade';

            this.toast.error(msg);
          },
        });
        return;
      }

      this.api.create(payload).subscribe({
        next: () => {
          this.saving.set(false);

          this.router.navigate(['/produtividade'], {
            state: {
              snack: {
                type: 'success',
                message: 'Produtividade cadastrada com sucesso.',
              },
            },
          });
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          console.error('Erro ao criar produtividade', err);
          console.error('backend error body:', err.error);

          const msg =
            (err.error as any)?.message ?? err.message ?? 'Erro ao criar produtividade';

          this.toast.error(msg);
        },
      });
    } catch (e) {
      this.saving.set(false);
      console.error('[save] exception', e);
      this.toast.error('Falha inesperada ao salvar.');
    }
  }

  private logInvalidControls(ctrl: AbstractControl, path: string): void {
    if (ctrl instanceof FormControl) {
      if (ctrl.invalid) console.warn(`❌ inválido: ${path}`, ctrl.errors, 'value=', ctrl.value);
      return;
    }
    if (ctrl instanceof FormGroup) {
      Object.keys(ctrl.controls).forEach((k) =>
        this.logInvalidControls(ctrl.controls[k], `${path}.${k}`)
      );
      return;
    }
    if (ctrl instanceof FormArray) {
      ctrl.controls.forEach((c, i) => this.logInvalidControls(c, `${path}[${i}]`));
    }
  }

  private focusFirstInvalidControl(): void {
    queueMicrotask(() => {
      const el = document.querySelector(
        '.ng-invalid[formcontrolname], .ng-invalid[ng-reflect-name]'
      ) as HTMLElement | null;

      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof (el as any).focus === 'function') (el as any).focus();
      }
    });
  }

  trackByIndex = (i: number): number => i;

  addQualificacao(): void {
    this.qualificacoesFA.push(this.createQualificacaoFG());
    this.qualTabIndex = this.qualificacoesFA.length - 1;
  }

  removeQualificacao(index: number): void {
    if (this.qualificacoesFA.length <= 1) return;
    this.qualificacoesFA.removeAt(index);
    this.qualTabIndex = Math.max(0, this.qualTabIndex - 1);
  }

  addArma(): void {
    this.armasFA.push(this.createArmaFG());
    this.armaTabIndex = this.armasFA.length - 1;
  }

  removeArma(index: number): void {
    if (this.armasFA.length <= 1) return;
    this.armasFA.removeAt(index);
    this.armaTabIndex = Math.max(0, this.armaTabIndex - 1);
  }

  addCelular(): void {
    this.celularesFA.push(this.createCelularFG());
    this.celTabIndex = this.celularesFA.length - 1;
  }

  removeCelular(index: number): void {
    if (this.celularesFA.length <= 1) return;
    this.celularesFA.removeAt(index);
    this.celTabIndex = Math.max(0, this.celTabIndex - 1);
  }

  applySinteseTemplate(key: string): void {
    const tpl = this.sinteseTemplates[key];
    if (!tpl) return;
    this.form.controls.sintese.setValue(tpl);
    this.form.controls.sintese.markAsDirty();
    this.form.controls.sintese.markAsTouched();
  }

  clearSintese(): void {
    this.form.controls.sintese.setValue('');
    this.form.controls.sintese.markAsDirty();
    this.form.controls.sintese.markAsTouched();
  }

  onPickOperacao(op: OperacaoLite): void {
    this._selectedOperation.set(op);
    this.form.controls.operacaoId.setValue(op.id);
  }

  clearOperacao(): void {
    this._selectedOperation.set(null);
    this.form.controls.operacaoId.setValue(null);
    this.operationSearchCtrl.setValue('');
  }

  private bindOperacaoLogic(): void {
    this.subs.add(
      this.operationSearchCtrl.valueChanges.subscribe((value) => {
        const q = (typeof value === 'string' ? value : value?.nome ?? '')
          .trim()
          .toLowerCase();

        if (!q) {
          this._operacaoSuggestions.set(this._operacoes().slice(0, 8));
          return;
        }

        const filtered = this._operacoes()
          .filter((o) => o.nome.toLowerCase().includes(q))
          .slice(0, 12);

        this._operacaoSuggestions.set(filtered);
      })
    );
  }

  private bindOperacaoRequiredRule(): void {
    this.subs.add(
      this.vincularOperacaoCtrl.valueChanges.subscribe((v) => {
        const ctrl = this.form.controls.operacaoId;

        if (v) {
          ctrl.addValidators(Validators.required);
        } else {
          ctrl.clearValidators();
          ctrl.setValue(null);
          this._selectedOperation.set(null);
          this.operationSearchCtrl.setValue('');
        }

        ctrl.updateValueAndValidity();
      })
    );
  }

  private loadOperacoesMock(): void {
    this._operacoes.set([
      { id: 1, nome: 'Op. Impacto' },
      { id: 2, nome: 'Op. Saturação' },
      { id: 3, nome: 'Op. Força Total' },
      { id: 4, nome: 'Op. Cidade Segura' },
      { id: 5, nome: 'Op. Fiscalização' },
    ]);

    this._operacaoSuggestions.set(this._operacoes().slice(0, 8));
  }

  private loadById(id: number): void {
    this.loading.set(true);

    this.api.getById(id).subscribe({
      next: (dto) => {
        console.log('[getById] dto.qualificacoes', (dto as any)?.qualificacoes);
        console.log('[getById] dto.armas', (dto as any)?.armas);
        console.log('[getById] dto.celulares', (dto as any)?.celulares);

        this.patchFormFromDto(dto);
        this.loading.set(false);

        if (this.readonlyMode()) this.disableWholeFormForReadonly();

        void this.checkBopmDuplicate();
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        console.error('Erro ao carregar produtividade', err);
        console.error('backend error body:', err.error);
        alert('Erro ao carregar produtividade para edição/visualização.');
        this.location.back();
      },
    });
  }

  private patchFormFromDto(dto: ProdutividadeResponseDTO): void {
    this.form.patchValue(
      {
        cadastradoPorUserId: dto.cadastradoPorUserId ?? null,
        data: this.parseIsoDateOnlyToDate(dto.data),
        natureza: dto.natureza ?? null,
        equipe: dto.equipe ?? null,
        execucao: dto.execucao ?? null,
        acoes: dto.acoes ?? null,

        bopm: this.normalizeBopDisplay(
          dto.bopm ?? '',
          this.getYearSuffixFromIso(dto.data) ?? this.getYearSuffix()
        ),
        bopc: this.normalizeBopcDisplay(
          dto.bopc ?? '',
          this.getYearSuffixFromIso(dto.data) ?? this.getYearSuffix()
        ),

        operacaoId: dto.operacaoId ?? null,
        valores: dto.valores ?? '',
        outros: dto.outros ?? '',
        sintese: dto.sintese ?? '',
      },
      { emitEvent: false }
    );

    if (dto.operacaoId != null) {
      this.vincularOperacaoCtrl.setValue(true, { emitEvent: false });
      this.form.controls.operacaoId.addValidators(Validators.required);
      this.form.controls.operacaoId.updateValueAndValidity({ emitEvent: false });

      const found = this._operacoes().find((o) => o.id === dto.operacaoId) ?? null;
      if (found) this._selectedOperation.set(found);
    } else {
      this.vincularOperacaoCtrl.setValue(false, { emitEvent: false });
      this._selectedOperation.set(null);
    }

    this.form.get('drogas')?.patchValue(
      {
        maconha: (dto as any)?.drogas?.maconha ?? '',
        cocaina: (dto as any)?.drogas?.cocaina ?? '',
        crack: (dto as any)?.drogas?.crack ?? '',
        haxixe: (dto as any)?.drogas?.haxixe ?? '',
        skank: (dto as any)?.drogas?.skank ?? '',

        lancaPerfume: (dto as any)?.drogas?.lancaPerfume ?? '',
        lsd: (dto as any)?.drogas?.lsd ?? '',
        ecstasy: (dto as any)?.drogas?.ecstasy ?? '',
        cigarro: (dto as any)?.drogas?.cigarro ?? '',
        outrasDrogas: (dto as any)?.drogas?.outrasDrogas ?? '',
        explosivos: (dto as any)?.drogas?.explosivos ?? '',
        peDeMaconha: (dto as any)?.drogas?.peDeMaconha ?? '',
      },
      { emitEvent: false }
    );

    this.form.get('veiculos')?.patchValue(
      {
        carro: (dto as any)?.veiculos?.carro ?? '',
        moto: (dto as any)?.veiculos?.moto ?? '',
        caminhao: (dto as any)?.veiculos?.caminhao ?? '',
        camionete: (dto as any)?.veiculos?.camionete ?? '',
      },
      { emitEvent: false }
    );

    this.setQualificacoesFromDto((dto as any)?.qualificacoes ?? []);
    this.setArmasFromDto((dto as any)?.armas ?? []);
    this.setCelularesFromDto((dto as any)?.celulares ?? []);

    this.applyDrugWeightVisualAll();
    this.formatMoneyNow();

    this.qualTabIndex = 0;
    this.armaTabIndex = 0;
    this.celTabIndex = 0;
  }

  private setQualificacoesFromDto(items: any[]): void {
    this.qualificacoesFA.clear();

    if (!Array.isArray(items) || items.length === 0) {
      this.qualificacoesFA.push(this.createQualificacaoFG());
      return;
    }

    for (const it of items) {
      const fg = this.createQualificacaoFG();
      fg.patchValue(
        {
          nome: it?.nome ?? '',
          rg: it?.rg ?? '',
          cpf: this.formatCpfUi(it?.cpf ?? ''),
          endereco: it?.endereco ?? '',
          artigo: it?.artigo ?? '',
          sindicado: it?.sindicado ?? null,
          faccao: it?.faccao ?? null,
          banco: it?.banco ?? null,
        },
        { emitEvent: false }
      );
      this.qualificacoesFA.push(fg);
    }
  }

  private setArmasFromDto(items: any[]): void {
    this.armasFA.clear();

    if (!Array.isArray(items) || items.length === 0) {
      this.armasFA.push(this.createArmaFG());
      return;
    }

    for (const it of items) {
      const fg = this.createArmaFG();
      fg.patchValue(
        {
          tipo: it?.tipo ?? null,
          marca: it?.marca ?? null,
          modelo: it?.modelo ?? '',
          qtdeMunicoes: it?.qtdeMunicoes ?? null,
        },
        { emitEvent: false }
      );
      this.armasFA.push(fg);
    }
  }

  private setCelularesFromDto(items: any[]): void {
    this.celularesFA.clear();

    if (!Array.isArray(items) || items.length === 0) {
      this.celularesFA.push(this.createCelularFG());
      return;
    }

    for (const it of items) {
      const fg = this.createCelularFG();
      fg.patchValue(
        {
          marca: it?.marca ?? null,
          modelo: it?.modelo ?? '',
        },
        { emitEvent: false }
      );
      this.celularesFA.push(fg);
    }
  }

  private disableWholeFormForReadonly(): void {
    this.form.disable({ emitEvent: false });
    this.vincularOperacaoCtrl.disable({ emitEvent: false });
    this.operationSearchCtrl.disable({ emitEvent: false });
  }

  onBopmInput(): void {
    this.onBopInput('bopm');
    void this.checkBopmDuplicate();
  }

  onBopcInput(): void {
    this.onBopInput('bopc');
  }

  onPesoInput(_path: string): void {}

  onMoneyInput(): void {
    if (this.moneyInputTimer) clearTimeout(this.moneyInputTimer);
    this.moneyInputTimer = setTimeout(() => {
      this.moneyInputTimer = null;
      this.formatMoneyNow();
    }, 450);
  }

  private formatMoneyNow(): void {
    const ctrl = this.form.controls.valores;
    const next = this.formatMoneyBrFromInput(ctrl.value);
    if (next !== String(ctrl.value ?? '')) ctrl.setValue(next, { emitEvent: false });
  }

  private buildCreatePayload(): ProdutividadeCreateRequest {
    const raw = this.form.getRawValue();
    const yy = this.getYearSuffixFromRawDate(raw.data as Date | null) ?? '00';

    const bopmDigits = this.bopmPrefixDigits(raw.bopm ?? '');
    const bopcPrefix = this.bopcPrefixAlnum(raw.bopc ?? '');

    const drogas = raw.drogas ?? ({} as any);

    return {
      cadastradoPorUserId: raw.cadastradoPorUserId ?? null,
      data: raw.data
        ? this.toIsoDateOnly(raw.data as Date)
        : this.toIsoDateOnly(new Date()),
      natureza: String(raw.natureza ?? ''),
      equipe: String(raw.equipe ?? ''),
      execucao: raw.execucao ?? null,
      acoes: raw.acoes ?? null,
      bopm: bopmDigits ? `${bopmDigits}/${yy}` : null,
      bopc: bopcPrefix ? `${bopcPrefix}/${yy}` : null,
      operacaoId: raw.operacaoId ?? null,

      qualificacoes: (raw.qualificacoes ?? []).map((q: any) => ({
        nome: (q.nome ?? '').trim() || null,
        rg: (q.rg ?? '').trim() || null,
        cpf: this.onlyDigits(q.cpf) || null,
        endereco: (q.endereco ?? '').trim() || null,
        artigo: (q.artigo ?? '').trim() || null,
        sindicado: q.sindicado ?? null,
        faccao: q.faccao ?? null,
        banco: q.banco ?? null,
      })),

      armas: (raw.armas ?? []).map((a: any) => ({
        tipo: a.tipo ?? null,
        marca: a.marca ?? null,
        modelo: (a.modelo ?? '').trim() || null,
        qtdeMunicoes: a.qtdeMunicoes ?? null,
      })),

      celulares: (raw.celulares ?? []).map((c: any) => ({
        marca: c.marca ?? null,
        modelo: (c.modelo ?? '').trim() || null,
      })),

      drogas: {
        maconha: this.normalizeDrugToGramsString(drogas.maconha),
        cocaina: this.normalizeDrugToGramsString(drogas.cocaina),
        crack: this.normalizeDrugToGramsString(drogas.crack),
        haxixe: this.normalizeDrugToGramsString(drogas.haxixe),
        skank: this.normalizeDrugToGramsString(drogas.skank),

        lancaPerfume: (drogas.lancaPerfume ?? '').toString().trim() || null,
        lsd: (drogas.lsd ?? '').toString().trim() || null,
        ecstasy: (drogas.ecstasy ?? '').toString().trim() || null,
        cigarro: (drogas.cigarro ?? '').toString().trim() || null,
        outrasDrogas: (drogas.outrasDrogas ?? '').toString().trim() || null,
        explosivos: (drogas.explosivos ?? '').toString().trim() || null,
        peDeMaconha: (drogas.peDeMaconha ?? '').toString().trim() || null,
      } as any,

      veiculos: {
        carro: raw.veiculos?.carro || null,
        moto: raw.veiculos?.moto || null,
        caminhao: raw.veiculos?.caminhao || null,
        camionete: raw.veiculos?.camionete || null,
      },

      valores: this.normalizeMoneyToDecimalString(raw.valores),
      outros: raw.outros || null,
      sintese: raw.sintese || null,
    };
  }

  private bopmPrefixDigits(raw: string): string {
    const left = String(raw ?? '').split('/')[0];
    return this.onlyDigits(left).slice(0, 10);
  }

  private bopcPrefixAlnum(raw: string): string {
    const left = String(raw ?? '').split('/')[0];
    return left.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  }

  private normalizeBopDisplay(raw: string, yy: string): string {
    const digits = this.bopmPrefixDigits(raw);
    if (!digits) return '';
    return `${digits}/${yy}`;
  }

  private normalizeBopcDisplay(raw: string, yy: string): string {
    const prefix = this.bopcPrefixAlnum(raw);
    if (!prefix) return '';
    return `${prefix}/${yy}`;
  }

  private getYearSuffixFromRawDate(d: Date | null): string | null {
    if (!d) return null;
    return String(d.getFullYear()).slice(-2);
  }

  private getYearSuffixFromIso(iso: any): string | null {
    const s = String(iso ?? '').trim();
    const m = s.match(/^(\d{4})/);
    if (!m) return null;
    return m[1].slice(-2);
  }

  getYearSuffix(): string {
    const d = this.form.controls.data.value;
    if (!d) return '00';
    return String(d.getFullYear()).slice(-2);
  }

  private getBopInputEl(key: BopKey): HTMLInputElement | null {
    if (key === 'bopm') return this.bopmEl?.nativeElement ?? null;
    return this.bopcEl?.nativeElement ?? null;
  }

  private setCaretAtPrefixEnd(key: BopKey, prefixLen: number): void {
    const el = this.getBopInputEl(key);
    if (!el) return;
    const pos = Math.max(0, prefixLen);
    queueMicrotask(() => {
      try {
        el.setSelectionRange(pos, pos);
      } catch {
        //
      }
    });
  }

  refreshBopDisplay(key: BopKey): void {
    const yy = this.getYearSuffix();
    const current = String(this.form.controls[key].value ?? '');

    if (key === 'bopm') {
      const digits = this.bopmPrefixDigits(current);
      const next = digits ? `${digits}/${yy}` : '';
      this.form.controls[key].setValue(next, { emitEvent: false });
      this.setCaretAtPrefixEnd(key, digits.length);
      return;
    }

    const prefix = this.bopcPrefixAlnum(current);
    const next = prefix ? `${prefix}/${yy}` : '';
    this.form.controls[key].setValue(next, { emitEvent: false });
    this.setCaretAtPrefixEnd(key, prefix.length);
  }

  onBopKeydown(ev: KeyboardEvent): void {
    if (ev.key === '/') ev.preventDefault();
  }

  onBopInput(key: BopKey): void {
    const yy = this.getYearSuffix();
    const current = String(this.form.controls[key].value ?? '');

    if (key === 'bopm') {
      const digits = this.bopmPrefixDigits(current);
      const next = digits ? `${digits}/${yy}` : '';
      this.form.controls[key].setValue(next, { emitEvent: false });
      this.setCaretAtPrefixEnd(key, digits.length);
      return;
    }

    const prefix = this.bopcPrefixAlnum(current);
    const next = prefix ? `${prefix}/${yy}` : '';
    this.form.controls[key].setValue(next, { emitEvent: false });
    this.setCaretAtPrefixEnd(key, prefix.length);
  }

  private async checkBopmDuplicate(): Promise<void> {
    const date = this.form.controls.data.value;
    const bopm = String(this.form.controls.bopm.value ?? '').trim();

    if (!bopm) {
      this.bopmDuplicate.set(false);
      this.setControlError(this.form.controls.bopm, 'duplicateBopm', false);
      return;
    }

    if (!date) return;

    this.refreshBopDisplay('bopm');

    const normalized = String(this.form.controls.bopm.value ?? '').trim();
    const digits = this.bopmPrefixDigits(normalized);
    const yy = this.getYearSuffixFromRawDate(date) ?? this.getYearSuffix();
    const finalBopm = digits ? `${digits}/${yy}` : '';

    if (!finalBopm) return;

    const dateIso = this.toIsoDateOnly(date);
    const excludeId = this.recordId();

    const existsFn = (this.api as any)?.existsBopm;
    if (typeof existsFn !== 'function') {
      this.bopmDuplicate.set(false);
      this.setControlError(this.form.controls.bopm, 'duplicateBopm', false);
      return;
    }

    this.bopmChecking.set(true);
    try {
      const res = existsFn.call(this.api, dateIso, finalBopm, excludeId);
      const exists =
        typeof res?.subscribe === 'function'
          ? await firstValueFrom(res)
          : await Promise.resolve(res);

      const isDup = !!(exists?.exists ?? exists === true);

      this.bopmDuplicate.set(isDup);
      this.setControlError(this.form.controls.bopm, 'duplicateBopm', isDup);

      if (isDup) this.form.controls.bopm.markAsTouched();
    } catch (e) {
      console.error('Falha ao checar duplicidade do BOPM', e);
      this.bopmDuplicate.set(false);
      this.setControlError(this.form.controls.bopm, 'duplicateBopm', false);
    } finally {
      this.bopmChecking.set(false);
    }
  }

  private setControlError(ctrl: AbstractControl, key: string, on: boolean): void {
    const errs = { ...(ctrl.errors ?? {}) } as any;
    if (on) errs[key] = true;
    else delete errs[key];
    ctrl.setErrors(Object.keys(errs).length ? errs : null);
  }

  private bindDrugWeightMasking(): void {
    const drogasGroup = this.form.get('drogas') as FormGroup | null;
    if (!drogasGroup) return;

    const keys: DrugWeightKey[] = ['maconha', 'cocaina', 'crack', 'haxixe', 'skank'];

    keys.forEach((k) => {
      const ctrl = drogasGroup.get(k);
      if (!ctrl) return;

      this.subs.add(
        ctrl.valueChanges
          .pipe(debounceTime(450), distinctUntilChanged())
          .subscribe((v) => {
            const next = this.formatGramsToHumanFromInput(v);
            if (next !== String(v ?? '')) ctrl.setValue(next, { emitEvent: false });
          })
      );
    });
  }

  private applyDrugWeightVisualAll(): void {
    const drogasGroup = this.form.get('drogas') as FormGroup | null;
    if (!drogasGroup) return;

    const keys: DrugWeightKey[] = ['maconha', 'cocaina', 'crack', 'haxixe', 'skank'];

    keys.forEach((k) => {
      const ctrl = drogasGroup.get(k);
      if (!ctrl) return;
      const next = this.formatGramsToHumanFromInput(ctrl.value);
      ctrl.setValue(next, { emitEvent: false });
    });
  }

  private formatGramsToHumanFromInput(input: any): string {
    const raw = String(input ?? '').trim();
    if (!raw) return '';

    const lower = raw.toLowerCase();

    if (lower.includes('kg') || lower.includes(' t') || lower.endsWith('g')) {
      const gramsFromUnit = this.normalizeDrugToGramsString(raw);
      if (!gramsFromUnit) return '';
      const grams = Number(gramsFromUnit);
      if (!Number.isFinite(grams) || grams <= 0) return '';
      return this.formatGramsToHuman(grams);
    }

    const digits = raw.replace(/\D+/g, '');
    if (!digits) return '';

    const grams = Number(digits);
    if (!Number.isFinite(grams) || grams <= 0) return '';

    return this.formatGramsToHuman(grams);
  }

  private formatGramsToHuman(grams: number): string {
    if (grams >= 1_000_000) {
      const t = grams / 1_000_000;
      return `${this.formatFixed3PtBr(t)} t`;
    }
    if (grams >= 1000) {
      const kg = grams / 1000;
      return `${this.formatFixed3PtBr(kg)} kg`;
    }
    return `${Math.trunc(grams)} g`;
  }

  private formatFixed3PtBr(n: number): string {
    const fixed = n.toFixed(3);
    const [intPart, decPart] = fixed.split('.');
    const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${withThousands},${decPart}`;
  }

  private parseFlexibleNumber(raw: string): number | null {
    const s0 = String(raw ?? '').trim();
    if (!s0) return null;

    let s = s0.replace(/[^0-9.,-]/g, '');
    if (!s) return null;

    const negative = s.startsWith('-');
    s = s.replace(/-/g, '');
    if (!s) return null;

    const hasComma = s.includes(',');
    const hasDot = s.includes('.');

    if (!hasComma && !hasDot) {
      const n = Number(s);
      return Number.isFinite(n) ? (negative ? -n : n) : null;
    }

    if (hasComma && hasDot) {
      const lastComma = s.lastIndexOf(',');
      const lastDot = s.lastIndexOf('.');
      const decSep = lastComma > lastDot ? ',' : '.';
      const thouSep = decSep === ',' ? '.' : ',';

      const noThousands = s.split(thouSep).join('');
      const normalized = noThousands.replace(decSep, '.');

      const n = Number(normalized);
      return Number.isFinite(n) ? (negative ? -n : n) : null;
    }

    const sep = hasComma ? ',' : '.';
    const parts = s.split(sep);

    if (parts.length > 2) {
      const normalized = parts.join('');
      const n = Number(normalized);
      return Number.isFinite(n) ? (negative ? -n : n) : null;
    }

    const intPart = parts[0] ?? '';
    const fracPart = parts[1] ?? '';

    if (!fracPart) {
      const n = Number(intPart);
      return Number.isFinite(n) ? (negative ? -n : n) : null;
    }

    if (/^\d{1,3}$/.test(fracPart)) {
      const normalized = `${intPart}.${fracPart}`;
      const n = Number(normalized);
      return Number.isFinite(n) ? (negative ? -n : n) : null;
    }

    const normalized = `${intPart}${fracPart}`;
    const n = Number(normalized);
    return Number.isFinite(n) ? (negative ? -n : n) : null;
  }

  private normalizeDrugToGramsString(input: any): string | null {
    const raw = String(input ?? '').trim();
    if (!raw) return null;

    const lower = raw.toLowerCase();
    const num = this.parseFlexibleNumber(raw);

    if (num == null) {
      const digits = raw.replace(/\D+/g, '');
      const g = digits ? Number(digits) : NaN;
      if (!Number.isFinite(g) || g <= 0) return null;
      return String(Math.round(g));
    }

    let grams: number;
    if (lower.includes(' t')) grams = num * 1_000_000;
    else if (lower.includes('kg')) grams = num * 1000;
    else grams = num;

    const out = Math.round(grams);
    return out > 0 ? String(out) : null;
  }

  private formatMoneyBrFromInput(input: any): string {
    const raw = String(input ?? '').trim();
    if (!raw) return '';

    const n = this.parseMoneyBrToNumber(raw);
    if (n == null) return '';

    return this.formatBrl(n);
  }

  private parseMoneyBrToNumber(raw: string): number | null {
    const s0 = String(raw ?? '').trim();
    if (!s0) return null;

    const hasSep = s0.includes(',') || s0.includes('.');
    if (hasSep) {
      const n = this.parseFlexibleNumber(s0);
      return n == null ? null : n;
    }

    const digits = s0.replace(/\D+/g, '');
    if (!digits) return null;

    const cents = Number(digits);
    if (!Number.isFinite(cents)) return null;

    return cents / 100;
  }

  private formatBrl(n: number): string {
    const fixed = n.toFixed(2);
    const [intPart, decPart] = fixed.split('.');
    const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `R$ ${withThousands},${decPart}`;
  }

  private normalizeMoneyToDecimalString(input: any): string | null {
    const raw = String(input ?? '').trim();
    if (!raw) return null;

    const n = this.parseMoneyBrToNumber(raw);
    if (n == null) return null;

    return n.toFixed(2);
  }

  private onlyDigits(v: string | null | undefined): string {
    return String(v ?? '').replace(/\D+/g, '');
  }

  formatCpfUi(raw: string): string {
    const d = this.onlyDigits(raw).slice(0, 11);
    const p1 = d.slice(0, 3);
    const p2 = d.slice(3, 6);
    const p3 = d.slice(6, 9);
    const p4 = d.slice(9, 11);
    let out = p1;
    if (p2) out += '.' + p2;
    if (p3) out += '.' + p3;
    if (p4) out += '-' + p4;
    return out;
  }

  onCpfInput(index: number): void {
    const fg = this.qualificacoesFA.at(index) as FormGroup;
    const current = String(fg.get('cpf')?.value ?? '');
    fg.get('cpf')?.setValue(this.formatCpfUi(current), { emitEvent: false });
  }

  private parseIsoDateOnlyToDate(iso: string | null | undefined): Date | null {
    if (!iso) return null;
    const m = String(iso).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) {
      const dt = new Date(String(iso));
      return isNaN(dt.getTime()) ? null : dt;
    }

    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);

    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
      return null;
    }

    return new Date(y, mo - 1, d);
  }

  private toIsoDateOnly(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}