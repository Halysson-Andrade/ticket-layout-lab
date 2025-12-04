import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Check, Armchair, LayoutGrid, Settings, Square, Triangle, Pentagon, Hexagon, Circle, Star, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SectorShape, SHAPE_NAMES } from '@/types/mapStudio';
import { cn } from '@/lib/utils';

interface OnboardingWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: (shapeConfig: ShapeConfig) => void;
}

export interface ShapeConfig {
  shape: SectorShape;
  totalSeats: number;
  sectors: number;
  rows: number;
  cols: number;
  seatSize: number;
  rowSpacing: number;
  colSpacing: number;
}

interface ShapeTemplate {
  id: SectorShape;
  name: string;
  description: string;
  icon: React.ReactNode;
  defaultParams: Partial<ShapeConfig>;
}

const shapeTemplates: ShapeTemplate[] = [
  {
    id: 'rectangle',
    name: 'Retângulo',
    description: 'Cinemas, teatros, auditórios',
    icon: <Square className="h-6 w-6" />,
    defaultParams: { rows: 12, cols: 24, seatSize: 14, rowSpacing: 6, colSpacing: 2 },
  },
  {
    id: 'parallelogram',
    name: 'Paralelogramo',
    description: 'Setores laterais com ângulo',
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 4h14l-4 16H2L6 4z" /></svg>,
    defaultParams: { rows: 10, cols: 20, seatSize: 14, rowSpacing: 6, colSpacing: 2 },
  },
  {
    id: 'trapezoid',
    name: 'Trapézio',
    description: 'Arquibancadas, setores frontais',
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20h16l-3-16H7L4 20z" /></svg>,
    defaultParams: { rows: 15, cols: 30, seatSize: 12, rowSpacing: 4, colSpacing: 2 },
  },
  {
    id: 'triangle',
    name: 'Triângulo',
    description: 'Cantos e setores angulares',
    icon: <Triangle className="h-6 w-6" />,
    defaultParams: { rows: 8, cols: 16, seatSize: 14, rowSpacing: 6, colSpacing: 3 },
  },
  {
    id: 'pentagon',
    name: 'Pentágono',
    description: 'Espaços irregulares',
    icon: <Pentagon className="h-6 w-6" />,
    defaultParams: { rows: 10, cols: 20, seatSize: 14, rowSpacing: 5, colSpacing: 3 },
  },
  {
    id: 'hexagon',
    name: 'Hexágono',
    description: 'Layout orgânico, eventos ao redor',
    icon: <Hexagon className="h-6 w-6" />,
    defaultParams: { rows: 8, cols: 24, seatSize: 16, rowSpacing: 6, colSpacing: 2 },
  },
  {
    id: 'octagon',
    name: 'Octágono',
    description: 'Arenas, ringues',
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="7,2 17,2 22,7 22,17 17,22 7,22 2,17 2,7" /></svg>,
    defaultParams: { rows: 10, cols: 30, seatSize: 14, rowSpacing: 5, colSpacing: 2 },
  },
  {
    id: 'circle',
    name: 'Círculo/Oval',
    description: 'Circos, arenas 360°',
    icon: <Circle className="h-6 w-6" />,
    defaultParams: { rows: 10, cols: 40, seatSize: 14, rowSpacing: 4, colSpacing: 2 },
  },
  {
    id: 'arc',
    name: 'Arco',
    description: 'Curvatura para palcos',
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 18 A 8 8 0 0 1 20 18" /></svg>,
    defaultParams: { rows: 12, cols: 30, seatSize: 14, rowSpacing: 5, colSpacing: 2 },
  },
  {
    id: 'diamond',
    name: 'Losango',
    description: 'Áreas centrais, VIP',
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12,2 22,12 12,22 2,12" /></svg>,
    defaultParams: { rows: 8, cols: 16, seatSize: 14, rowSpacing: 5, colSpacing: 3 },
  },
  {
    id: 'l-shape',
    name: 'Forma L',
    description: 'Cantos e extensões',
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h8v8h8v8H4V4z" /></svg>,
    defaultParams: { rows: 10, cols: 20, seatSize: 14, rowSpacing: 5, colSpacing: 2 },
  },
  {
    id: 'u-shape',
    name: 'Forma U',
    description: 'Ao redor do palco',
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4v16h16V4h-5v10H9V4H4z" /></svg>,
    defaultParams: { rows: 10, cols: 24, seatSize: 14, rowSpacing: 5, colSpacing: 2 },
  },
  {
    id: 't-shape',
    name: 'Forma T',
    description: 'Passarelas e extensões',
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v6h-5v10H9V10H4V4z" /></svg>,
    defaultParams: { rows: 12, cols: 20, seatSize: 14, rowSpacing: 5, colSpacing: 2 },
  },
  {
    id: 'z-shape',
    name: 'Forma Z',
    description: 'Setores escalonados',
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v5h-10v6h10v5H4v-5h10v-6H4V4z" /></svg>,
    defaultParams: { rows: 10, cols: 18, seatSize: 14, rowSpacing: 5, colSpacing: 2 },
  },
  {
    id: 'cross',
    name: 'Cruz',
    description: 'Layout central expandido',
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 4h6v5h5v6h-5v5H9v-5H4V9h5V4z" /></svg>,
    defaultParams: { rows: 10, cols: 20, seatSize: 14, rowSpacing: 5, colSpacing: 2 },
  },
  {
    id: 'arrow',
    name: 'Seta',
    description: 'Direcionado ao palco',
    icon: <ArrowUp className="h-6 w-6" />,
    defaultParams: { rows: 12, cols: 20, seatSize: 14, rowSpacing: 5, colSpacing: 2 },
  },
  {
    id: 'star',
    name: 'Estrela',
    description: 'Eventos especiais',
    icon: <Star className="h-6 w-6" />,
    defaultParams: { rows: 8, cols: 20, seatSize: 14, rowSpacing: 5, colSpacing: 3 },
  },
  {
    id: 'wave',
    name: 'Onda',
    description: 'Layout orgânico curvo',
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12 Q 6 6 12 12 T 22 12" /></svg>,
    defaultParams: { rows: 10, cols: 30, seatSize: 14, rowSpacing: 5, colSpacing: 2 },
  },
];
type Step = 'shape' | 'config' | 'preview';

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  open,
  onClose,
  onComplete,
}) => {
  const [step, setStep] = useState<Step>('shape');
  const [selectedShape, setSelectedShape] = useState<ShapeTemplate | null>(null);
  const [config, setConfig] = useState<ShapeConfig>({
    shape: 'rectangle',
    totalSeats: 500,
    sectors: 1,
    rows: 10,
    cols: 25,
    seatSize: 14,
    rowSpacing: 6,
    colSpacing: 2,
  });

  if (!open) return null;

  const handleSelectShape = (shape: ShapeTemplate) => {
    setSelectedShape(shape);
    setConfig({
      ...config,
      shape: shape.id,
      rows: shape.defaultParams.rows || 10,
      cols: shape.defaultParams.cols || 25,
      seatSize: shape.defaultParams.seatSize || 14,
      rowSpacing: shape.defaultParams.rowSpacing || 6,
      colSpacing: shape.defaultParams.colSpacing || 2,
    });
    setStep('config');
  };

  const handleComplete = () => {
    onComplete(config);
  };

  const steps = [
    { id: 'shape', label: 'Forma', icon: LayoutGrid },
    { id: 'config', label: 'Configurar', icon: Settings },
    { id: 'preview', label: 'Preview', icon: Armchair },
  ];

  const renderShapePreview = (shapeId: SectorShape) => {
    const cx = 40, cy = 40;
    switch (shapeId) {
      case 'rectangle':
        return <rect x="10" y="20" width="60" height="40" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'parallelogram':
        return <polygon points="20,20 70,20 60,60 10,60" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'trapezoid':
        return <polygon points="20,20 60,20 70,60 10,60" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'triangle':
        return <polygon points="40,15 70,65 10,65" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'pentagon':
        const r = 28;
        const pentPoints = Array.from({ length: 5 }, (_, i) => {
          const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(' ');
        return <polygon points={pentPoints} fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'hexagon':
        const hr = 28;
        const hexPoints = Array.from({ length: 6 }, (_, i) => {
          const angle = (i * Math.PI / 3) - Math.PI / 2;
          return `${cx + hr * Math.cos(angle)},${cy + hr * Math.sin(angle)}`;
        }).join(' ');
        return <polygon points={hexPoints} fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'octagon':
        const or = 28;
        const octPoints = Array.from({ length: 8 }, (_, i) => {
          const angle = (i * Math.PI / 4) - Math.PI / 8;
          return `${cx + or * Math.cos(angle)},${cy + or * Math.sin(angle)}`;
        }).join(' ');
        return <polygon points={octPoints} fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'circle':
        return <ellipse cx="40" cy="40" rx="30" ry="20" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'arc':
        return <path d="M 10 50 Q 40 10 70 50" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />;
      case 'diamond':
        return <polygon points="40,10 70,40 40,70 10,40" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'l-shape':
        return <path d="M10,10 h25 v25 h25 v25 h-50 z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'u-shape':
        return <path d="M10,10 v50 h60 v-50 h-20 v30 h-20 v-30 z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 't-shape':
        return <path d="M10,10 h60 v20 h-20 v30 h-20 v-30 h-20 z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'z-shape':
        return <path d="M10,10 h60 v15 h-35 v20 h35 v15 h-60 v-15 h35 v-20 h-35 z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'cross':
        return <path d="M25,10 h30 v15 h15 v30 h-15 v15 h-30 v-15 h-15 v-30 h15 z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'arrow':
        return <polygon points="40,10 70,35 55,35 55,70 25,70 25,35 10,35" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'star':
        const sr = 30, ir = 12;
        const starPoints = Array.from({ length: 10 }, (_, i) => {
          const angle = (i * Math.PI / 5) - Math.PI / 2;
          const radius = i % 2 === 0 ? sr : ir;
          return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
        }).join(' ');
        return <polygon points={starPoints} fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      case 'wave':
        return <path d="M10,30 Q25,10 40,30 T70,30 v20 Q55,70 40,50 T10,50 z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
      default:
        return <rect x="10" y="20" width="60" height="40" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />;
    }
  };

  const renderMiniPreview = () => {
    if (!selectedShape) return null;
    
    const previewRows = Math.min(config.rows, 8);
    const previewCols = Math.min(config.cols, 12);
    const seatSize = 8;
    const spacing = 2;

    return (
      <div className="flex flex-col items-center gap-2">
        <div 
          className="grid gap-px"
          style={{
            gridTemplateColumns: `repeat(${previewCols}, ${seatSize}px)`,
            gap: `${spacing}px`,
          }}
        >
          {Array.from({ length: previewRows * previewCols }).map((_, i) => (
            <div
              key={i}
              className="rounded-full bg-primary/60"
              style={{ width: seatSize, height: seatSize }}
            />
          ))}
        </div>
        
        <div className="text-xs text-muted-foreground mt-2 text-center">
          {previewRows}x{previewCols} de {config.rows}x{config.cols}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header with steps */}
        <div className="px-8 py-6 border-b border-border bg-muted/30">
          <h1 className="text-2xl font-bold mb-4">Criar Novo Setor</h1>
          
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {steps.map((s, index) => (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => {
                    if (s.id === 'shape') setStep('shape');
                    else if (s.id === 'config' && selectedShape) setStep('config');
                    else if (s.id === 'preview' && selectedShape) setStep('preview');
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                    step === s.id 
                      ? "bg-primary text-primary-foreground" 
                      : steps.findIndex(x => x.id === step) > index
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  <s.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{s.label}</span>
                </button>
                {index < steps.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-8">
            {/* Step 1: Shape Selection */}
            {step === 'shape' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-2">Escolha a forma do setor</h2>
                  <p className="text-sm text-muted-foreground">
                    Selecione a geometria que melhor se adapta ao seu espaço
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {shapeTemplates.map((shape) => (
                    <button
                      key={shape.id}
                      onClick={() => handleSelectShape(shape)}
                      className={cn(
                        "group text-left p-5 rounded-xl border-2 transition-all hover:scale-[1.02]",
                        selectedShape?.id === shape.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
                      )}
                    >
                      <div className="flex justify-center mb-3 text-primary">
                        <svg viewBox="0 0 80 80" className="w-20 h-20">
                          {renderShapePreview(shape.id)}
                        </svg>
                      </div>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        {shape.icon}
                        <h3 className="font-semibold">{shape.name}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        {shape.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Configuration */}
            {step === 'config' && selectedShape && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Config form */}
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-2">Configure o setor: {selectedShape.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      Ajuste os parâmetros de assentos
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <Label className="text-sm font-medium">Número de Setores</Label>
                      <div className="flex items-center gap-4 mt-2">
                        <Slider
                          value={[config.sectors]}
                          onValueChange={([v]) => setConfig(prev => ({ ...prev, sectors: v }))}
                          min={1}
                          max={8}
                          step={1}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          value={config.sectors}
                          onChange={(e) => setConfig(prev => ({ ...prev, sectors: parseInt(e.target.value) || 1 }))}
                          className="w-20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Fileiras</Label>
                        <Input
                          type="number"
                          value={config.rows}
                          onChange={(e) => setConfig(prev => ({ ...prev, rows: parseInt(e.target.value) || 1 }))}
                          className="mt-2"
                          min={1}
                          max={100}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Assentos por Fileira</Label>
                        <Input
                          type="number"
                          value={config.cols}
                          onChange={(e) => setConfig(prev => ({ ...prev, cols: parseInt(e.target.value) || 1 }))}
                          className="mt-2"
                          min={1}
                          max={100}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Tamanho do Assento (px)</Label>
                      <div className="flex items-center gap-4 mt-2">
                        <Slider
                          value={[config.seatSize]}
                          onValueChange={([v]) => setConfig(prev => ({ ...prev, seatSize: v }))}
                          min={8}
                          max={24}
                          step={1}
                          className="flex-1"
                        />
                        <span className="w-16 text-sm text-muted-foreground">{config.seatSize}px</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Espaçamento Fileiras</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Slider
                            value={[config.rowSpacing]}
                            onValueChange={([v]) => setConfig(prev => ({ ...prev, rowSpacing: v }))}
                            min={2}
                            max={20}
                            step={1}
                            className="flex-1"
                          />
                          <span className="w-10 text-xs text-muted-foreground">{config.rowSpacing}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Espaçamento Colunas</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Slider
                            value={[config.colSpacing]}
                            onValueChange={([v]) => setConfig(prev => ({ ...prev, colSpacing: v }))}
                            min={1}
                            max={10}
                            step={1}
                            className="flex-1"
                          />
                          <span className="w-10 text-xs text-muted-foreground">{config.colSpacing}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live preview */}
                <div className="bg-muted/30 rounded-xl p-6 flex flex-col items-center justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <svg viewBox="0 0 80 80" className="w-12 h-12 text-primary">
                      {renderShapePreview(selectedShape.id)}
                    </svg>
                    <h3 className="text-sm font-medium text-muted-foreground">{selectedShape.name}</h3>
                  </div>
                  
                  {renderMiniPreview()}
                  
                  <div className="mt-6 p-4 bg-background rounded-lg w-full max-w-xs">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total por setor:</span>
                        <span className="font-medium">{(config.rows * config.cols).toLocaleString()} assentos</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total geral:</span>
                        <span className="font-medium">{(config.rows * config.cols * config.sectors).toLocaleString()} assentos</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Preview */}
            {step === 'preview' && selectedShape && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-2">Confirme sua configuração</h2>
                  <p className="text-sm text-muted-foreground">
                    Revise os parâmetros antes de criar
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-muted/30 rounded-xl p-6 text-center">
                    <svg viewBox="0 0 80 80" className="w-24 h-24 mx-auto text-primary mb-4">
                      {renderShapePreview(selectedShape.id)}
                    </svg>
                    <h3 className="text-xl font-bold">{selectedShape.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{selectedShape.description}</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-muted/30 rounded-lg p-4">
                      <h4 className="font-medium mb-3">Resumo</h4>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Setores:</dt>
                          <dd className="font-medium">{config.sectors}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Fileiras por setor:</dt>
                          <dd className="font-medium">{config.rows}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Assentos por fileira:</dt>
                          <dd className="font-medium">{config.cols}</dd>
                        </div>
                        <div className="flex justify-between border-t border-border pt-2 mt-2">
                          <dt className="text-muted-foreground">Total de assentos:</dt>
                          <dd className="font-bold text-primary">{(config.rows * config.cols * config.sectors).toLocaleString()}</dd>
                        </div>
                      </dl>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      Após criar, você poderá ajustar os vértices da forma diretamente no canvas para personalizar o layout.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-border bg-muted/30 flex justify-between">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          
          <div className="flex gap-2">
            {step !== 'shape' && (
              <Button
                variant="outline"
                onClick={() => setStep(step === 'preview' ? 'config' : 'shape')}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            )}
            
            {step === 'config' && (
              <Button onClick={() => setStep('preview')}>
                Continuar
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            
            {step === 'preview' && (
              <Button onClick={handleComplete}>
                <Check className="h-4 w-4 mr-1" />
                Criar Setor
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
