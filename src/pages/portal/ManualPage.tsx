import React from 'react';
import {
  BookOpen, MousePointer2, Hand, Square, Grid3X3, Circle, Layers,
  Armchair, Type, Undo2, Redo2, Copy, Trash2, ZoomIn, Image as ImageIcon,
  Download, MousePointerClick, Keyboard, Settings, Palette, Map as MapIcon,
  AlertCircle, Sparkles, Plus, Minus, Spline, Link2, Eye, Lock, Printer,
  Info, ListOrdered, Move, RotateCw, Wand2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

import overview from '@/assets/manual/01-overview.png';
import templates from '@/assets/manual/02-templates.png';
import configurarSetor from '@/assets/manual/03-configurar-setor.png';
import setorCriado from '@/assets/manual/04-setor-criado.png';
import setorSelecionado from '@/assets/manual/05-setor-selecionado.png';
import mobilia from '@/assets/manual/06-mobilia.png';
import templatesCompleto from '@/assets/manual/07-templates-completo.png';
import configAssentos from '@/assets/manual/08-config-assentos.png';
import previewConfirmar from '@/assets/manual/09-preview-confirmar.png';
import canvasComSetor from '@/assets/manual/10-canvas-com-setor.png';
import setorPropriedades from '@/assets/manual/11-setor-propriedades.png';
import geradorPasso1 from '@/assets/manual/12-gerador-passo1.png';
import geradorPasso2 from '@/assets/manual/13-gerador-passo2.png';
import mobiliaMesaConfig from '@/assets/manual/14-mobilia-mesa-config.png';
import mesaPreviewInterativo from '@/assets/manual/15-mesa-preview-interativo.png';
import exportJson from '@/assets/manual/16-export-json.png';

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="px-2 py-0.5 text-xs font-mono bg-muted border border-border rounded shadow-sm print:bg-transparent print:border-foreground/40">
    {children}
  </kbd>
);

const Shortcut: React.FC<{ keys: string[]; description: string }> = ({ keys, description }) => (
  <div className="flex items-center justify-between gap-3 py-1.5 px-3 rounded bg-muted/40 print:bg-transparent print:border-b print:border-border print:px-0 print:rounded-none">
    <span className="text-sm">{description}</span>
    <div className="flex items-center gap-1 flex-shrink-0">
      {keys.map((k, i) => (
        <React.Fragment key={i}>
          <Kbd>{k}</Kbd>
          {i < keys.length - 1 && <span className="text-muted-foreground text-xs">+</span>}
        </React.Fragment>
      ))}
    </div>
  </div>
);

const Figure: React.FC<{ src: string; caption: string; size?: 'sm' | 'md' | 'lg' }> = ({ src, caption, size = 'md' }) => {
  const maxW = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-full' : 'max-w-2xl';
  return (
    <figure className={`my-4 mx-auto rounded-lg overflow-hidden border border-border bg-card ${maxW} print:break-inside-avoid`}>
      <img src={src} alt={caption} className="w-full h-auto" loading="lazy" />
      <figcaption className="px-4 py-2 text-xs text-muted-foreground border-t border-border bg-muted/30 print:bg-transparent">
        {caption}
      </figcaption>
    </figure>
  );
};

const ToolItem: React.FC<{
  icon: React.ReactNode;
  name: string;
  shortcut?: string;
  children: React.ReactNode;
}> = ({ icon, name, shortcut, children }) => (
  <div className="flex gap-3 py-3 border-b border-border last:border-0 print:break-inside-avoid">
    <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 print:bg-transparent print:border print:border-primary">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <h4 className="font-semibold text-sm">{name}</h4>
        {shortcut && <Kbd>{shortcut}</Kbd>}
      </div>
      <p className="text-sm text-muted-foreground mt-0.5">{children}</p>
    </div>
  </div>
);

const Section: React.FC<{
  id: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ id, icon, title, children }) => (
  <section id={id} className="scroll-mt-20 print:break-before-page">
    <Card className="print:shadow-none print:border-0">
      <CardHeader className="print:px-0">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <span className="text-primary">{icon}</span> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 print:px-0">{children}</CardContent>
    </Card>
  </section>
);

const Tip: React.FC<{ children: React.ReactNode; type?: 'info' | 'warn' }> = ({ children, type = 'info' }) => (
  <div className={`my-3 rounded-lg border p-3 flex gap-2 text-sm ${
    type === 'warn'
      ? 'border-destructive/30 bg-destructive/5'
      : 'border-primary/30 bg-primary/5'
  } print:bg-transparent`}>
    {type === 'warn'
      ? <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
      : <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />}
    <div className="flex-1">{children}</div>
  </div>
);

const ManualPage: React.FC = () => {
  const handlePrint = () => window.print();

  return (
    <div className="bg-background min-h-screen print:bg-white">
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          body { background: white !important; }
          .no-print { display: none !important; }
          h1, h2, h3, h4 { color: black !important; page-break-after: avoid; }
          section { page-break-inside: auto; }
          a { color: inherit !important; text-decoration: none !important; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto p-6 lg:p-10 space-y-8 print:p-0 print:space-y-4">
        {/* Cabeçalho */}
        <header className="space-y-3 border-b border-border pb-6 print:border-foreground">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold flex items-center gap-3">
                <BookOpen className="h-9 w-9 text-primary" /> Manual do Map Studio
              </h1>
              <p className="text-muted-foreground max-w-3xl">
                Guia completo das funcionalidades do editor de mapas: ferramentas, atalhos,
                interações com botão direito, gerador de assentos, mobília, propriedades e
                fluxo de exportação. Documentação otimizada para visualização e impressão em PDF.
              </p>
            </div>
            <Button onClick={handlePrint} className="no-print" variant="outline">
              <Printer className="h-4 w-4 mr-2" /> Imprimir / Salvar PDF
            </Button>
          </div>

          {/* Sumário */}
          <nav aria-label="Sumário" className="rounded-lg border border-border bg-muted/30 p-4 mt-4 print:bg-transparent">
            <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <ListOrdered className="h-4 w-4" /> Sumário
            </h2>
            <ol className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm list-decimal list-inside text-muted-foreground">
              <li><a href="#overview" className="hover:text-foreground">Visão geral da interface</a></li>
              <li><a href="#toolbar" className="hover:text-foreground">Barra de ferramentas</a></li>
              <li><a href="#templates" className="hover:text-foreground">Criação de setores (Templates)</a></li>
              <li><a href="#shapes-vs-sectors" className="hover:text-foreground">Formas vs Setores</a></li>
              <li><a href="#seat-generator" className="hover:text-foreground">Gerador de assentos</a></li>
              <li><a href="#left-sidebar" className="hover:text-foreground">Sidebar esquerda</a></li>
              <li><a href="#furniture" className="hover:text-foreground">Mobília (Mesa / Bistrô)</a></li>
              <li><a href="#right-sidebar" className="hover:text-foreground">Sidebar direita (propriedades)</a></li>
              <li><a href="#context-menu" className="hover:text-foreground">Menu de contexto (botão direito)</a></li>
              <li><a href="#background" className="hover:text-foreground">Imagem de fundo</a></li>
              <li><a href="#maps-portal" className="hover:text-foreground">Mapas no portal</a></li>
              <li><a href="#shortcuts" className="hover:text-foreground">Atalhos de teclado</a></li>
              <li><a href="#alerts" className="hover:text-foreground">Alertas e mensagens</a></li>
              <li><a href="#export" className="hover:text-foreground">Exportação e integração</a></li>
            </ol>
          </nav>
        </header>

        {/* 1. Visão geral */}
        <Section id="overview" icon={<Sparkles className="h-6 w-6" />} title="1. Visão geral da interface">
          <p className="text-sm">
            O Map Studio é um editor 2D para criar plantas de eventos com setores, assentos,
            mobília, elementos de cenário e textos. A interface é dividida em cinco áreas
            principais que sempre estão visíveis enquanto você edita um mapa:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
            <li><strong className="text-foreground">Topo:</strong> nome do mapa, botão <em>Templates</em> e botão <em>Exportar</em>.</li>
            <li><strong className="text-foreground">Toolbar central:</strong> ferramentas de criação, edição e zoom.</li>
            <li><strong className="text-foreground">Sidebar esquerda:</strong> tipos de assento, mobília, elementos, lista de setores e minimapa.</li>
            <li><strong className="text-foreground">Sidebar direita:</strong> propriedades do item selecionado.</li>
            <li><strong className="text-foreground">Canvas central:</strong> área de desenho, com pan e zoom infinitos.</li>
          </ul>
          <Figure src={overview} caption="Tela inicial do Map Studio com canvas vazio." size="lg" />
          <Tip>
            Tudo que você cria é salvo no <strong>histórico</strong> e pode ser desfeito com{' '}
            <Kbd>Ctrl</Kbd>+<Kbd>Z</Kbd>. As laterais podem ser recolhidas pelos botões de flecha
            ao lado de cada uma para ganhar área de desenho.
          </Tip>
        </Section>

        {/* 2. Toolbar */}
        <Section id="toolbar" icon={<Settings className="h-6 w-6" />} title="2. Barra de ferramentas">
          <p className="text-sm text-muted-foreground">
            Localizada no topo do canvas. Cada botão tem um atalho de teclado e tooltip ao passar o mouse.
            Você pode ocultar a toolbar clicando na seta acima dela para ganhar espaço vertical.
          </p>

          <div className="rounded-lg border border-border bg-muted/30 p-2 print:bg-transparent">
            <ToolItem icon={<MousePointer2 className="h-4 w-4" />} name="Selecionar" shortcut="V">
              Modo padrão. Clique em setores, assentos, mobília, formas, texto e elementos. Arraste no canvas vazio para fazer seleção em caixa (lasso). Use <Kbd>Shift</Kbd>+clique para adicionar à seleção.
            </ToolItem>
            <ToolItem icon={<Hand className="h-4 w-4" />} name="Mover Canvas (Pan)" shortcut="H">
              Arrasta o mapa todo. Como alternativa, use <strong>clique direito + arrastar</strong> ou <Kbd>Espaço</Kbd> + arrastar a qualquer momento, sem precisar trocar de ferramenta.
            </ToolItem>
            <ToolItem icon={<Square className="h-4 w-4" />} name="Criar Setor" shortcut="R">
              Abre o assistente de criação de setor (Templates) com escolha entre <strong>18+ formas geométricas</strong> predefinidas (retângulo, hexágono, arco, estrela, etc).
            </ToolItem>
            <ToolItem icon={<Grid3X3 className="h-4 w-4" />} name="Gerar Grade de Assentos" shortcut="G">
              Cria uma matriz retangular de assentos livremente no canvas, sem precisar de um setor existente. Útil para layouts simples e rápidos.
            </ToolItem>
            <ToolItem icon={<Circle className="h-4 w-4" />} name="Assento Individual" shortcut="S">
              Permite clicar dentro de um setor para inserir assentos manualmente, um a um, com numeração contínua. Aparece um popup para escolher tipo, fila e número antes de confirmar.
            </ToolItem>
            <ToolItem icon={<Layers className="h-4 w-4" />} name="Adicionar Elemento" shortcut="E">
              Insere elementos de cenário (palco, banheiro, entrada, bar, etc). Cada elemento tem ícone próprio, é redimensionável e pode ser rotacionado.
            </ToolItem>
            <ToolItem icon={<Armchair className="h-4 w-4" />} name="Adicionar Mobília">
              Insere mesas, cadeiras e bistrôs com layout configurado no painel esquerdo. Veja a seção <em>Mobília</em> para detalhes do preview interativo.
            </ToolItem>
            <ToolItem icon={<Type className="h-4 w-4" />} name="Adicionar Texto" shortcut="T">
              Adiciona caixas de texto livres ao canvas (rótulos, indicações). Clique duplo no texto para editar inline.
            </ToolItem>
            <ToolItem icon={<Undo2 className="h-4 w-4" />} name="Desfazer / Refazer" shortcut="Ctrl+Z / Ctrl+Shift+Z">
              Histórico ilimitado de alterações no canvas, incluindo movimentações, criações e exclusões.
            </ToolItem>
            <ToolItem icon={<Copy className="h-4 w-4" />} name="Duplicar / Excluir" shortcut="Ctrl+D / Del">
              Atua sobre os itens atualmente selecionados (um ou múltiplos).
            </ToolItem>
            <ToolItem icon={<ZoomIn className="h-4 w-4" />} name="Zoom" shortcut="+ / -">
              Indicador percentual entre os botões. Use também o scroll do mouse. Pressione <Kbd>Ctrl</Kbd>+<Kbd>0</Kbd> para ajustar todo o conteúdo à tela.
            </ToolItem>
            <ToolItem icon={<ImageIcon className="h-4 w-4" />} name="Imagem de Fundo">
              Importa uma imagem (planta, foto aérea) como referência. Quando ativa, o mesmo botão abre o painel de ajuste (opacidade, escala, posição). A imagem é salva junto com o mapa.
            </ToolItem>
            <ToolItem icon={<Download className="h-4 w-4" />} name="Exportar JSON">
              Abre o modal de exportação com o JSON completo do mapa, pronto para integração externa.
            </ToolItem>
          </div>
        </Section>

        {/* 3. Templates */}
        <Section id="templates" icon={<Square className="h-6 w-6" />} title="3. Criação de setores (Templates)">
          <p className="text-sm">
            Clique em <Badge variant="secondary">Templates</Badge> no topo (ou pressione <Kbd>R</Kbd>)
            para abrir o assistente de criação. Ele tem três etapas: <strong>Forma</strong>,
            <strong> Configurar</strong> e <strong>Preview</strong>.
          </p>

          <h3 className="font-semibold text-lg pt-2">Etapa 1 — Escolha a forma</h3>
          <p className="text-sm text-muted-foreground">
            18 formas pré-definidas, cada uma adequada a um tipo de venue:
          </p>
          <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground ml-2 list-disc list-inside">
            <li><strong className="text-foreground">Retângulo</strong> — cinemas, teatros, auditórios</li>
            <li><strong className="text-foreground">Paralelogramo</strong> — setores laterais com ângulo</li>
            <li><strong className="text-foreground">Trapézio</strong> — arquibancadas, setores frontais</li>
            <li><strong className="text-foreground">Triângulo</strong> — cantos e setores angulares</li>
            <li><strong className="text-foreground">Pentágono</strong> — espaços irregulares</li>
            <li><strong className="text-foreground">Hexágono</strong> — eventos ao redor</li>
            <li><strong className="text-foreground">Octógono</strong> — arenas, ringues</li>
            <li><strong className="text-foreground">Círculo / Oval</strong> — circos, arenas 360°</li>
            <li><strong className="text-foreground">Arco</strong> — curvatura para palcos</li>
            <li><strong className="text-foreground">Losango</strong> — áreas centrais, VIP</li>
            <li><strong className="text-foreground">Forma L / U / T / Z</strong> — cantos e extensões</li>
            <li><strong className="text-foreground">Cruz, Seta, Estrela, Onda</strong> — layouts especiais</li>
          </ul>
          <Figure src={templatesCompleto} caption="Etapa 1 — Galeria completa com 18 formas geométricas." size="lg" />

          <h3 className="font-semibold text-lg pt-2">Etapa 2 — Configurar geometria e assentos</h3>
          <p className="text-sm text-muted-foreground">
            Define <strong>quantos setores</strong> gerar de uma vez, número de <strong>fileiras</strong>,
            <strong> assentos por fileira</strong>, <strong>espaçamento</strong>, <strong>tamanho do
            assento</strong>, <strong>curvatura</strong> da forma e <strong>tipo padrão</strong>. O preview
            ao lado mostra a distribuição em tempo real.
          </p>
          <Figure src={configAssentos} caption="Etapa 2 — Configuração com preview ao vivo dos assentos." size="lg" />

          <h3 className="font-semibold text-lg pt-2">Etapa 3 — Preview e confirmação</h3>
          <p className="text-sm text-muted-foreground">
            Mostra um resumo da capacidade total, número de setores, fileiras por setor e
            assentos por fileira antes da criação efetiva.
          </p>
          <Figure src={previewConfirmar} caption="Etapa 3 — Resumo: 1 setor com 12 fileiras × 24 assentos = 288 lugares." size="lg" />

          <h3 className="font-semibold text-lg pt-2">Resultado</h3>
          <p className="text-sm text-muted-foreground">
            Após confirmar, o setor aparece no canvas já com os assentos posicionados,
            numeração padrão e cor automática. A lista lateral é atualizada e o status bar mostra
            o total de setores e assentos.
          </p>
          <Figure src={canvasComSetor} caption="Setor criado: 288 assentos posicionados, lista lateral e contador atualizados." size="lg" />
        </Section>

        {/* 4. Formas vs Setores */}
        <Section id="shapes-vs-sectors" icon={<Wand2 className="h-6 w-6" />} title="4. Formas vs Setores — entenda a diferença">
          <p className="text-sm">
            O Map Studio trabalha com dois conceitos distintos: <strong>formas</strong> (decorativas) e
            <strong> setores</strong> (vendáveis). Saber a diferença é essencial.
          </p>

          <div className="grid md:grid-cols-2 gap-4 pt-2">
            <div className="rounded-lg border border-border p-4 space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Square className="h-4 w-4 text-muted-foreground" /> Forma (sem setor)
              </h4>
              <p className="text-sm text-muted-foreground">
                Polígono puramente <strong>visual</strong>. Serve como elemento de cenário, divisória,
                decoração ou base para depois converter em setor.
              </p>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                <li>Não aceita assentos diretamente.</li>
                <li>Não aparece na lista de setores.</li>
                <li>Não vai para o JSON de venda como setor.</li>
                <li>Para selecioná-la, é preciso <strong>clique duplo</strong> (evita seleção acidental ao manipular setores por cima).</li>
              </ul>
            </div>

            <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-2 print:bg-transparent">
              <h4 className="font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" /> Setor (vendável)
              </h4>
              <p className="text-sm text-muted-foreground">
                Polígono <strong>com identidade comercial</strong>: tem nome, cor, capacidade e pode
                conter assentos numerados ou mesas. É o que efetivamente é exportado para o sistema
                de vendas.
              </p>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                <li>Aparece na lista de setores na sidebar esquerda.</li>
                <li>Aceita o gerador de assentos.</li>
                <li>Tem propriedades comerciais (nome, cor, texto interno).</li>
                <li>É exportado no JSON com seus vértices, assentos e mobília.</li>
              </ul>
            </div>
          </div>

          <Tip>
            <strong>Convertendo forma em setor:</strong> clique direito sobre uma forma e escolha{' '}
            <em>"Converter para setor"</em>. Se selecionar várias formas, a opção vira{' '}
            <em>"Agrupar N formas em setor"</em> e elas se tornam um único setor com geometria combinada.
            Útil para criar setores complexos a partir de formas simples.
          </Tip>
        </Section>

        {/* 5. Gerador de assentos */}
        <Section id="seat-generator" icon={<Grid3X3 className="h-6 w-6" />} title="5. Gerador de assentos">
          <p className="text-sm">
            Existem <strong>duas formas</strong> de gerar assentos no Map Studio. Ambas usam o mesmo
            modal, mas com escopos diferentes:
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-md border border-border p-3">
              <p className="font-semibold text-sm flex items-center gap-1.5">
                <Grid3X3 className="h-4 w-4 text-primary" /> Grade livre <Kbd>G</Kbd>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Cria a grade <strong>solta no canvas</strong>, em qualquer área vazia, sem precisar de
                setor. Ideal para layouts simples ou para "esboçar" antes de organizar em setores.
              </p>
            </div>
            <div className="rounded-md border border-primary/40 bg-primary/5 p-3 print:bg-transparent">
              <p className="font-semibold text-sm flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-primary" /> Dentro de um setor
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Selecione um setor → clique em <em>"Gerar Assentos neste Setor"</em> no painel direito
                ou na barra flutuante do canvas. Os assentos respeitam o <strong>polígono</strong> do setor
                (descarta os que ficam fora) e ficam vinculados a ele.
              </p>
            </div>
          </div>

          <h3 className="font-semibold text-lg pt-3">Etapa 1 — Tipo de mobília e tipo de assento</h3>
          <p className="text-sm text-muted-foreground">
            Escolha entre <strong>Cadeira</strong> (assentos numerados convencionais),
            <strong> Mesa</strong> (mesas com cadeiras configuráveis) ou <strong>Bistrô</strong>
            (mesa alta com banquetas). Defina também o tipo de assento padrão (Normal, VIP, PCD, Obeso).
          </p>
          <Figure src={geradorPasso1} caption="Gerador — passo 1: escolha de mobília e tipo de assento." />

          <h3 className="font-semibold text-lg pt-2">Etapa 2 — Geometria e numeração</h3>
          <p className="text-sm text-muted-foreground">
            Configure todos os parâmetros visuais e de numeração. O preview à direita reflete cada
            ajuste em tempo real e mostra quantos assentos efetivamente caberão no setor.
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside ml-2 space-y-0.5">
            <li><strong>Filas (linhas):</strong> número de fileiras horizontais.</li>
            <li><strong>Assentos por Fila:</strong> número de assentos em cada fileira.</li>
            <li><strong>Espaçamento entre Filas / Assentos:</strong> separação visual em pixels.</li>
            <li><strong>Tamanho do Assento:</strong> raio do círculo em pixels (8 a 32).</li>
            <li><strong>Tipo de Fila:</strong> Letras (A, B, C…), Números (1, 2, 3…) ou Romanos (I, II, III…).</li>
            <li><strong>Início da Fila:</strong> de onde a numeração começa (ex.: começar em "C" ou "10").</li>
            <li><strong>Numeração do Assento:</strong> Sequencial, Reverso, Ímpares à esquerda ou Pares à esquerda.</li>
            <li><strong>Direção:</strong> Esquerda → Direita ou Direita → Esquerda.</li>
            <li><strong>Quantidade variável:</strong> ative para definir manualmente o número de assentos por fileira (ex.: arquibancadas trapezoidais).</li>
            <li><strong>Rotação:</strong> gira toda a grade em graus.</li>
            <li><strong>Prefixo:</strong> texto opcional antes do número (ex.: "VIP-").</li>
            <li><strong>Redimensionar forma:</strong> se ativo, ajusta o tamanho do setor para caber a grade exata.</li>
          </ul>
          <Figure src={geradorPasso2} caption="Gerador — passo 2: configuração com preview ao vivo, contagem (200/200) e dimensões do setor." size="lg" />

          <Tip type="warn">
            Quando o setor é menor que a grade configurada, o preview mostra em vermelho/cinza os
            assentos que ficarão fora do polígono. Aumente o setor, reduza a grade ou ative
            <em> Redimensionar forma</em>.
          </Tip>
        </Section>

        {/* 6. Sidebar esquerda */}
        <Section id="left-sidebar" icon={<Layers className="h-6 w-6" />} title="6. Sidebar esquerda — Ferramentas e Camadas">
          <h3 className="font-semibold text-lg">Tipos de Assento</h3>
          <p className="text-sm text-muted-foreground">
            Selecione um ou mais assentos no canvas e clique em um tipo para aplicar. Cada tipo
            tem uma <strong>cor visual</strong> própria:
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
            {[
              { name: 'Normal', color: '#22c55e' },
              { name: 'PCD', color: '#3b82f6' },
              { name: 'Acompanhante', color: '#a855f7' },
              { name: 'Obeso', color: '#eab308' },
              { name: 'VIP', color: '#ec4899' },
              { name: 'Bloqueado', color: '#6b7280' },
            ].map(t => (
              <div key={t.name} className="flex items-center gap-2 p-2 border border-border rounded">
                <span className="w-3 h-3 rounded-full" style={{ background: t.color }} />
                {t.name}
              </div>
            ))}
          </div>

          <h3 className="font-semibold text-lg pt-3">Elementos</h3>
          <p className="text-sm text-muted-foreground">
            Lista todos os <strong>elementos de cenário</strong> inseridos (palco, banheiros, entradas,
            bar, etc). Clique para selecionar e editar.
          </p>

          <h3 className="font-semibold text-lg pt-2">Setores</h3>
          <p className="text-sm text-muted-foreground">
            Lista todos os setores criados, com <strong>contagem de assentos</strong>. Cada item tem
            ações inline ao lado:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
            <li><Eye className="inline h-3.5 w-3.5" /> <strong>Visibilidade</strong> — esconde/mostra o setor no canvas (não exclui).</li>
            <li><Lock className="inline h-3.5 w-3.5" /> <strong>Travar</strong> — impede edição acidental e movimentação.</li>
            <li><Trash2 className="inline h-3.5 w-3.5 text-destructive" /> <strong>Excluir</strong> — remove o setor e seus assentos definitivamente.</li>
          </ul>

          <h3 className="font-semibold text-lg pt-2">Minimapa</h3>
          <p className="text-sm text-muted-foreground">
            Visão reduzida do canvas inteiro com indicador da área visível. Clique em qualquer
            ponto para centralizar a visualização ali. Pode ser <strong>minimizado</strong> pelo
            cabeçalho para liberar espaço quando você está em zoom alto.
          </p>
        </Section>

        {/* 7. Mobília */}
        <Section id="furniture" icon={<Armchair className="h-6 w-6" />} title="7. Mobília (Mesa / Bistrô) — preview interativo">
          <p className="text-sm">
            O painel <strong>Mobília</strong> permite configurar mesas e bistrôs antes de inseri-los.
            Para cada mesa você define formato, dimensões, número de cadeiras e — o mais
            poderoso — <strong>posiciona cada cadeira individualmente</strong> ao redor da mesa
            arrastando-as no preview.
          </p>

          <Figure src={mobiliaMesaConfig} caption="Painel Mobília: tipo (Cadeira/Mesa/Bistrô), formato (Redonda/Quadrada/Retangular), número de cadeiras, dimensões e direção." size="lg" />

          <h3 className="font-semibold text-lg pt-2">Preview interativo de cadeiras</h3>
          <p className="text-sm text-muted-foreground">
            Abaixo dos controles, o <strong>Preview</strong> exibe a mesa com as cadeiras numeradas.
            <strong> Arraste cada cadeira</strong> ao redor da mesa para posicioná-las exatamente
            como precisa — por exemplo, 2 cadeiras de um lado e 4 do outro, ou todas concentradas
            de frente para o palco. As posições customizadas são salvas e aplicadas em todas as
            mesas inseridas a partir desse momento.
          </p>
          <Figure src={mesaPreviewInterativo} caption="Preview interativo: arraste as cadeiras numeradas para criar layouts customizados." />

          <h3 className="font-semibold text-lg pt-2">Modo de Venda</h3>
          <p className="text-sm text-muted-foreground">
            Após inserir uma mesa no mapa, selecione-a e abra o painel direito. Lá há um campo{' '}
            <strong>Modo de Venda</strong> com duas opções:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
            <li><strong>Mesa Fechada:</strong> a mesa inteira é vendida como uma única unidade (todos os lugares juntos).</li>
            <li><strong>Por Cadeira:</strong> cada lugar é vendido separadamente, como assento individual.</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Essa propriedade é exportada no JSON e respeitada pelos sistemas de venda integrados.
          </p>
        </Section>

        {/* 8. Sidebar direita */}
        <Section id="right-sidebar" icon={<Palette className="h-6 w-6" />} title="8. Sidebar direita — Propriedades">
          <p className="text-sm">
            O conteúdo desse painel <strong>muda conforme o item selecionado</strong>. Sem seleção,
            exibe a mensagem <em>"Nenhuma seleção"</em>.
          </p>

          <Figure src={setorPropriedades} caption="Setor selecionado: nome, paleta de cores, texto interno, posição e botão de gerar assentos." size="lg" />

          <h3 className="font-semibold text-lg pt-2">Setor selecionado</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
            <li><strong>Renomear</strong> o setor (aparece em todas as listagens).</li>
            <li><strong>Cor</strong> — paleta de 50+ cores predefinidas ou cor personalizada (color picker).</li>
            <li><strong>Texto interno</strong> — exibido sobre o setor no canvas (ex.: "Camarote", "Pista", "VIP").</li>
            <li><strong>Posição</strong> (X, Y) e <strong>rotação</strong> em graus.</li>
            <li><strong>Botão "Gerar Assentos neste Setor"</strong> — abre o gerador respeitando a forma do polígono.</li>
            <li>Os <strong>vértices</strong> do polígono podem ser arrastados diretamente no canvas para remodelar a geometria.</li>
            <li>Indicador <strong>TOPO</strong> (verde) e alça circular de rotação aparecem ao selecionar.</li>
          </ul>

          <h3 className="font-semibold text-lg pt-2">Assento selecionado</h3>
          <p className="text-sm text-muted-foreground">
            Mostra fileira, número, tipo e status. Permite editar a numeração, mover individualmente
            e bloquear/desbloquear. Use seleção múltipla para alterações em massa (ex.: marcar uma
            fileira inteira como VIP).
          </p>

          <h3 className="font-semibold text-lg pt-2">Mesa selecionada</h3>
          <p className="text-sm text-muted-foreground">
            Inclui o campo <strong>Modo de Venda</strong> (Mesa Fechada / Por Cadeira) descrito na
            seção anterior. Também permite editar dimensões, rotação e formato.
          </p>

          <h3 className="font-semibold text-lg pt-2">Texto selecionado</h3>
          <p className="text-sm text-muted-foreground">
            Fonte, tamanho, peso, cor, alinhamento e rotação. Clique duplo no texto no canvas
            para editar inline.
          </p>
        </Section>

        {/* 9. Context menu */}
        <Section id="context-menu" icon={<MousePointerClick className="h-6 w-6" />} title="9. Menu de contexto (botão direito)">
          <p className="text-sm">
            O <strong>botão direito</strong> tem dois comportamentos no Map Studio:
          </p>

          <div className="rounded-md border border-border p-3 bg-muted/30 print:bg-transparent">
            <p className="font-semibold text-sm flex items-center gap-2">
              <Move className="h-4 w-4 text-primary" /> 1. Botão direito + arrastar (em qualquer lugar)
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              Faz <strong>pan</strong> do canvas — equivalente à ferramenta Mover (<Kbd>H</Kbd>),
              sem precisar trocar de ferramenta. Funciona mesmo enquanto você desenha ou edita.
            </p>
          </div>

          <div className="rounded-md border border-border p-3 bg-muted/30 print:bg-transparent">
            <p className="font-semibold text-sm flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-primary" /> 2. Clique direito (sem arrastar)
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              Abre um menu contextual. As opções variam conforme o que foi clicado:
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            <div className="rounded-md border border-border p-3 space-y-2">
              <p className="font-semibold text-sm flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-primary" /> Em uma <strong>aresta</strong> de setor
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Adicionar ponto:</strong> insere um novo vértice naquela posição da aresta,
                permitindo formas mais complexas e curvas suaves.
              </p>
            </div>

            <div className="rounded-md border border-border p-3 space-y-2">
              <p className="font-semibold text-sm flex items-center gap-1.5">
                <Spline className="h-4 w-4 text-primary" /> Em um <strong>vértice</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Adicionar ponto</strong>, <strong>Remover ponto</strong> (apenas se o setor
                tiver mais de 3 vértices) e <strong>Curvar ponto</strong>, que transforma o canto
                em curva Bézier suave.
              </p>
            </div>

            <div className="rounded-md border border-border p-3 space-y-2">
              <p className="font-semibold text-sm flex items-center gap-1.5">
                <Copy className="h-4 w-4 text-primary" /> Em um <strong>elemento ou setor</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Duplicar</strong> (cria cópia ao lado) e <strong>Excluir</strong> o item.
                Funciona com seleção múltipla.
              </p>
            </div>

            <div className="rounded-md border border-border p-3 space-y-2">
              <p className="font-semibold text-sm flex items-center gap-1.5">
                <Link2 className="h-4 w-4 text-primary" /> Sobre <strong>formas</strong> geométricas
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Converter para setor</strong> (forma única) ou <strong>Agrupar N formas em
                setor</strong> (várias selecionadas). Útil para criar setores com geometria customizada
                a partir de formas livres.
              </p>
            </div>
          </div>

          <Tip>
            Clique fora do menu ou pressione <Kbd>Esc</Kbd> para fechá-lo. Outro clique direito em
            outro local também fecha o atual e abre um novo.
          </Tip>
        </Section>

        {/* 10. Background */}
        <Section id="background" icon={<ImageIcon className="h-6 w-6" />} title="10. Imagem de fundo">
          <p className="text-sm">
            Use uma planta baixa, foto aérea ou layout de referência atrás do canvas para
            traçar setores em cima. Excelente para reproduzir venues reais com fidelidade.
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
            <li>Clique no ícone de imagem na toolbar para <strong>importar</strong> (PNG/JPG).</li>
            <li>Quando há imagem ativa, o mesmo botão abre o <strong>painel de ajuste</strong>.</li>
            <li>Controles disponíveis: <strong>opacidade</strong> (0-100%), <strong>escala</strong>, <strong>posição X/Y</strong> e <strong>remover</strong>.</li>
            <li>A imagem e seus ajustes são <strong>salvos junto com o mapa</strong> e restaurados ao recarregar (suportado em Portal e Integração).</li>
          </ul>
        </Section>

        {/* 11. Mapas no portal */}
        <Section id="maps-portal" icon={<MapIcon className="h-6 w-6" />} title="11. Abrindo mapas pelo portal">
          <p className="text-sm">
            Em <strong>Mapas</strong>, cada linha tem um menu com <em>Abrir Mapa</em>. O editor
            abre com o mapa carregado e seu vínculo de autenticação:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
            <li>Usuários básicos só veem e abrem os mapas que <strong>eles próprios criaram</strong>.</li>
            <li>Administradores veem <strong>todos os mapas</strong>, com a coluna <strong>Empresa</strong> identificando o vínculo.</li>
            <li>Sem token de sessão válido, o mapa <strong>não pode ser aberto</strong> pelo portal.</li>
            <li>O mapa salvo é vinculado ao token do usuário que o gerou — esse vínculo controla a visibilidade.</li>
          </ul>
        </Section>

        {/* 12. Atalhos */}
        <Section id="shortcuts" icon={<Keyboard className="h-6 w-6" />} title="12. Atalhos de teclado">
          <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Move className="h-3.5 w-3.5" /> Navegação
              </h4>
              <div className="space-y-1.5">
                <Shortcut keys={['Scroll']} description="Zoom in / out" />
                <Shortcut keys={['Clique direito', 'Arrastar']} description="Pan (mover canvas)" />
                <Shortcut keys={['Espaço', 'Arrastar']} description="Pan temporário" />
                <Shortcut keys={['Ctrl', '+']} description="Zoom in" />
                <Shortcut keys={['Ctrl', '-']} description="Zoom out" />
                <Shortcut keys={['Ctrl', '0']} description="Ajustar à tela" />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <MousePointer2 className="h-3.5 w-3.5" /> Seleção
              </h4>
              <div className="space-y-1.5">
                <Shortcut keys={['Clique']} description="Selecionar setor / assento" />
                <Shortcut keys={['Shift', 'Clique']} description="Adicionar à seleção" />
                <Shortcut keys={['Arrastar']} description="Seleção em caixa (lasso)" />
                <Shortcut keys={['Ctrl', 'A']} description="Selecionar todos" />
                <Shortcut keys={['Esc']} description="Limpar seleção" />
                <Shortcut keys={['Duplo clique']} description="Selecionar forma (sem setor)" />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Undo2 className="h-3.5 w-3.5" /> Edição
              </h4>
              <div className="space-y-1.5">
                <Shortcut keys={['Ctrl', 'Z']} description="Desfazer" />
                <Shortcut keys={['Ctrl', 'Shift', 'Z']} description="Refazer" />
                <Shortcut keys={['Ctrl', 'Y']} description="Refazer (alternativo)" />
                <Shortcut keys={['Ctrl', 'C']} description="Copiar setor(es)" />
                <Shortcut keys={['Ctrl', 'V']} description="Colar setor(es)" />
                <Shortcut keys={['Ctrl', 'D']} description="Duplicar selecionado" />
                <Shortcut keys={['Delete']} description="Excluir selecionado" />
                <Shortcut keys={['Backspace']} description="Excluir selecionado" />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Settings className="h-3.5 w-3.5" /> Ferramentas
              </h4>
              <div className="space-y-1.5">
                <Shortcut keys={['V']} description="Selecionar" />
                <Shortcut keys={['H']} description="Mover canvas" />
                <Shortcut keys={['R']} description="Criar setor" />
                <Shortcut keys={['G']} description="Gerar grade de assentos" />
                <Shortcut keys={['S']} description="Assento individual" />
                <Shortcut keys={['E']} description="Adicionar elemento" />
                <Shortcut keys={['T']} description="Adicionar texto" />
              </div>
            </div>

            <div className="md:col-span-2">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <RotateCw className="h-3.5 w-3.5" /> Formas e setores (com seleção)
              </h4>
              <div className="space-y-1.5 grid sm:grid-cols-2 gap-x-4">
                <Shortcut keys={['R']} description="Rotacionar 90° horário" />
                <Shortcut keys={['Shift', 'R']} description="Rotacionar 90° anti-horário" />
                <Shortcut keys={['F']} description="Espelhar horizontal" />
                <Shortcut keys={['Shift', 'F']} description="Espelhar vertical" />
              </div>
            </div>
          </div>
        </Section>

        {/* 13. Alertas */}
        <Section id="alerts" icon={<AlertCircle className="h-6 w-6" />} title="13. Alertas e mensagens">
          <p className="text-sm">
            Todas as notificações (sucesso, erro, aviso, info) aparecem no <strong>topo
            centralizado</strong> da tela do Map Studio — fora da área de toolbars e sidebars,
            para não bloquear nada. São auto-dispensáveis, mas podem ser fechadas clicando em cima.
          </p>
          <p className="text-sm text-muted-foreground">
            Exemplos comuns: <em>"1 setor(es) criado(s) com 288 assentos!"</em>,
            <em> "Mapa salvo com sucesso"</em>, <em>"Erro ao sincronizar"</em>,
            <em> "Imagem de fundo carregada"</em>.
          </p>
        </Section>

        {/* 14. Exportar */}
        <Section id="export" icon={<Download className="h-6 w-6" />} title="14. Exportação e integração">
          <p className="text-sm">
            O botão <strong>Exportar</strong> abre um modal com o JSON completo do mapa: setores,
            vértices, assentos com fileira/número/tipo, mobília (com modo de venda), elementos,
            textos e configuração de imagem de fundo. Esse JSON é o mesmo enviado pelas
            integrações de criação e atualização de mapas.
          </p>
          <Figure src={exportJson} caption="Modal de exportação: JSON completo com Copiar e Baixar." size="lg" />
          <p className="text-sm text-muted-foreground">
            <strong>Copiar</strong> coloca o conteúdo no clipboard. <strong>Baixar JSON</strong>{' '}
            gera um arquivo <code className="text-xs bg-muted px-1.5 py-0.5 rounded">.json</code>{' '}
            pronto para envio à API ou para versionamento manual.
          </p>
        </Section>

        {/* Rodapé */}
        <footer className="text-center text-xs text-muted-foreground pt-8 pb-4 border-t border-border">
          Manual do Map Studio · gerado automaticamente · imprima esta página em PDF para uma cópia offline.
        </footer>
      </div>
    </div>
  );
};

export default ManualPage;
