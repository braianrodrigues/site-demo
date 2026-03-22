// src/app/features/alvos/alvos-create.component.ts
import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';

// Angular Material (standalone)
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  AlvosApiService,
  AlvoResponseDTO,
  FotoInfoDTO,
  EnderecoDTO,
  VeiculoDTO,
  ComparsaDTO,
  TelefoneDTO,
  RedeSocialDTO,
  FamiliaDTO,
} from './alvos-api.service';

import { ToastService } from '../../shared/ui/toast/toast.service';

type Corr = {
  tipo: string;
  chave: string;
  score: number;
  outroAlvoId?: number;
  outroAlvoNome?: string;
  outroAlvoVulgo?: string;
  detalhe?: string;
};

type FotoItem = {
  kind: 'remote' | 'local';
  url: string;
  remoteId?: number;
  file?: File;
};

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

@Component({
  selector: 'app-alvos-create',
  standalone: true,
  templateUrl: './alvos-create.component.html',
  styleUrls: ['./alvos-create.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatCardModule,
    MatIconModule,
    MatDividerModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
})
export class AlvosCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AlvosApiService);
  private readonly toast = inject(ToastService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  tabIndex = 0;
  readonlyMode = false;

  salvando = signal(false);
  carregando = signal(false);

  alvoId: number | null = null;

  situacoes: string[] = ['ATIVO', 'INATIVO', 'DESCONHECIDO'];
  operacoes: string[] = ['—'];
  tiposAlvo: string[] = ['—'];
  faccoes: string[] = ['—'];

  ufs: string[] = [
    'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB',
    'PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'
  ];

  selectedEnderecoIndex: number | null = 0;
  cepLoadingIndex: number | null = null;

  mapsEmbedSafeUrl: SafeResourceUrl = this.buildMapsEmbedUrl('Brasil');
  mapsOpenUrl: string = this.buildMapsOpenUrl('Brasil');

  correlacoes = signal<Corr[]>([]);
  correlacoesLoading = signal(false);
  correlacoesError = signal<string>('');

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  readonly ACCEPT = 'image/jpeg,image/png,image/webp';
  readonly MAX_MB = 8;
  readonly MAX_FOTOS = 12;

  fotos: FotoItem[] = [];
  currentFoto = 0;

  form: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    vulgo: [''],
    matricula: [''],
    situacao: [''],
    operacao: [''],
    tipoAlvo: [''],
    faccao: [''],
    resumo: [''],

    nomePai: [''],
    nomeMae: [''],
    dataNascimento: [''],
    cpf: ['', [Validators.required, Validators.pattern(/^\d{3}\.\d{3}\.\d{3}\-\d{2}$/)]],
    rg: [''],

    enderecos: this.fb.array([this.createEnderecoGroup()]),
    veiculos: this.fb.array([]),
    comparsas: this.fb.array([]),
    telefones: this.fb.array([]),

    familiares: this.fb.array([]),
    redesSociais: this.fb.array([]),
  });

  get f(): Record<string, AbstractControl> {
    return this.form.controls as any;
  }

  get enderecos(): FormArray<FormGroup> {
    return this.form.get('enderecos') as FormArray<FormGroup>;
  }
  get veiculos(): FormArray<FormGroup> {
    return this.form.get('veiculos') as FormArray<FormGroup>;
  }
  get comparsas(): FormArray<FormGroup> {
    return this.form.get('comparsas') as FormArray<FormGroup>;
  }
  get telefones(): FormArray<FormGroup> {
    return this.form.get('telefones') as FormArray<FormGroup>;
  }
  get familiares(): FormArray<FormGroup> {
    return this.form.get('familiares') as FormArray<FormGroup>;
  }
  get redesSociais(): FormArray<FormGroup> {
    return this.form.get('redesSociais') as FormArray<FormGroup>;
  }

  constructor() {
    this.readonlyMode = !!this.route.snapshot.data?.['readonly'];

    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : NaN;
    if (!Number.isNaN(id) && id > 0) {
      this.alvoId = id;
      void this.loadAlvo(id);
    }

    if (this.readonlyMode) {
      this.form.disable({ emitEvent: false });
    }
  }

  // TRACKBYS
  trackByIndex = (i: number) => i;
  trackByFoto = (_: number, item: FotoItem) => item.url;
  trackByCorr = (_: number, c: Corr) => `${c.tipo}-${c.chave}-${c.outroAlvoId ?? ''}`;

  onTabChange(index: number): void {
    this.tabIndex = index;

    if (index === 2) {
      queueMicrotask(() => {
        this.ensureEnderecoIndexSelected();
        this.updateMaps();
        this.cdr.detectChanges();
      });
    }
  }

  // =========================================================
  // LOAD
  // =========================================================
  private async loadAlvo(id: number): Promise<void> {
    this.carregando.set(true);
    try {
      const dto = await firstValueFrom(this.api.get(id));
      this.bindDtoToForm(dto);
      this.bindFotos(dto.fotos ?? [], id);

      queueMicrotask(() => {
        this.ensureEnderecoIndexSelected();
        this.updateMaps();
        this.cdr.detectChanges();
      });
    } catch {
      this.toast.error('Erro ao carregar alvo.');
    } finally {
      this.carregando.set(false);
    }
  }

  // =========================================================
  //  FIX: reconstruir FormArrays via setControl()
  // =========================================================
  private bindDtoToForm(dto: AlvoResponseDTO): void {
    // ----- Endereços -----
    const enderecos = (dto.enderecos?.length ? dto.enderecos : [this.emptyEndereco()]) as EnderecoDTO[];

    const endArray = this.fb.array(
      enderecos.map((e) =>
        this.fb.group({
          cep: [this.maskCep(e.cep ?? ''), [Validators.pattern(/^\d{5}\-?\d{3}$/)]],
          logradouro: [e.logradouro ?? ''],
          numero: [e.numero ?? ''],
          complemento: [e.complemento ?? ''],
          bairro: [e.bairro ?? ''],
          estado: [e.estado ?? ''],
          cidade: [e.cidade ?? ''],
        })
      )
    );
    this.form.setControl('enderecos', endArray);

    // ----- Veículos -----
    const veiculos = (dto.veiculos ?? []) as VeiculoDTO[];
    const veiArray = this.fb.array(
      veiculos.map((v) =>
        this.fb.group({
          placa: [v.placa ?? ''],
          marcaModelo: [v.marcaModelo ?? ''],
          cor: [v.cor ?? ''],
          ano: [v.ano ?? ''],
        })
      )
    );
    this.form.setControl('veiculos', veiArray);

    // ----- Comparsas -----
    const comparsas = (dto.comparsas ?? []) as ComparsaDTO[];
    const comArray = this.fb.array(
      comparsas.map((c) =>
        this.fb.group({
          nome: [c.nome ?? ''],
          cpf: [c.cpf ? this.maskCpf(c.cpf) : '', [Validators.pattern(/^\d{3}\.\d{3}\.\d{3}\-\d{2}$/)]],
        })
      )
    );
    this.form.setControl('comparsas', comArray);

    // ----- Telefones -----
    const telefones = (dto.telefones ?? []) as TelefoneDTO[];
    const telArray = this.fb.array(
      telefones.map((t) =>
        this.fb.group({
          numero: [t.numero ?? ''],
          tipo: [t.tipo ?? 'Celular'],
        })
      )
    );
    this.form.setControl('telefones', telArray);

    // ----- Familiares -----
    const familiares = (dto.familiares ?? []) as FamiliaDTO[];
    const famArray = this.fb.array(
      familiares.map((f) =>
        this.fb.group({
          parentesco: [f.parentesco ?? '', [Validators.required]],
          nome: [f.nome ?? '', [Validators.required]],
          cpf: [f.cpf ? this.maskCpf(f.cpf) : ''],
          telefone: [f.telefone ?? ''],
          observacao: [f.observacao ?? ''],
          alvoRelacionadoId: [f.alvoRelacionadoId ?? null],
          alvoRelacionadoNome: [f.alvoRelacionadoNome ?? null],
        })
      )
    );
    this.form.setControl('familiares', famArray);

    // ----- Redes Sociais -----
    const redes = (dto.redesSociais ?? []) as RedeSocialDTO[];
    const redArray = this.fb.array(
      redes.map((r) =>
        this.fb.group({
          plataforma: [r.plataforma ?? '', [Validators.required]],
          username: [r.username ?? ''],
          url: [r.url ?? ''],
          observacao: [r.observacao ?? ''],
        })
      )
    );
    this.form.setControl('redesSociais', redArray);

    // ----- Patch raiz -----
    this.form.patchValue(
      {
        nome: dto.nome ?? '',
        vulgo: dto.vulgo ?? '',
        matricula: dto.matricula ?? '',
        situacao: dto.situacao ?? '',
        operacao: dto.operacao ?? '',
        tipoAlvo: dto.tipoAlvo ?? '',
        faccao: dto.faccao ?? '',
        resumo: dto.resumo ?? '',

        nomePai: dto.nomePai ?? '',
        nomeMae: dto.nomeMae ?? '',
        dataNascimento: this.isoToBr(dto.dataNascimento),
        cpf: this.maskCpf(dto.cpf ?? ''),
        rg: dto.rg ?? '',
      },
      { emitEvent: false }
    );

    if (this.readonlyMode) {
      this.form.disable({ emitEvent: false });
    }

    this.form.updateValueAndValidity({ emitEvent: false });
    this.cdr.detectChanges();
  }

  private bindFotos(fotos: FotoInfoDTO[], alvoId: number): void {
    this.fotos = (fotos ?? []).map((f) => ({
      kind: 'remote',
      remoteId: f.id,
      url: this.api.fotoUrl(alvoId, f.id, Date.now()),
    }));
    this.currentFoto = 0;
  }

  // =========================================================
  // TEMPLATE: openAlvo
  // =========================================================
  openAlvo(alvoId?: number | null): void {
    if (!alvoId || alvoId <= 0) return;

    const returnUrl = this.router.url;
    const path = this.readonlyMode ? `/alvos/${alvoId}/visualizar` : `/alvos/${alvoId}/editar`;
    void this.router.navigate([path], { queryParams: { returnUrl } });
  }

  // =========================================================
  //  FOTOS
  // =========================================================
  removerFotoAtual(): void {
    if (this.readonlyMode) return;
    if (!this.fotos.length) return;

    const item = this.fotos[this.currentFoto];

    if (item.kind === 'local') {
      try { URL.revokeObjectURL(item.url); } catch {}
      this.fotos.splice(this.currentFoto, 1);
      if (this.currentFoto >= this.fotos.length) {
        this.currentFoto = Math.max(0, this.fotos.length - 1);
      }
      this.cdr.detectChanges();
      return;
    }

    if (!this.alvoId || !item.remoteId) {
      this.toast.warn('Não foi possível remover esta foto.');
      return;
    }

    void (async () => {
      this.salvando.set(true);
      try {
        await firstValueFrom(this.api.deleteFoto(this.alvoId!, item.remoteId!));
        this.fotos.splice(this.currentFoto, 1);
        if (this.currentFoto >= this.fotos.length) {
          this.currentFoto = Math.max(0, this.fotos.length - 1);
        }
        this.toast.success('Foto removida.');
      } catch {
        this.toast.error('Erro ao remover foto.');
      } finally {
        this.salvando.set(false);
        this.cdr.detectChanges();
      }
    })();
  }

  limparTodas(): void {
    if (this.readonlyMode) return;
    if (!this.fotos.length) return;

    for (const f of this.fotos) {
      if (f.kind === 'local') {
        try { URL.revokeObjectURL(f.url); } catch {}
      }
    }

    const remotas = this.fotos.filter((f) => f.kind === 'remote' && !!f.remoteId);

    if (!remotas.length || !this.alvoId) {
      this.fotos = [];
      this.currentFoto = 0;
      this.cdr.detectChanges();
      return;
    }

    void (async () => {
      this.salvando.set(true);
      try {
        for (const r of remotas) {
          await firstValueFrom(this.api.deleteFoto(this.alvoId!, r.remoteId!));
        }
        this.toast.success('Fotos removidas.');
        this.fotos = [];
        this.currentFoto = 0;
      } catch {
        this.toast.error('Erro ao remover todas as fotos.');
      } finally {
        this.salvando.set(false);
        this.cdr.detectChanges();
      }
    })();
  }

  abrirSeletorArquivo(): void {
    if (this.readonlyMode) return;
    this.fileInput?.nativeElement?.click();
  }

  onFotosChange(ev: Event): void {
    if (this.readonlyMode) return;

    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';

    if (!files.length) return;

    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);

    for (const f of files) {
      if (this.fotos.length >= this.MAX_FOTOS) {
        this.toast.warn(`Máximo de ${this.MAX_FOTOS} fotos.`);
        break;
      }
      if (!allowed.has(f.type)) {
        this.toast.warn(`Formato inválido: ${f.name}`);
        continue;
      }
      const mb = f.size / (1024 * 1024);
      if (mb > this.MAX_MB) {
        this.toast.warn(`Arquivo muito grande (>${this.MAX_MB}MB): ${f.name}`);
        continue;
      }

      const url = URL.createObjectURL(f);
      this.fotos.push({ kind: 'local', url, file: f });
    }

    if (this.currentFoto >= this.fotos.length) {
      this.currentFoto = Math.max(0, this.fotos.length - 1);
    }
    this.cdr.detectChanges();
  }

  prevFoto(): void {
    if (this.fotos.length <= 1) return;
    this.currentFoto = (this.currentFoto - 1 + this.fotos.length) % this.fotos.length;
  }

  nextFoto(): void {
    if (this.fotos.length <= 1) return;
    this.currentFoto = (this.currentFoto + 1) % this.fotos.length;
  }

  goFoto(i: number): void {
    if (i < 0 || i >= this.fotos.length) return;
    this.currentFoto = i;
  }

  // =========================================================
  // VEÍCULOS
  // =========================================================
  onPlacaInput(i: number, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const masked = this.maskPlaca(input.value ?? '');
    this.veiculos.at(i).get('placa')?.setValue(masked, { emitEvent: false });
  }

  private maskPlaca(v: string): string {
    const raw = (v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    if (raw.length <= 3) return raw;

    const isOld = raw.length >= 7 && /^[A-Z]{3}\d{4}$/.test(raw);
    if (isOld) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
    return raw;
  }

  // =========================================================
  // FAMÍLIA
  // =========================================================
  addFamiliar(): void {
    if (this.readonlyMode) return;
    this.familiares.push(
      this.fb.group({
        parentesco: ['', [Validators.required]],
        nome: ['', [Validators.required]],
        cpf: [''],
        telefone: [''],
        observacao: [''],
        alvoRelacionadoId: [null],
        alvoRelacionadoNome: [null],
      })
    );
  }

  removeFamiliar(i: number): void {
    if (this.readonlyMode) return;
    this.familiares.removeAt(i);
  }

  onCpfInputFamiliar(i: number, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const masked = this.maskCpf(input.value ?? '');
    this.familiares.at(i).get('cpf')?.setValue(masked, { emitEvent: false });
  }

  // =========================================================
  // REDE SOCIAL
  // =========================================================
  addRedeSocial(): void {
    if (this.readonlyMode) return;
    this.redesSociais.push(
      this.fb.group({
        plataforma: ['', [Validators.required]],
        username: [''],
        url: [''],
        observacao: [''],
      })
    );
  }

  removeRedeSocial(i: number): void {
    if (this.readonlyMode) return;
    this.redesSociais.removeAt(i);
  }

  // =========================================================
  // MAPS
  // =========================================================
  selectEndereco(i: number): void {
    this.selectedEnderecoIndex = i;
    this.updateMaps();
  }

  openMaps(): void {
    if (!this.mapsOpenUrl) return;
    window.open(this.mapsOpenUrl, '_blank', 'noopener,noreferrer');
  }

  updateMaps(): void {
    this.ensureEnderecoIndexSelected();

    const i = this.selectedEnderecoIndex ?? 0;
    const g = this.enderecos.at(i);

    const logradouro = (g.get('logradouro')?.value ?? '').toString().trim();
    const numero = (g.get('numero')?.value ?? '').toString().trim();
    const bairro = (g.get('bairro')?.value ?? '').toString().trim();
    const cidade = (g.get('cidade')?.value ?? '').toString().trim();
    const estado = (g.get('estado')?.value ?? '').toString().trim();
    const cep = (g.get('cep')?.value ?? '').toString().trim();

    const parts: string[] = [];
    if (logradouro) parts.push(logradouro);
    if (numero) parts.push(numero);
    if (bairro) parts.push(bairro);
    if (cidade) parts.push(cidade);
    if (estado) parts.push(estado);
    if (!parts.length && cep) parts.push(cep);

    const query = parts.length ? parts.join(', ') : 'Brasil';

    this.mapsEmbedSafeUrl = this.buildMapsEmbedUrl(query);
    this.mapsOpenUrl = this.buildMapsOpenUrl(query);
    this.cdr.detectChanges();
  }

  private buildMapsEmbedUrl(query: string): SafeResourceUrl {
    const url = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private buildMapsOpenUrl(query: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  private ensureEnderecoIndexSelected(): void {
    if (this.selectedEnderecoIndex === null || this.selectedEnderecoIndex === undefined) {
      this.selectedEnderecoIndex = 0;
    }
    if (this.enderecos.length === 0) {
      this.form.setControl('enderecos', this.fb.array([this.createEnderecoGroup()]));
      this.selectedEnderecoIndex = 0;
    }
    if ((this.selectedEnderecoIndex ?? 0) >= this.enderecos.length) {
      this.selectedEnderecoIndex = 0;
    }
  }

  // =========================================================
  // CEP (ViaCEP)
  // =========================================================
  onCepInput(i: number, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const raw = (input.value ?? '').replace(/\D/g, '').slice(0, 8);
    const masked = this.maskCep(raw);

    this.enderecos.at(i).get('cep')?.setValue(masked, { emitEvent: false });
    this.selectedEnderecoIndex = i;

    if (raw.length === 8) {
      void this.buscarCep(i);
    } else {
      this.updateMaps();
    }
  }

  async buscarCep(i: number): Promise<void> {
    this.selectedEnderecoIndex = i;

    const g = this.enderecos.at(i);
    const cepMasked = (g.get('cep')?.value ?? '').toString();
    const cep = cepMasked.replace(/\D/g, '');

    if (cep.length !== 8) {
      this.updateMaps();
      return;
    }

    this.cepLoadingIndex = i;
    this.cdr.detectChanges();

    try {
      const data = await firstValueFrom(
        this.http.get<ViaCepResponse>(`https://viacep.com.br/ws/${cep}/json/`)
      );

      if (!data || data.erro) {
        this.updateMaps();
        return;
      }

      this.zone.run(() => {
        g.patchValue(
          {
            logradouro: data.logradouro ?? '',
            complemento: data.complemento ?? '',
            bairro: data.bairro ?? '',
            cidade: data.localidade ?? '',
            estado: data.uf ?? '',
          },
          { emitEvent: false }
        );

        g.updateValueAndValidity({ emitEvent: false });
        this.updateMaps();
        this.cdr.detectChanges();
      });
    } catch {
      this.updateMaps();
    } finally {
      this.cepLoadingIndex = null;
      this.cdr.detectChanges();
    }
  }

  // =========================================================
  // CRUD ARRAYS
  // =========================================================
  private createEnderecoGroup(): FormGroup {
    return this.fb.group({
      cep: ['', [Validators.pattern(/^\d{5}\-?\d{3}$/)]],
      logradouro: [''],
      numero: [''],
      complemento: [''],
      bairro: [''],
      estado: [''],
      cidade: [''],
    });
  }

  addEndereco(): void {
    const arr = this.enderecos;
    arr.push(this.createEnderecoGroup());
    this.selectedEnderecoIndex = arr.length - 1;
    this.updateMaps();
  }

  removeEndereco(i: number): void {
    if (this.enderecos.length <= 1) return;
    this.enderecos.removeAt(i);
    if ((this.selectedEnderecoIndex ?? 0) >= this.enderecos.length) {
      this.selectedEnderecoIndex = this.enderecos.length - 1;
    }
    this.updateMaps();
  }

  addVeiculo(): void {
    this.veiculos.push(
      this.fb.group({
        placa: [''],
        marcaModelo: [''],
        cor: [''],
        ano: [''],
      })
    );
  }

  removeVeiculo(i: number): void {
    this.veiculos.removeAt(i);
  }

  addComparsa(): void {
    this.comparsas.push(
      this.fb.group({
        nome: [''],
        cpf: ['', [Validators.pattern(/^\d{3}\.\d{3}\.\d{3}\-\d{2}$/)]],
      })
    );
  }

  removeComparsa(i: number): void {
    this.comparsas.removeAt(i);
  }

  onCpfInputComparsa(i: number, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const masked = this.maskCpf(input.value ?? '');
    this.comparsas.at(i).get('cpf')?.setValue(masked, { emitEvent: false });
  }

  addTelefone(): void {
    this.telefones.push(
      this.fb.group({
        numero: [''],
        tipo: ['Celular'],
      })
    );
  }

  removeTelefone(i: number): void {
    this.telefones.removeAt(i);
  }

  // =========================================================
  // MASKS / HELPERS
  // =========================================================
  onDataNascInput(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const raw = (input.value ?? '').replace(/\D/g, '').slice(0, 8);

    let out = raw;
    if (raw.length > 2) out = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    if (raw.length > 4) out = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`;

    this.form.get('dataNascimento')?.setValue(out, { emitEvent: false });
  }

  onCpfInputPrincipal(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const masked = this.maskCpf(input.value ?? '');
    this.form.get('cpf')?.setValue(masked, { emitEvent: false });
    void this.checkCpfDuplicado();
  }

  private maskCpf(value: string): string {
    const d = (value ?? '').replace(/\D/g, '').slice(0, 11);
    let out = d;
    if (d.length > 3) out = `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length > 6) out = `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    if (d.length > 9) out = `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
    return out;
  }

  private maskCep(value: string): string {
    const raw = (value ?? '').replace(/\D/g, '').slice(0, 8);
    if (raw.length <= 5) return raw;
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  }

  private isoToBr(iso?: string | null): string {
    if (!iso) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return iso;
    return `${m[3]}/${m[2]}/${m[1]}`;
  }

  private brToIso(br?: string | null): string | null {
    const v = (br ?? '').trim();
    if (!v) return null;

    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

    return null;
  }

  private emptyEndereco(): EnderecoDTO {
    return {
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      estado: '',
      cidade: '',
    };
  }

  private async checkCpfDuplicado(): Promise<void> {
    const ctrl = this.form.get('cpf');
    if (!ctrl) return;

    const digits = (ctrl.value ?? '').toString().replace(/\D/g, '');
    if (digits.length !== 11) {
      const errs = { ...(ctrl.errors ?? {}) };
      delete errs['cpfDuplicado'];
      ctrl.setErrors(Object.keys(errs).length ? errs : null);
      return;
    }

    try {
      const res = await firstValueFrom(this.api.checkCpf(digits, this.alvoId ?? undefined));
      const exists = !!res?.exists;

      const errs = { ...(ctrl.errors ?? {}) };
      if (exists) errs['cpfDuplicado'] = true;
      else delete errs['cpfDuplicado'];

      ctrl.setErrors(Object.keys(errs).length ? errs : null);
    } catch {}
  }

  // =========================================================
  // SAVE / NAV
  // =========================================================
  async salvar(): Promise<void> {
    if (this.readonlyMode) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warn('Corrija os campos obrigatórios.');
      return;
    }

    await this.checkCpfDuplicado();
    if (this.form.get('cpf')?.errors?.['cpfDuplicado']) {
      this.toast.warn('CPF já cadastrado.');
      return;
    }

    this.salvando.set(true);
    try {
      const fd = this.buildPayloadForBackend();

      if (this.alvoId) {
        await firstValueFrom(this.api.update(this.alvoId, fd));
        this.toast.success('Alvo atualizado com sucesso.');
      } else {
        const created = await firstValueFrom(this.api.create(fd));
        this.toast.success('Alvo cadastrado com sucesso.');
        this.alvoId = created.id;
      }

      await this.navigateBack();
    } catch {
      this.toast.error('Erro ao salvar alvo.');
    } finally {
      this.salvando.set(false);
    }
  }

  private buildPayloadForBackend(): FormData {
    const raw = this.form.getRawValue() as any;

    const data = {
      nome: (raw.nome ?? '').toString().trim(),
      vulgo: (raw.vulgo ?? '').toString().trim() || null,
      matricula: (raw.matricula ?? '').toString().trim() || null,
      situacao: (raw.situacao ?? '').toString().trim() || null,
      operacao: (raw.operacao ?? '').toString().trim() || null,
      tipoAlvo: (raw.tipoAlvo ?? '').toString().trim() || null,
      faccao: (raw.faccao ?? '').toString().trim() || null,
      resumo: (raw.resumo ?? '').toString().trim() || null,

      nomePai: (raw.nomePai ?? '').toString().trim() || null,
      nomeMae: (raw.nomeMae ?? '').toString().trim() || null,
      dataNascimento: this.brToIso(raw.dataNascimento) ?? null,
      cpf: (raw.cpf ?? '').toString(),
      rg: (raw.rg ?? '').toString().trim() || null,

      enderecos: (raw.enderecos ?? []).map((e: any) => ({
        cep: (e.cep ?? '').toString().trim() || null,
        logradouro: (e.logradouro ?? '').toString().trim() || null,
        numero: (e.numero ?? '').toString().trim() || null,
        complemento: (e.complemento ?? '').toString().trim() || null,
        bairro: (e.bairro ?? '').toString().trim() || null,
        estado: (e.estado ?? '').toString().trim() || null,
        cidade: (e.cidade ?? '').toString().trim() || null,
      })),

      veiculos: (raw.veiculos ?? []).map((v: any) => ({
        placa: (v.placa ?? '').toString().trim() || null,
        marcaModelo: (v.marcaModelo ?? '').toString().trim() || null,
        cor: (v.cor ?? '').toString().trim() || null,
        ano: (v.ano ?? '').toString().trim() || null,
      })),

      comparsas: (raw.comparsas ?? []).map((c: any) => ({
        nome: (c.nome ?? '').toString().trim() || null,
        cpf: (c.cpf ?? '').toString() || null,
      })),

      telefones: (raw.telefones ?? []).map((t: any) => ({
        numero: (t.numero ?? '').toString().trim() || null,
        tipo: (t.tipo ?? '').toString().trim() || null,
      })),

      familiares: (raw.familiares ?? []).map((f: any) => ({
        parentesco: (f.parentesco ?? '').toString().trim() || null,
        nome: (f.nome ?? '').toString().trim() || null,
        cpf: (f.cpf ?? '').toString() || null,
        telefone: (f.telefone ?? '').toString().trim() || null,
        observacao: (f.observacao ?? '').toString().trim() || null,
        alvoRelacionadoId: f.alvoRelacionadoId ?? null,
      })),

      redesSociais: (raw.redesSociais ?? []).map((r: any) => ({
        plataforma: (r.plataforma ?? '').toString().trim() || null,
        username: (r.username ?? '').toString().trim() || null,
        url: (r.url ?? '').toString().trim() || null,
        observacao: (r.observacao ?? '').toString().trim() || null,
      })),
    };

    const fd = new FormData();
    fd.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));

    const localFiles = this.fotos
      .filter((f) => f.kind === 'local' && !!f.file)
      .map((f) => f.file!) as File[];

    for (const file of localFiles) {
      fd.append('fotos', file, file.name);
    }

    return fd;
  }

  cancelar(): void {
    void this.navigateBack();
  }

  private async navigateBack(): Promise<void> {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl) {
      await this.router.navigateByUrl(returnUrl, { replaceUrl: true });
      return;
    }

    await this.router.navigate(['/alvos'], { replaceUrl: true });
  }
}