import React, { useState } from 'react';
import { Film, Building2, Tent, Music, Theater, ChevronRight, ChevronLeft, Check, Armchair, LayoutGrid, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Template } from '@/types/mapStudio';
import { cn } from '@/lib/utils';

interface OnboardingWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: (template: Template, customParams: CustomParams) => void;
}

interface CustomParams {
  totalSeats: number;
  sectors: number;
  rows: number;
  cols: number;
  seatSize: number;
  rowSpacing: number;
  colSpacing: number;
}

const templates: Template[] = [
  {
    id: 'cinema',
    name: 'Cinema',
    description: 'Layout clássico de cinema com fileiras retas e corredor central',
    thumbnail: '🎬',
    category: 'cinema',
    defaultParams: {
      rows: 12,
      cols: 24,
      rowSpacing: 8,
      colSpacing: 2,
      seatSize: 16,
      rowLabelType: 'alpha',
      seatLabelType: 'numeric',
    },
    sectors: 2,
    totalSeats: 288,
  },
  {
    id: 'stadium',
    name: 'Estádio',
    description: 'Arquibancadas em formato de arena com múltiplos setores',
    thumbnail: '🏟️',
    category: 'stadium',
    defaultParams: {
      rows: 30,
      cols: 50,
      rowSpacing: 4,
      colSpacing: 2,
      seatSize: 12,
      rowLabelType: 'numeric',
      seatLabelType: 'numeric',
    },
    sectors: 8,
    totalSeats: 12000,
  },
  {
    id: 'circus',
    name: 'Circo',
    description: 'Disposição circular com visão 360° do picadeiro',
    thumbnail: '🎪',
    category: 'circus',
    defaultParams: {
      rows: 8,
      cols: 40,
      rowSpacing: 6,
      colSpacing: 4,
      seatSize: 18,
      rowLabelType: 'alpha',
      seatLabelType: 'numeric',
    },
    sectors: 4,
    totalSeats: 1280,
  },
  {
    id: 'show',
    name: 'Show/Evento',
    description: 'Palco frontal com pista e arquibancadas',
    thumbnail: '🎸',
    category: 'show',
    defaultParams: {
      rows: 20,
      cols: 40,
      rowSpacing: 4,
      colSpacing: 2,
      seatSize: 14,
      rowLabelType: 'numeric',
      seatLabelType: 'numeric',
    },
    sectors: 5,
    totalSeats: 4000,
  },
  {
    id: 'theater',
    name: 'Teatro',
    description: 'Palco italiano com plateia, mezanino e camarotes',
    thumbnail: '🎭',
    category: 'theater',
    defaultParams: {
      rows: 15,
      cols: 30,
      rowSpacing: 6,
      colSpacing: 3,
      seatSize: 18,
      rowLabelType: 'alpha',
      seatLabelType: 'numeric',
    },
    sectors: 3,
    totalSeats: 800,
  },
];

const categoryIcons: Record<string, React.ReactNode> = {
  cinema: <Film className="h-5 w-5" />,
  stadium: <Building2 className="h-5 w-5" />,
  circus: <Tent className="h-5 w-5" />,
  show: <Music className="h-5 w-5" />,
  theater: <Theater className="h-5 w-5" />,
};

type Step = 'template' | 'config' | 'preview';

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  open,
  onClose,
  onComplete,
}) => {
  const [step, setStep] = useState<Step>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [customParams, setCustomParams] = useState<CustomParams>({
    totalSeats: 500,
    sectors: 2,
    rows: 10,
    cols: 25,
    seatSize: 14,
    rowSpacing: 6,
    colSpacing: 2,
  });

  if (!open) return null;

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setCustomParams({
      totalSeats: template.totalSeats,
      sectors: template.sectors,
      rows: template.defaultParams?.rows || 10,
      cols: template.defaultParams?.cols || 25,
      seatSize: template.defaultParams?.seatSize || 14,
      rowSpacing: template.defaultParams?.rowSpacing || 6,
      colSpacing: template.defaultParams?.colSpacing || 2,
    });
    setStep('config');
  };

  const handleComplete = () => {
    if (selectedTemplate) {
      const updatedTemplate: Template = {
        ...selectedTemplate,
        totalSeats: customParams.totalSeats,
        sectors: customParams.sectors,
        defaultParams: {
          ...selectedTemplate.defaultParams,
          rows: customParams.rows,
          cols: customParams.cols,
          seatSize: customParams.seatSize,
          rowSpacing: customParams.rowSpacing,
          colSpacing: customParams.colSpacing,
        },
      };
      onComplete(updatedTemplate, customParams);
    }
  };

  const steps = [
    { id: 'template', label: 'Template', icon: LayoutGrid },
    { id: 'config', label: 'Configurar', icon: Settings },
    { id: 'preview', label: 'Preview', icon: Armchair },
  ];

  const renderMiniPreview = () => {
    if (!selectedTemplate) return null;
    
    const previewRows = Math.min(customParams.rows, 8);
    const previewCols = Math.min(customParams.cols, 12);
    const seatSize = 10;
    const spacing = 2;

    return (
      <div className="flex flex-col items-center gap-2">
        {/* Stage representation for theater/show/cinema */}
        {['theater', 'show', 'cinema'].includes(selectedTemplate.category) && (
          <div className="w-full max-w-[200px] h-6 bg-muted rounded-sm flex items-center justify-center text-xs text-muted-foreground mb-2">
            Palco
          </div>
        )}
        
        {/* Seats grid preview */}
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
        
        {/* Info */}
        <div className="text-xs text-muted-foreground mt-2 text-center">
          Mostrando {previewRows}x{previewCols} de {customParams.rows}x{customParams.cols}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header with steps */}
        <div className="px-8 py-6 border-b border-border bg-muted/30">
          <h1 className="text-2xl font-bold mb-4">Criar Novo Mapa</h1>
          
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {steps.map((s, index) => (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => {
                    if (s.id === 'template') setStep('template');
                    else if (s.id === 'config' && selectedTemplate) setStep('config');
                    else if (s.id === 'preview' && selectedTemplate) setStep('preview');
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
            {/* Step 1: Template Selection */}
            {step === 'template' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-2">Escolha um tipo de venue</h2>
                  <p className="text-sm text-muted-foreground">
                    Selecione o template que mais se aproxima do seu espaço
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className={cn(
                        "group text-left p-5 rounded-xl border-2 transition-all hover:scale-[1.02]",
                        selectedTemplate?.id === template.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
                      )}
                    >
                      <div className="text-5xl mb-3">{template.thumbnail}</div>
                      <div className="flex items-center gap-2 mb-2">
                        {categoryIcons[template.category]}
                        <h3 className="font-semibold text-lg">{template.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {template.description}
                      </p>
                      <div className="flex gap-4 text-xs">
                        <span className="px-2 py-1 bg-muted rounded">
                          {template.sectors} setores
                        </span>
                        <span className="px-2 py-1 bg-muted rounded">
                          ~{template.totalSeats.toLocaleString()} lugares
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Configuration */}
            {step === 'config' && selectedTemplate && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Config form */}
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-2">Configure seu mapa</h2>
                    <p className="text-sm text-muted-foreground">
                      Ajuste os parâmetros para seu espaço
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <Label className="text-sm font-medium">Total de Assentos Desejado</Label>
                      <div className="flex items-center gap-4 mt-2">
                        <Slider
                          value={[customParams.totalSeats]}
                          onValueChange={([v]) => {
                            setCustomParams(prev => ({
                              ...prev,
                              totalSeats: v,
                              rows: Math.ceil(Math.sqrt(v / prev.sectors)),
                              cols: Math.ceil(v / (prev.sectors * Math.ceil(Math.sqrt(v / prev.sectors)))),
                            }));
                          }}
                          min={50}
                          max={15000}
                          step={50}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          value={customParams.totalSeats}
                          onChange={(e) => setCustomParams(prev => ({ ...prev, totalSeats: parseInt(e.target.value) || 0 }))}
                          className="w-24"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Número de Setores</Label>
                      <div className="flex items-center gap-4 mt-2">
                        <Slider
                          value={[customParams.sectors]}
                          onValueChange={([v]) => setCustomParams(prev => ({ ...prev, sectors: v }))}
                          min={1}
                          max={12}
                          step={1}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          value={customParams.sectors}
                          onChange={(e) => setCustomParams(prev => ({ ...prev, sectors: parseInt(e.target.value) || 1 }))}
                          className="w-24"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Fileiras por Setor</Label>
                        <Input
                          type="number"
                          value={customParams.rows}
                          onChange={(e) => setCustomParams(prev => ({ ...prev, rows: parseInt(e.target.value) || 1 }))}
                          className="mt-2"
                          min={1}
                          max={100}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Assentos por Fileira</Label>
                        <Input
                          type="number"
                          value={customParams.cols}
                          onChange={(e) => setCustomParams(prev => ({ ...prev, cols: parseInt(e.target.value) || 1 }))}
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
                          value={[customParams.seatSize]}
                          onValueChange={([v]) => setCustomParams(prev => ({ ...prev, seatSize: v }))}
                          min={8}
                          max={24}
                          step={1}
                          className="flex-1"
                        />
                        <span className="w-16 text-sm text-muted-foreground">{customParams.seatSize}px</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Espaçamento Fileiras</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Slider
                            value={[customParams.rowSpacing]}
                            onValueChange={([v]) => setCustomParams(prev => ({ ...prev, rowSpacing: v }))}
                            min={2}
                            max={20}
                            step={1}
                            className="flex-1"
                          />
                          <span className="w-10 text-xs text-muted-foreground">{customParams.rowSpacing}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Espaçamento Colunas</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Slider
                            value={[customParams.colSpacing]}
                            onValueChange={([v]) => setCustomParams(prev => ({ ...prev, colSpacing: v }))}
                            min={1}
                            max={10}
                            step={1}
                            className="flex-1"
                          />
                          <span className="w-10 text-xs text-muted-foreground">{customParams.colSpacing}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live preview */}
                <div className="bg-muted/30 rounded-xl p-6 flex flex-col items-center justify-center">
                  <h3 className="text-sm font-medium mb-4 text-muted-foreground">Preview</h3>
                  {renderMiniPreview()}
                  
                  <div className="mt-6 p-4 bg-background rounded-lg w-full max-w-xs">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total calculado:</span>
                        <span className="font-medium">{(customParams.rows * customParams.cols * customParams.sectors).toLocaleString()} assentos</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Por setor:</span>
                        <span className="font-medium">{(customParams.rows * customParams.cols).toLocaleString()} assentos</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Final Preview */}
            {step === 'preview' && selectedTemplate && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-2">Confirme sua configuração</h2>
                  <p className="text-sm text-muted-foreground">
                    Revise os detalhes antes de criar o mapa
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-muted/30 rounded-xl p-6">
                    <div className="text-5xl mb-4">{selectedTemplate.thumbnail}</div>
                    <h3 className="text-xl font-semibold">{selectedTemplate.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{selectedTemplate.description}</p>
                  </div>

                  <div className="bg-muted/30 rounded-xl p-6 space-y-4">
                    <h4 className="font-medium">Configuração Final</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-3 bg-background rounded-lg">
                        <div className="text-muted-foreground text-xs">Total de Assentos</div>
                        <div className="text-lg font-bold">{(customParams.rows * customParams.cols * customParams.sectors).toLocaleString()}</div>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <div className="text-muted-foreground text-xs">Setores</div>
                        <div className="text-lg font-bold">{customParams.sectors}</div>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <div className="text-muted-foreground text-xs">Fileiras</div>
                        <div className="text-lg font-bold">{customParams.rows}</div>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <div className="text-muted-foreground text-xs">Assentos/Fileira</div>
                        <div className="text-lg font-bold">{customParams.cols}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Pronto para criar!</p>
                    <p className="text-sm text-muted-foreground">
                      Após criar, você poderá editar livremente setores, assentos e adicionar elementos.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-border bg-muted/30 flex items-center justify-between">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          
          <div className="flex gap-2">
            {step !== 'template' && (
              <Button 
                variant="outline" 
                onClick={() => setStep(step === 'preview' ? 'config' : 'template')}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            )}
            
            {step === 'config' && (
              <Button onClick={() => setStep('preview')}>
                Continuar
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            
            {step === 'preview' && (
              <Button onClick={handleComplete} className="bg-primary">
                <Check className="h-4 w-4 mr-2" />
                Criar Mapa
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
