import React from 'react';
import { Film, Building2, Tent, Music, Theater, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Template } from '@/types/mapStudio';

interface TemplatesPanelProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate: (template: Template) => void;
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

export const TemplatesPanel: React.FC<TemplatesPanelProps> = ({
  open,
  onClose,
  onSelectTemplate,
}) => {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-8">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold">Galeria de Templates</h2>
            <p className="text-sm text-muted-foreground">
              Escolha um template como ponto de partida
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => {
                  onSelectTemplate(template);
                  onClose();
                }}
                className="group text-left p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{template.thumbnail}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {categoryIcons[template.category]}
                      <h3 className="font-medium group-hover:text-primary transition-colors">
                        {template.name}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {template.description}
                    </p>
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{template.sectors} setores</span>
                      <span>~{template.totalSeats.toLocaleString()} lugares</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Templates são pontos de partida editáveis. Você pode modificar todos os parâmetros após a criação.
          </p>
        </div>
      </div>
    </div>
  );
};
