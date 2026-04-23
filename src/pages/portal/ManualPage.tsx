import React from 'react';
import {
  BookOpen, MousePointer2, Hand, Square, Grid3X3, Circle, Layers,
  Armchair, Type, Undo2, Redo2, Copy, Trash2, ZoomIn, Image as ImageIcon,
  Download, MousePointerClick, Keyboard, Settings, Palette, Map as MapIcon,
  AlertCircle, Sparkles, Plus, Minus, Spline, Link2, Eye, Lock,
} from 'lucide-react';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import overview from '@/assets/manual/01-overview.png';
import templates from '@/assets/manual/02-templates.png';
import configurarSetor from '@/assets/manual/03-configurar-setor.png';
import setorCriado from '@/assets/manual/04-setor-criado.png';
import setorSelecionado from '@/assets/manual/05-setor-selecionado.png';
import mobilia from '@/assets/manual/06-mobilia.png';

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="px-2 py-0.5 text-xs font-mono bg-muted border border-border rounded shadow-sm">
    {children}
  </kbd>
);

const Shortcut: React.FC<{ keys: string[]; description: string }> = ({ keys, description }) => (
  <div className="flex items-center justify-between gap-3 py-1.5 px-3 rounded bg-muted/40">
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

const Figure: React.FC<{ src: string; caption: string }> = ({ src, caption }) => (
  <figure className="my-4 rounded-lg overflow-hidden border border-border bg-card">
    <img src={src} alt={caption} className="w-full h-auto" loading="lazy" />
    <figcaption className="px-4 py-2 text-xs text-muted-foreground border-t border-border bg-muted/30">
      {caption}
    </figcaption>
  </figure>
);

const ToolItem: React.FC<{
  icon: React.ReactNode;
  name: string;
  shortcut?: string;
  children: React.ReactNode;
}> = ({ icon, name, shortcut, children }) => (
  <div className="flex gap-3 py-3 border-b border-border last:border-0">
    <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
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

const ManualPage: React.FC = () => {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <header className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-primary" /> Manual do Map Studio
        </h1>
        <p className="text-muted-foreground">
          Guia completo das funcionalidades do editor de mapas: ferramentas, atalhos,
          interações com botão direito, propriedades, geração de assentos e mobília.
        </p>
      </header>

      {/* Visão geral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Visão geral da interface
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            O Map Studio é um editor 2D para criar plantas de eventos com setores, assentos,
            mobília, elementos de cenário e textos. A interface é dividida em quatro áreas:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li><strong className="text-foreground">Topo:</strong> nome do mapa, botão Templates e Exportar.</li>
            <li><strong className="text-foreground">Toolbar central:</strong> ferramentas de criação, edição e zoom.</li>
            <li><strong className="text-foreground">Sidebar esquerda:</strong> tipos de assento, mobília, elementos, lista de setores e minimapa.</li>
            <li><strong className="text-foreground">Sidebar direita:</strong> propriedades do item selecionado.</li>
            <li><strong className="text-foreground">Canvas central:</strong> área de desenho, com pan e zoom.</li>
          </ul>
          <Figure src={overview} caption="Tela inicial do Map Studio com canvas vazio." />
        </CardContent>
      </Card>

      {/* Acordeões com seções */}
      <Accordion type="multiple" className="space-y-3">
        {/* Toolbar */}
        <AccordionItem value="toolbar" className="border border-border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 font-semibold">
              <Settings className="h-4 w-4 text-primary" /> Barra de ferramentas (Toolbar)
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-1 pt-2">
            <p className="text-sm text-muted-foreground mb-2">
              Localizada no topo do canvas. Cada botão tem um atalho de teclado e tooltip ao passar o mouse.
            </p>

            <ToolItem icon={<MousePointer2 className="h-4 w-4" />} name="Selecionar" shortcut="V">
              Modo padrão. Clique em setores, assentos, mobília, formas, texto e elementos. Arraste no canvas vazio para fazer seleção em caixa (lasso).
            </ToolItem>
            <ToolItem icon={<Hand className="h-4 w-4" />} name="Mover Canvas (Pan)" shortcut="H">
              Arrasta o mapa todo. Como alternativa, use clique direito + arrastar ou <Kbd>Espaço</Kbd> + arrastar a qualquer momento.
            </ToolItem>
            <ToolItem icon={<Square className="h-4 w-4" />} name="Criar Setor" shortcut="R">
              Abre o assistente de criação de setor com escolha de forma (retângulo, hexágono, arco, etc).
            </ToolItem>
            <ToolItem icon={<Grid3X3 className="h-4 w-4" />} name="Gerar Grade de Assentos" shortcut="G">
              Cria uma matriz de assentos retangular livremente no canvas, sem precisar de um setor.
            </ToolItem>
            <ToolItem icon={<Circle className="h-4 w-4" />} name="Assento Individual" shortcut="S">
              Permite clicar dentro de um setor para inserir assentos manualmente, um a um, com numeração contínua.
            </ToolItem>
            <ToolItem icon={<Layers className="h-4 w-4" />} name="Adicionar Elemento" shortcut="E">
              Insere elementos de cenário (palco, banheiro, entrada, bar, etc).
            </ToolItem>
            <ToolItem icon={<Armchair className="h-4 w-4" />} name="Adicionar Mobília">
              Insere mesas, cadeiras e bistrôs com layout configurado no painel esquerdo.
            </ToolItem>
            <ToolItem icon={<Type className="h-4 w-4" />} name="Adicionar Texto" shortcut="T">
              Adiciona caixas de texto livres ao canvas. Clique duplo para editar.
            </ToolItem>
            <ToolItem icon={<Undo2 className="h-4 w-4" />} name="Desfazer / Refazer" shortcut="Ctrl+Z / Ctrl+Shift+Z">
              Histórico ilimitado de alterações no canvas.
            </ToolItem>
            <ToolItem icon={<Copy className="h-4 w-4" />} name="Duplicar / Excluir" shortcut="Ctrl+D / Del">
              Atua sobre os itens atualmente selecionados.
            </ToolItem>
            <ToolItem icon={<ZoomIn className="h-4 w-4" />} name="Zoom" shortcut="+ / -">
              Indicador percentual entre os botões. Use também o scroll do mouse.
            </ToolItem>
            <ToolItem icon={<ImageIcon className="h-4 w-4" />} name="Imagem de Fundo">
              Importa uma imagem (planta, foto aérea) como referência. Quando ativa, abre o painel de ajuste (opacidade, escala, posição).
            </ToolItem>
            <ToolItem icon={<Download className="h-4 w-4" />} name="Exportar JSON">
              Abre o modal de exportação com o JSON do mapa para integração externa.
            </ToolItem>
          </AccordionContent>
        </AccordionItem>

        {/* Templates */}
        <AccordionItem value="templates" className="border border-border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 font-semibold">
              <Square className="h-4 w-4 text-primary" /> Criação de setores e Templates
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2 text-sm">
            <p>
              Clique em <Badge variant="secondary">Templates</Badge> no topo (ou pressione <Kbd>R</Kbd>) para abrir o assistente.
              Ele tem três etapas: <strong>Forma</strong>, <strong>Configurar</strong> e <strong>Preview</strong>.
            </p>
            <Figure src={templates} caption="Etapa 1 — Escolha entre 18+ formas geométricas predefinidas." />
            <p>
              Na etapa <strong>Configurar</strong> você define quantos setores gerar de uma vez,
              número de fileiras, assentos por fileira, espaçamento, tamanho do assento e curvatura
              da forma. O preview ao lado mostra a distribuição em tempo real.
            </p>
            <Figure src={configurarSetor} caption="Etapa 2 — Configuração de geometria com preview ao vivo." />
            <p>
              Após confirmar, o setor aparece no canvas já com os assentos posicionados,
              numeração padrão e cor automática.
            </p>
            <Figure src={setorCriado} caption="Setor criado: lista lateral atualizada e assentos gerados." />
          </AccordionContent>
        </AccordionItem>

        {/* Sidebar esquerda */}
        <AccordionItem value="left" className="border border-border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 font-semibold">
              <Layers className="h-4 w-4 text-primary" /> Sidebar esquerda — Ferramentas e Camadas
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2 text-sm">
            <h4 className="font-semibold">Tipos de Assento</h4>
            <p className="text-muted-foreground">
              Selecione um ou mais assentos no canvas e clique em um tipo (Normal, PCD, Acompanhante,
              Obeso, VIP, Bloqueado) para aplicar. A cor visual muda conforme o tipo.
            </p>

            <h4 className="font-semibold pt-2">Mobília (Mesa / Bistrô)</h4>
            <p className="text-muted-foreground">
              Configure o layout da mobília antes de inseri-la. Para mesas, escolha o formato
              (Redonda, Quadrada, Retangular), número de cadeiras e dimensões. Você pode arrastar
              cada cadeira no preview para posicioná-la livremente ao redor da mesa
              (ex.: 2 cadeiras de um lado e 4 do outro).
            </p>
            <Figure src={mobilia} caption="Painel de mobília: tipo, formato e dimensões da mesa." />

            <h4 className="font-semibold pt-2">Elementos</h4>
            <p className="text-muted-foreground">
              Lista todos os elementos de cenário inseridos no mapa (palco, banheiros, entradas, etc).
              Clique para selecionar e editar.
            </p>

            <h4 className="font-semibold pt-2">Setores</h4>
            <p className="text-muted-foreground">
              Lista todos os setores criados, com contagem de assentos. Cada item tem ações inline:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
              <li><Eye className="inline h-3.5 w-3.5" /> Visibilidade — esconder/mostrar setor no canvas.</li>
              <li><Lock className="inline h-3.5 w-3.5" /> Travar — impede edição acidental.</li>
              <li><Trash2 className="inline h-3.5 w-3.5" /> Excluir — remove o setor e seus assentos.</li>
            </ul>

            <h4 className="font-semibold pt-2">Minimapa</h4>
            <p className="text-muted-foreground">
              Visão reduzida do canvas inteiro. Clique em qualquer ponto do minimapa para
              centralizar a visualização ali. Pode ser minimizado pelo cabeçalho.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Sidebar direita / Propriedades */}
        <AccordionItem value="right" className="border border-border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 font-semibold">
              <Palette className="h-4 w-4 text-primary" /> Sidebar direita — Propriedades
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2 text-sm">
            <p>
              O conteúdo desse painel muda conforme o item selecionado. Sem seleção, exibe a
              mensagem <em>"Nenhuma seleção"</em>.
            </p>
            <Figure src={setorSelecionado} caption="Setor selecionado: nome, cor, texto interno e posição." />

            <h4 className="font-semibold">Setor selecionado</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
              <li>Renomear o setor.</li>
              <li>Trocar a cor — paleta de 50+ cores ou cor personalizada.</li>
              <li>Texto interno (ex.: "Camarote", "Pista", "VIP").</li>
              <li>Posição (X, Y), rotação e escala.</li>
              <li>Botão <strong>Gerar Assentos neste Setor</strong> abre o gerador respeitando a forma do polígono.</li>
              <li>Vértices do setor podem ser arrastados diretamente no canvas para remodelar.</li>
            </ul>

            <h4 className="font-semibold pt-2">Assento selecionado</h4>
            <p className="text-muted-foreground">
              Mostra fileira, número, tipo e status. Permite editar a numeração, mover individualmente
              e bloquear/desbloquear.
            </p>

            <h4 className="font-semibold pt-2">Mesa selecionada</h4>
            <p className="text-muted-foreground">
              Inclui um campo <strong>Modo de Venda</strong>: <em>Mesa Fechada</em> (vendida inteira)
              ou <em>Por Cadeira</em> (cada lugar é vendido separadamente). Essa propriedade reflete
              no JSON exportado para integração.
            </p>

            <h4 className="font-semibold pt-2">Texto selecionado</h4>
            <p className="text-muted-foreground">
              Fonte, tamanho, peso, cor, alinhamento e rotação. Clique duplo no texto para editar inline.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Botão direito / Context Menu */}
        <AccordionItem value="context" className="border border-border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 font-semibold">
              <MousePointerClick className="h-4 w-4 text-primary" /> Menu de contexto (botão direito)
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2 text-sm">
            <p>
              O <strong>botão direito</strong> tem dois comportamentos no Map Studio:
            </p>

            <div className="rounded-md border border-border p-3 bg-muted/30">
              <p className="font-semibold text-sm">1. Botão direito + arrastar (em qualquer lugar)</p>
              <p className="text-muted-foreground text-sm mt-1">
                Faz <strong>pan</strong> do canvas — equivalente à ferramenta Mover (H), sem precisar trocar de ferramenta.
              </p>
            </div>

            <div className="rounded-md border border-border p-3 bg-muted/30">
              <p className="font-semibold text-sm">2. Clique direito (sem arrastar)</p>
              <p className="text-muted-foreground text-sm mt-1">
                Abre um menu contextual. As opções variam conforme o que foi clicado:
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 pt-1">
              <div className="rounded-md border border-border p-3 space-y-2">
                <p className="font-semibold text-sm flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-primary" /> Em uma aresta de setor
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Adicionar ponto:</strong> insere um novo vértice naquela posição da aresta,
                  permitindo formas mais complexas.
                </p>
              </div>

              <div className="rounded-md border border-border p-3 space-y-2">
                <p className="font-semibold text-sm flex items-center gap-1.5">
                  <Spline className="h-4 w-4 text-primary" /> Em um vértice
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Adicionar ponto, Remover ponto</strong> (se o setor tiver mais de 3 vértices)
                  e <strong>Curvar ponto</strong>, que transforma o canto em curva suave.
                </p>
              </div>

              <div className="rounded-md border border-border p-3 space-y-2">
                <p className="font-semibold text-sm flex items-center gap-1.5">
                  <Copy className="h-4 w-4 text-primary" /> Em um elemento ou setor
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Duplicar</strong> e <strong>Excluir</strong> o item (ou múltiplos, se houver
                  seleção).
                </p>
              </div>

              <div className="rounded-md border border-border p-3 space-y-2">
                <p className="font-semibold text-sm flex items-center gap-1.5">
                  <Link2 className="h-4 w-4 text-primary" /> Sobre formas geométricas
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Converter para setor</strong> (forma única) ou
                  <strong> Agrupar N formas em setor</strong> (várias selecionadas) — útil para criar
                  setores com geometria customizada a partir de formas livres.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground pt-1">
              Clique fora do menu ou dê outro clique direito para fechá-lo.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Imagem de fundo */}
        <AccordionItem value="bg" className="border border-border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 font-semibold">
              <ImageIcon className="h-4 w-4 text-primary" /> Imagem de fundo
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-2 pt-2 text-sm">
            <p>
              Use uma planta baixa, foto aérea ou layout de referência atrás do canvas para
              traçar setores em cima.
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
              <li>Clique no ícone de imagem na toolbar para importar (PNG/JPG).</li>
              <li>Quando há imagem, o mesmo botão abre o painel de ajuste.</li>
              <li>Controles disponíveis: <strong>opacidade</strong>, <strong>escala</strong>, <strong>posição X/Y</strong> e <strong>remover</strong>.</li>
              <li>A imagem e seus ajustes são salvos junto com o mapa e restaurados ao recarregar.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* Mapas no portal */}
        <AccordionItem value="maps" className="border border-border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 font-semibold">
              <MapIcon className="h-4 w-4 text-primary" /> Abrindo mapas pelo portal
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-2 pt-2 text-sm">
            <p>
              Em <strong>Mapas</strong>, cada linha tem um menu com <em>Abrir Mapa</em>. O editor
              abre com o mapa carregado e seu vínculo de autenticação:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
              <li>Usuários básicos só veem e abrem os mapas que eles próprios criaram.</li>
              <li>Administradores veem todos os mapas, com a coluna <strong>Empresa</strong> identificando o vínculo.</li>
              <li>Sem token de sessão válido, o mapa não pode ser aberto pelo portal.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* Atalhos */}
        <AccordionItem value="shortcuts" className="border border-border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 font-semibold">
              <Keyboard className="h-4 w-4 text-primary" /> Atalhos de teclado
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div>
              <h4 className="text-sm font-semibold mb-2">Navegação</h4>
              <div className="space-y-1.5">
                <Shortcut keys={['Scroll']} description="Zoom in / out" />
                <Shortcut keys={['Clique direito', 'Arrastar']} description="Pan (mover canvas)" />
                <Shortcut keys={['Espaço', 'Arrastar']} description="Pan temporário" />
                <Shortcut keys={['Ctrl', '+']} description="Zoom in" />
                <Shortcut keys={['Ctrl', '-']} description="Zoom out" />
                <Shortcut keys={['Ctrl', '0']} description="Ajustar à tela" />
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold mb-2">Seleção</h4>
              <div className="space-y-1.5">
                <Shortcut keys={['Clique']} description="Selecionar setor / assento" />
                <Shortcut keys={['Shift', 'Clique']} description="Adicionar à seleção" />
                <Shortcut keys={['Arrastar']} description="Seleção em caixa (lasso)" />
                <Shortcut keys={['Ctrl', 'A']} description="Selecionar todos" />
                <Shortcut keys={['Esc']} description="Limpar seleção" />
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold mb-2">Edição</h4>
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
            <Separator />
            <div>
              <h4 className="text-sm font-semibold mb-2">Ferramentas</h4>
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
            <Separator />
            <div>
              <h4 className="text-sm font-semibold mb-2">Formas e setores</h4>
              <div className="space-y-1.5">
                <Shortcut keys={['R']} description="Rotacionar 90° horário" />
                <Shortcut keys={['Shift', 'R']} description="Rotacionar 90° anti-horário" />
                <Shortcut keys={['F']} description="Espelhar horizontal" />
                <Shortcut keys={['Shift', 'F']} description="Espelhar vertical" />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Mensagens / Toasts */}
        <AccordionItem value="alerts" className="border border-border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 font-semibold">
              <AlertCircle className="h-4 w-4 text-primary" /> Alertas e mensagens
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-2 text-sm space-y-2">
            <p>
              Todas as notificações (sucesso, erro, aviso, info) aparecem no <strong>topo
              centralizado</strong> da tela. São auto-dispensáveis, mas podem ser fechadas
              clicando em cima. Exemplos: <em>"1 setor(es) criado(s) com 288 assentos!"</em>,
              <em> "Mapa salvo com sucesso"</em>, <em>"Erro ao sincronizar"</em>.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Exportar */}
        <AccordionItem value="export" className="border border-border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 font-semibold">
              <Download className="h-4 w-4 text-primary" /> Exportação e integração
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-2 text-sm space-y-2">
            <p>
              O botão <strong>Exportar</strong> abre um modal com o JSON completo do mapa: setores,
              vértices, assentos com fileira/número/tipo, mobília (com modo de venda), elementos,
              textos e configuração de imagem de fundo. Esse JSON é o mesmo enviado pelas
              integrações de criação e atualização de mapas.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default ManualPage;
