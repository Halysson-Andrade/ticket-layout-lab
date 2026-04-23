import React from 'react';
import {
  BookOpen, MousePointer2, Hand, Square, Grid3X3, Circle, Layers,
  Armchair, Type, Undo2, Redo2, Copy, Trash2, ZoomIn, Image as ImageIcon,
  Download, MousePointerClick, Keyboard, Settings, Palette, Map as MapIcon,
  AlertCircle, Sparkles, Plus, Minus, Spline, Link2, Eye, Lock, Printer,
  Info, ListOrdered, Move, RotateCw, Wand2, Ban, AlignCenter,
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
import setorSelecionadoCompleto from '@/assets/manual/17-setor-selecionado-completo.png';
import propriedadesRotacaoCurvatura from '@/assets/manual/18-propriedades-rotacao-curvatura.png';
import geradorTipoMobilia from '@/assets/manual/19-gerador-tipo-mobilia.png';
import geradorConfigDetalhada from '@/assets/manual/20-gerador-config-detalhada.png';
import geradorCustomizacao from '@/assets/manual/21-gerador-customizacao.png';

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

/**
 * Anotação posicionada sobre uma imagem (em % do tamanho da imagem).
 * - shape: "circle" desenha um círculo; "arrow" desenha uma seta apontando para o ponto.
 * - x, y: centro do alvo (0-100).
 * - w, h: tamanho do círculo (0-100, em % da largura/altura). Default 8x14.
 * - arrowFrom: origem da seta (0-100). Default sai do canto superior esquerdo.
 * - label: número/letra exibida junto à anotação.
 */
type Annotation = {
  shape: 'circle' | 'arrow';
  x: number;
  y: number;
  w?: number;
  h?: number;
  arrowFromX?: number;
  arrowFromY?: number;
  label?: string;
  color?: 'primary' | 'destructive' | 'success' | 'warning';
};

const ANNOTATION_COLORS: Record<NonNullable<Annotation['color']>, string> = {
  primary: 'hsl(var(--primary))',
  destructive: 'hsl(var(--destructive))',
  success: 'hsl(142 76% 45%)',
  warning: 'hsl(38 92% 50%)',
};

const AnnotatedFigure: React.FC<{
  src: string;
  caption: string;
  size?: 'sm' | 'md' | 'lg';
  annotations: Annotation[];
  legend?: { label: string; text: string; color?: Annotation['color'] }[];
}> = ({ src, caption, size = 'lg', annotations, legend }) => {
  const maxW = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-full' : 'max-w-2xl';
  return (
    <figure className={`my-4 mx-auto rounded-lg overflow-hidden border border-border bg-card ${maxW} print:break-inside-avoid`}>
      <div className="relative w-full">
        <img src={src} alt={caption} className="w-full h-auto block" loading="lazy" />
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            {(['primary', 'destructive', 'success', 'warning'] as const).map((c) => (
              <marker
                key={c}
                id={`arrowhead-${c}`}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={ANNOTATION_COLORS[c]} />
              </marker>
            ))}
          </defs>
          {annotations.map((a, i) => {
            const color = ANNOTATION_COLORS[a.color || 'primary'];
            if (a.shape === 'circle') {
              const w = a.w ?? 8;
              const h = a.h ?? 8;
              return (
                <g key={i}>
                  <ellipse
                    cx={a.x}
                    cy={a.y}
                    rx={w / 2}
                    ry={h / 2}
                    fill="none"
                    stroke={color}
                    strokeWidth={0.6}
                    vectorEffect="non-scaling-stroke"
                  />
                  {a.label && (
                    <g>
                      <circle
                        cx={a.x + w / 2 + 1.5}
                        cy={a.y - h / 2 - 1.5}
                        r={2}
                        fill={color}
                      />
                      <text
                        x={a.x + w / 2 + 1.5}
                        y={a.y - h / 2 - 1.5}
                        fontSize={2.4}
                        fill="white"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontWeight="bold"
                      >
                        {a.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            }
            // arrow
            const fx = a.arrowFromX ?? Math.max(2, a.x - 12);
            const fy = a.arrowFromY ?? Math.max(2, a.y - 10);
            return (
              <g key={i}>
                <line
                  x1={fx}
                  y1={fy}
                  x2={a.x}
                  y2={a.y}
                  stroke={color}
                  strokeWidth={0.6}
                  vectorEffect="non-scaling-stroke"
                  markerEnd={`url(#arrowhead-${a.color || 'primary'})`}
                />
                {a.label && (
                  <g>
                    <circle cx={fx} cy={fy} r={2.2} fill={color} />
                    <text
                      x={fx}
                      y={fy}
                      fontSize={2.6}
                      fill="white"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontWeight="bold"
                    >
                      {a.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className="px-4 py-2 text-xs text-muted-foreground border-t border-border bg-muted/30 print:bg-transparent">
        {caption}
      </figcaption>
      {legend && legend.length > 0 && (
        <ul className="px-4 py-2 text-xs text-foreground/90 bg-muted/20 border-t border-border space-y-1 print:bg-transparent">
          {legend.map((l, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
                style={{ background: ANNOTATION_COLORS[l.color || 'primary'] }}
              >
                {l.label}
              </span>
              <span>{l.text}</span>
            </li>
          ))}
        </ul>
      )}
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
              <li><a href="#seat-generator" className="hover:text-foreground">Gerador de assentos (detalhado)</a></li>
              <li><a href="#left-sidebar" className="hover:text-foreground">Sidebar esquerda</a></li>
              <li><a href="#furniture" className="hover:text-foreground">Mobília (Mesa / Bistrô)</a></li>
              <li><a href="#right-sidebar" className="hover:text-foreground">Propriedades de Setor</a></li>
              <li><a href="#sector-transforms" className="hover:text-foreground">Rotação, curvatura e espelhamento</a></li>
              <li><a href="#seat-properties" className="hover:text-foreground">Propriedades dos assentos e bloqueio</a></li>
              <li><a href="#vertices" className="hover:text-foreground">Vértices: criação, remoção e curvatura</a></li>
              <li><a href="#alignment" className="hover:text-foreground">Alinhamento e distribuição de setores</a></li>
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
          <AnnotatedFigure
            src={overview}
            caption="Tela inicial do Map Studio com as cinco áreas principais."
            size="lg"
            annotations={[
              { shape: 'circle', x: 50, y: 4, w: 95, h: 6, label: '1', color: 'primary' },
              { shape: 'circle', x: 50, y: 12, w: 60, h: 7, label: '2', color: 'success' },
              { shape: 'circle', x: 8, y: 55, w: 14, h: 80, label: '3', color: 'warning' },
              { shape: 'circle', x: 92, y: 55, w: 14, h: 80, label: '4', color: 'warning' },
              { shape: 'circle', x: 50, y: 60, w: 50, h: 60, label: '5', color: 'destructive' },
            ]}
            legend={[
              { label: '1', text: 'Topo: nome do mapa, botão Templates e Exportar.', color: 'primary' },
              { label: '2', text: 'Toolbar central: ferramentas de criação, edição e zoom.', color: 'success' },
              { label: '3', text: 'Sidebar esquerda: tipos de assento, mobília, elementos, setores e minimapa.', color: 'warning' },
              { label: '4', text: 'Sidebar direita: propriedades do item selecionado.', color: 'warning' },
              { label: '5', text: 'Canvas central: área de desenho com pan e zoom infinitos.', color: 'destructive' },
            ]}
          />
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
          <AnnotatedFigure
            src={templatesCompleto}
            caption="Etapa 1 — Galeria completa com 18 formas geométricas."
            size="lg"
            annotations={[
              { shape: 'arrow', x: 50, y: 8, arrowFromX: 50, arrowFromY: 1, label: '1', color: 'primary' },
              { shape: 'circle', x: 50, y: 50, w: 90, h: 70, label: '2', color: 'success' },
              { shape: 'arrow', x: 92, y: 96, arrowFromX: 80, arrowFromY: 88, label: '3', color: 'warning' },
            ]}
            legend={[
              { label: '1', text: 'Indicador de etapa do assistente (1 = Forma, 2 = Configurar, 3 = Preview).', color: 'primary' },
              { label: '2', text: 'Galeria de formas — clique em uma para selecioná-la.', color: 'success' },
              { label: '3', text: 'Botão "Próximo" para avançar à etapa de configuração.', color: 'warning' },
            ]}
          />

          <h3 className="font-semibold text-lg pt-2">Etapa 2 — Configurar geometria e assentos</h3>
          <p className="text-sm text-muted-foreground">
            Define <strong>quantos setores</strong> gerar de uma vez, número de <strong>fileiras</strong>,
            <strong> assentos por fileira</strong>, <strong>espaçamento</strong>, <strong>tamanho do
            assento</strong>, <strong>curvatura</strong> da forma e <strong>tipo padrão</strong>. O preview
            ao lado mostra a distribuição em tempo real.
          </p>
          <AnnotatedFigure
            src={configAssentos}
            caption="Etapa 2 — Configuração com preview ao vivo dos assentos."
            size="lg"
            annotations={[
              { shape: 'circle', x: 25, y: 35, w: 40, h: 50, label: '1', color: 'primary' },
              { shape: 'circle', x: 75, y: 50, w: 45, h: 70, label: '2', color: 'success' },
              { shape: 'arrow', x: 25, y: 92, arrowFromX: 12, arrowFromY: 85, label: '3', color: 'warning' },
            ]}
            legend={[
              { label: '1', text: 'Painel de parâmetros: fileiras, assentos por fila, espaçamento, tamanho e curvatura.', color: 'primary' },
              { label: '2', text: 'Preview ao vivo: visualize a distribuição enquanto altera os valores.', color: 'success' },
              { label: '3', text: 'Contador no rodapé mostra a capacidade total calculada.', color: 'warning' },
            ]}
          />

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
          <AnnotatedFigure
            src={canvasComSetor}
            caption="Setor criado: assentos posicionados, lista lateral e contador atualizados."
            size="lg"
            annotations={[
              { shape: 'circle', x: 50, y: 50, w: 55, h: 55, label: '1', color: 'primary' },
              { shape: 'arrow', x: 92, y: 30, arrowFromX: 80, arrowFromY: 20, label: '2', color: 'success' },
              { shape: 'arrow', x: 50, y: 96, arrowFromX: 35, arrowFromY: 90, label: '3', color: 'warning' },
            ]}
            legend={[
              { label: '1', text: 'Setor recém-criado com todos os assentos posicionados.', color: 'primary' },
              { label: '2', text: 'Lista lateral de setores atualizada com o novo item.', color: 'success' },
              { label: '3', text: 'Status bar exibe contagem total de setores e assentos.', color: 'warning' },
            ]}
          />
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
        <Section id="seat-generator" icon={<Grid3X3 className="h-6 w-6" />} title="5. Gerador de assentos — guia completo">
          <p className="text-sm">
            Existem <strong>duas formas</strong> de gerar assentos. Ambas usam o mesmo modal:
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-md border border-border p-3">
              <p className="font-semibold text-sm flex items-center gap-1.5">
                <Grid3X3 className="h-4 w-4 text-primary" /> Grade livre <Kbd>G</Kbd>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Cria a grade <strong>solta no canvas</strong>, sem precisar de setor. Útil para esboços rápidos.
              </p>
            </div>
            <div className="rounded-md border border-primary/40 bg-primary/5 p-3 print:bg-transparent">
              <p className="font-semibold text-sm flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-primary" /> Dentro de um setor
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Selecione o setor → <em>"Gerar Assentos neste Setor"</em>. Os assentos respeitam o
                polígono (descarta os que ficam fora) e ficam vinculados ao setor.
              </p>
            </div>
          </div>

          <h3 className="font-semibold text-lg pt-3">Etapa 1 — Tipo de mobília e tipo de assento</h3>
          <p className="text-sm text-muted-foreground">
            Escolha entre <strong>Cadeira</strong>, <strong>Mesa</strong> ou <strong>Bistrô</strong>.
            Para Mesa/Bistrô, você ainda define <strong>Forma da Mesa</strong> (Redonda / Quadrada /
            Retangular) e <strong>Cadeiras por Mesa</strong> (2 a 12). O tipo de assento padrão pode
            ser <strong>Normal</strong>, <strong>VIP</strong>, <strong>PCD</strong> ou <strong>Obeso</strong>
            — define a cor e a categoria comercial dos assentos gerados.
          </p>
          <AnnotatedFigure
            src={geradorTipoMobilia}
            caption="Etapa 1 — Tipo de mobília e tipo de assento."
            size="lg"
            annotations={[
              { shape: 'circle', x: 30, y: 35, w: 55, h: 25, label: '1', color: 'primary' },
              { shape: 'circle', x: 30, y: 65, w: 55, h: 25, label: '2', color: 'success' },
            ]}
            legend={[
              { label: '1', text: 'Tipo de mobília: Cadeira (assentos isolados), Mesa ou Bistrô.', color: 'primary' },
              { label: '2', text: 'Tipo de assento padrão (define cor e categoria comercial): Normal, VIP, PCD ou Obeso.', color: 'success' },
            ]}
          />

          <h3 className="font-semibold text-lg pt-2">Etapa 2 — Configuração detalhada</h3>
          <p className="text-sm text-muted-foreground">
            Esta é a etapa mais rica. Cada parâmetro afeta o preview à direita em tempo real, e o
            contador no topo (<em>"X assentos dentro do setor (Y lugares)"</em>) confirma o resultado.
          </p>
          <Figure src={geradorConfigDetalhada} caption="Etapa 2 — Visão completa: dimensões, espaçamentos, tamanho, tipo de fila, numeração, direção e preview ao vivo." size="lg" />

          <h4 className="font-semibold text-base pt-2">Dimensões da grade</h4>
          <ul className="text-sm text-muted-foreground list-disc list-inside ml-2 space-y-1">
            <li><strong>Filas (Linhas)</strong> — número de fileiras horizontais (1 a 100). Cada fila recebe um identificador (A, 1, I…).</li>
            <li><strong>Assentos por Fila</strong> — quantos lugares cada fila terá (1 a 200). Para mesas, é a quantidade de mesas por fila.</li>
          </ul>

          <h4 className="font-semibold text-base pt-2">Espaçamento e tamanho</h4>
          <ul className="text-sm text-muted-foreground list-disc list-inside ml-2 space-y-1">
            <li><strong>Espaçamento entre Filas</strong> — distância vertical em pixels (0 a 30). Mais espaço facilita a circulação.</li>
            <li><strong>Espaçamento entre Assentos</strong> — distância horizontal entre assentos da mesma fila.</li>
            <li><strong>Tamanho do Assento</strong> — diâmetro do círculo em pixels (8 a 40). Assentos maiores ficam mais legíveis em zoom baixo.</li>
          </ul>

          <h4 className="font-semibold text-base pt-2">Identificação das filas</h4>
          <ul className="text-sm text-muted-foreground list-disc list-inside ml-2 space-y-1">
            <li><strong>Tipo de Fila</strong> — <em>Letras</em> (A, B, C…), <em>Números</em> (1, 2, 3…) ou <em>Romano</em> (I, II, III…).</li>
            <li><strong>Início da Fila</strong> — onde a numeração começa. Ex.: digitar "C" pula A e B; digitar "10" começa na fila 10.</li>
            <li><strong>Posição do nome da fila</strong> — <em>Esquerda</em>, <em>Direita</em>, <em>Ambos</em> ou <em>Não informar</em>. Útil para arenas com acesso pelos dois lados.</li>
          </ul>

          <h4 className="font-semibold text-base pt-2">Numeração dos assentos</h4>
          <ul className="text-sm text-muted-foreground list-disc list-inside ml-2 space-y-1">
            <li><strong>Sequencial</strong> — 1, 2, 3, 4… na ordem natural.</li>
            <li><strong>Reverso</strong> — começa pelo último (N…3, 2, 1).</li>
            <li><strong>Somente Ímpares</strong> — 1, 3, 5, 7… (raro, mas usado em palcos antigos).</li>
            <li><strong>Somente Pares</strong> — 2, 4, 6, 8…</li>
            <li><strong>Ímpares à Esquerda / Pares à Direita</strong> — clássico de teatros: 5, 3, 1 | 2, 4, 6 a partir do corredor central.</li>
            <li><strong>Pares à Esquerda / Ímpares à Direita</strong> — variação invertida do anterior.</li>
            <li><strong>Customizada</strong> — você lista os números (ex.: <code>2, 7, 10, 15</code>) e eles são aplicados na ordem.</li>
            <li><strong>Customizada por Fileira</strong> — abre uma sub-tabela onde cada fila tem seu próprio modo (numérico, ímpares, pares, customizado), número inicial e direção. Ideal para arquibancadas com layouts irregulares.</li>
          </ul>

          <h4 className="font-semibold text-base pt-2">Número Inicial e Direção</h4>
          <ul className="text-sm text-muted-foreground list-disc list-inside ml-2 space-y-1">
            <li><strong>Número Inicial</strong> — primeiro número da numeração (geralmente 1).</li>
            <li><strong>Direção</strong> — <em>E → D</em> (Esquerda para Direita), <em>D → E</em> (Direita para Esquerda) ou <em>Centro →</em> (cresce a partir do meio para ambos os lados).</li>
          </ul>

          <h4 className="font-semibold text-base pt-2">Quantidade variável (assentos por fileira)</h4>
          <p className="text-sm text-muted-foreground">
            Ative <strong>"Quantidade de assentos por fileira (customizada)"</strong> para definir
            valores diferentes para cada fila. Digite separados por vírgula (ex.:{' '}
            <code>10, 12, 14, 16, 18</code>). Ideal para <strong>arquibancadas trapezoidais</strong>,
            arenas em leque ou setores com curvatura. Quando ativo, surge um seletor de{' '}
            <strong>Alinhamento</strong> (Esquerda / Centro / Direita) para definir como cada fila
            é posicionada dentro da forma.
          </p>

          <h4 className="font-semibold text-base pt-2">Rotação e Prefixo</h4>
          <ul className="text-sm text-muted-foreground list-disc list-inside ml-2 space-y-1">
            <li><strong>Rotação</strong> — gira toda a grade em graus (0° a 360°, passos de 5°). O preview mostra a rotação aplicada.</li>
            <li><strong>Prefixo</strong> — texto opcional antes do número de cada assento (ex.: <code>VIP-</code> gera <em>VIP-1, VIP-2, VIP-3…</em>; <code>SETOR1-</code> gera <em>SETOR1-A1, SETOR1-A2…</em>).</li>
          </ul>
          <Figure src={geradorCustomizacao} caption="Customização: rotação, prefixo, assentos por fileira variáveis e alinhamento." size="lg" />

          <h4 className="font-semibold text-base pt-2">Redimensionar forma</h4>
          <p className="text-sm text-muted-foreground">
            Quando ativo (checkbox no painel direito do gerador), o setor é <strong>redimensionado
            automaticamente</strong> para acomodar exatamente a grade configurada. Útil quando você
            sabe quantos lugares quer e prefere que a forma se adapte, em vez do contrário.
          </p>

          <Tip type="warn">
            Se assentos aparecem em vermelho/cinza no preview, eles estão <strong>fora do polígono</strong>
            do setor e não serão criados. Aumente o setor, reduza a grade, mude o alinhamento ou
            ative <em>Redimensionar forma</em>.
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

        {/* 8b. Transformações de Setor (Rotação, Curvatura, Espelhamento) */}
        <Section id="sector-transforms" icon={<RotateCw className="h-6 w-6" />} title="8.1 Rotação, curvatura e espelhamento de setores">
          <p className="text-sm">
            Com um setor selecionado, o painel direito exibe três grupos de transformações geométricas
            que afetam o polígono inteiro (e os assentos contidos nele).
          </p>
          <Figure src={propriedadesRotacaoCurvatura} caption="Painel de propriedades: Transformações no topo (centralizar / espelhar H / espelhar V), Espaçamento, Rotação com presets, Curvatura e Opacidade." size="lg" />

          <h3 className="font-semibold text-lg pt-2">Rotação</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
            <li>Slider de 0° a 360°, campo numérico, botões <Kbd>−</Kbd> / <Kbd>+</Kbd> para passos finos.</li>
            <li>Presets rápidos: <strong>0°</strong>, <strong>45°</strong>, <strong>90°</strong>, <strong>180°</strong>, <strong>270°</strong>.</li>
            <li>No canvas, a <strong>alça circular acima do setor</strong> permite rotacionar arrastando com o mouse.</li>
            <li>Atalhos com setor selecionado: <Kbd>R</Kbd> rotaciona 90° horário, <Kbd>Shift</Kbd>+<Kbd>R</Kbd> anti-horário.</li>
          </ul>

          <h3 className="font-semibold text-lg pt-2">Curvatura</h3>
          <p className="text-sm text-muted-foreground">
            Slider de 0% (<em>Reto</em>) a 100% (<em>Curvo</em>). Aplica curvas Bézier nas arestas do
            polígono, transformando um setor reto em uma forma orgânica. Ideal para arquibancadas
            curvas ou setores em volta de palcos circulares.
          </p>

          <h3 className="font-semibold text-lg pt-2">Espelhamento (Inverter)</h3>
          <p className="text-sm text-muted-foreground">
            Os botões no topo (<strong>Centralizar Assentos</strong>, <strong>Inverter Horizontal</strong>,
            <strong> Inverter Vertical</strong>) aplicam transformações sobre o setor mantendo a numeração:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
            <li><strong>Centralizar</strong> — recentraliza assentos dentro do polígono caso desalinhem após edições manuais.</li>
            <li><strong>Espelhar Horizontal</strong> (<Kbd>F</Kbd>) — inverte da esquerda para a direita. Numeração 1→N vira N→1 visualmente.</li>
            <li><strong>Espelhar Vertical</strong> (<Kbd>Shift</Kbd>+<Kbd>F</Kbd>) — inverte de cima para baixo. Útil quando o setor foi criado "de costas" para o palco.</li>
          </ul>

          <h3 className="font-semibold text-lg pt-2">Opacidade do Preenchimento</h3>
          <p className="text-sm text-muted-foreground">
            Slider de 0% (<em>Transparente</em>) a 100% (<em>Sólido</em>). Diminuir a opacidade ajuda
            quando você quer enxergar a imagem de fundo (planta) através do setor enquanto edita.
          </p>

          <h3 className="font-semibold text-lg pt-2">Espaçamento dos assentos (após geração)</h3>
          <p className="text-sm text-muted-foreground">
            Mesmo após gerar os assentos, você pode ajustar <strong>Entre Filas</strong>,{' '}
            <strong>Entre Assentos</strong> e <strong>Tamanho do Assento</strong> diretamente nos
            sliders. A forma se ajusta automaticamente para acomodar a nova distribuição.
          </p>
        </Section>

        {/* 8c. Propriedades dos assentos e bloqueio */}
        <Section id="seat-properties" icon={<Ban className="h-6 w-6" />} title="8.2 Propriedades dos assentos e bloqueio">
          <p className="text-sm">
            Selecione um ou mais assentos no canvas (clique direto, <Kbd>Shift</Kbd>+clique para
            adicionar à seleção, ou arraste em caixa) para acessar as propriedades específicas.
          </p>

          <h3 className="font-semibold text-lg pt-2">Aplicar tipo de assento</h3>
          <p className="text-sm text-muted-foreground">
            Com assentos selecionados, clique em qualquer tipo na <strong>sidebar esquerda → Tipos de
            Assento</strong> para aplicar em massa. Cada tipo tem cor própria que aparece imediatamente
            no canvas e é exportada no JSON para o sistema de venda.
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
            <li><strong>Normal</strong> — verde — assento padrão.</li>
            <li><strong>VIP</strong> — magenta — categoria premium.</li>
            <li><strong>PCD</strong> — azul — pessoa com deficiência.</li>
            <li><strong>Acompanhante</strong> — roxo — par do PCD.</li>
            <li><strong>Obeso</strong> — amarelo — assento reforçado/largo.</li>
            <li><strong>Bloqueado</strong> — cinza — não vendável.</li>
          </ul>

          <h3 className="font-semibold text-lg pt-2">Bloqueio de assentos com motivo</h3>
          <p className="text-sm text-muted-foreground">
            Para bloquear formalmente um ou mais assentos (impedir que apareçam para venda no
            sistema externo), use o botão <strong>Bloquear</strong> no painel direito ou clique no
            tipo "Bloqueado". Abre o modal:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
            <li>Aviso da quantidade de assentos que serão bloqueados.</li>
            <li>Checkbox <strong>"Adicionar motivo do bloqueio"</strong> para deixar uma nota textual de até 200 caracteres.</li>
            <li>Exemplos típicos: <em>"Visão obstruída"</em>, <em>"Manutenção"</em>, <em>"Reserva especial"</em>, <em>"Coluna no caminho"</em>.</li>
            <li>O motivo é salvo junto com o assento e aparece em tooltips, relatórios e na exportação JSON.</li>
          </ul>

          <h3 className="font-semibold text-lg pt-2">Edição em massa</h3>
          <p className="text-sm text-muted-foreground">
            Toda alteração feita com múltiplos assentos selecionados se aplica a todos. Exemplos:
            marcar uma fileira inteira como VIP, bloquear toda uma coluna, mudar o tipo de um setor
            inteiro de uma só vez. Use <Kbd>Ctrl</Kbd>+<Kbd>A</Kbd> para selecionar tudo.
          </p>
        </Section>

        {/* 8d. Vértices e edição de polígono */}
        <Section id="vertices" icon={<Spline className="h-6 w-6" />} title="8.3 Vértices: criação, remoção e curvatura">
          <p className="text-sm">
            Cada setor é um <strong>polígono</strong> formado por vértices (pontos) ligados por
            arestas (linhas/curvas). Você pode remodelá-lo livremente.
          </p>

          <h3 className="font-semibold text-lg pt-2">Arrastar vértices</h3>
          <p className="text-sm text-muted-foreground">
            Com o setor selecionado, os vértices aparecem como <strong>quadradinhos azuis</strong>
            nos cantos. Arraste qualquer um para mover apenas aquele ponto, deformando a geometria.
            Os assentos contidos no polígono <strong>não se movem automaticamente</strong> — use{' '}
            <em>Centralizar Assentos</em> (seção 8.1) caso precise reposicionar.
          </p>

          <h3 className="font-semibold text-lg pt-2">Adicionar ponto (criar vértice)</h3>
          <p className="text-sm text-muted-foreground">
            Clique com o <strong>botão direito sobre uma aresta</strong> (linha entre dois vértices) e
            escolha <em>"Adicionar ponto"</em>. Um novo vértice é inserido exatamente naquela
            posição, permitindo formas mais complexas. Repita o processo quantas vezes precisar para
            criar curvas finas e detalhes.
          </p>

          <h3 className="font-semibold text-lg pt-2">Remover ponto</h3>
          <p className="text-sm text-muted-foreground">
            Clique direito <strong>sobre um vértice</strong> e escolha <em>"Remover ponto"</em>. A
            opção fica desativada se o setor tiver apenas 3 vértices (mínimo para formar um polígono).
          </p>

          <h3 className="font-semibold text-lg pt-2">Curvar ponto (Bézier)</h3>
          <p className="text-sm text-muted-foreground">
            Clique direito <strong>sobre um vértice</strong> e escolha{' '}
            <em>"Curvar ponto"</em>. O canto reto vira uma curva Bézier suave naquele ponto, com um
            ponto de controle que você pode arrastar para ajustar a intensidade da curvatura. Ideal
            para criar setores arredondados sem precisar de muitos vértices.
          </p>

          <Tip>
            Para arredondar o setor inteiro de uma vez, use o slider <strong>Curvatura</strong> no
            painel direito (seção 8.1) — ele aplica curvas em todas as arestas simultaneamente.
          </Tip>
        </Section>

        {/* 8e. Alinhamento e distribuição */}
        <Section id="alignment" icon={<AlignCenter className="h-6 w-6" />} title="8.4 Alinhamento e distribuição de setores">
          <p className="text-sm">
            Quando você seleciona <strong>2 ou mais setores</strong>, uma <strong>barra flutuante de
            alinhamento</strong> aparece logo abaixo da toolbar superior. Ela permite organizar
            setores como em ferramentas de design (Figma, Illustrator).
          </p>

          <h3 className="font-semibold text-lg pt-2">Alinhamento horizontal</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
            <li><strong>Alinhar à esquerda</strong> — todos os setores compartilham a borda esquerda do mais à esquerda.</li>
            <li><strong>Centralizar horizontalmente</strong> — alinha todos pelo eixo X central.</li>
            <li><strong>Alinhar à direita</strong> — todos compartilham a borda direita do mais à direita.</li>
          </ul>

          <h3 className="font-semibold text-lg pt-2">Alinhamento vertical</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
            <li><strong>Alinhar ao topo</strong> — bordas superiores no mesmo Y.</li>
            <li><strong>Centralizar verticalmente</strong> — eixos Y centrais coincidem.</li>
            <li><strong>Alinhar à base</strong> — bordas inferiores no mesmo Y.</li>
          </ul>

          <h3 className="font-semibold text-lg pt-2">Distribuição</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
            <li><strong>Distribuir horizontalmente</strong> — espaçamento igual no eixo X entre os 3+ setores selecionados.</li>
            <li><strong>Distribuir verticalmente</strong> — espaçamento igual no eixo Y.</li>
          </ul>

          <h3 className="font-semibold text-lg pt-2">Auto Grid (alinhar tudo e centralizar)</h3>
          <p className="text-sm text-muted-foreground">
            Atalho rápido de organização: alinha todos os setores em uma grade ordenada e centraliza
            o conjunto no canvas. Útil quando você importa muitos setores soltos ou quer "limpar"
            visualmente um mapa bagunçado.
          </p>

          <Tip>
            A barra também mostra a <strong>contagem</strong> de setores selecionados ("3 setores")
            para confirmar quantos itens serão afetados pela operação.
          </Tip>
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
