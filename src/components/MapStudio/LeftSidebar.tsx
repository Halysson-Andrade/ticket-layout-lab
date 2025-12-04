import React from 'react';
import { 
  Armchair, 
  Square, 
  Star,
  Accessibility,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  ChevronDown,
  ChevronRight,
  Palette,
  Layers,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sector, VenueElement, SeatType, SEAT_COLORS, ElementType, FurnitureType, TableConfig, ELEMENT_ICONS } from '@/types/mapStudio';
import { cn } from '@/lib/utils';
import { ElementsPanel } from './ElementsPanel';
import { FurnitureSelector } from './FurnitureSelector';

interface LeftSidebarProps {
  sectors: Sector[];
  elements: VenueElement[];
  selectedIds: string[];
  onSelectSector: (id: string) => void;
  onToggleSectorVisibility: (id: string) => void;
  onToggleSectorLock: (id: string) => void;
  onDeleteSector: (id: string) => void;
  onDeleteElement: (id: string) => void;
  activeSeatType: SeatType;
  onSeatTypeChange: (type: SeatType) => void;
  activeFurnitureType: FurnitureType;
  onFurnitureTypeChange: (type: FurnitureType) => void;
  tableConfig: TableConfig;
  onTableConfigChange: (config: TableConfig) => void;
  onAddElement: (type: ElementType) => void;
}

const seatTypes: { type: SeatType; label: string; icon: React.ReactNode }[] = [
  { type: 'normal', label: 'Normal', icon: <Armchair className="h-4 w-4" /> },
  { type: 'pcd', label: 'PCD', icon: <Accessibility className="h-4 w-4" /> },
  { type: 'companion', label: 'Acompanhante', icon: <Star className="h-4 w-4" /> },
  { type: 'obeso', label: 'Obeso', icon: <Square className="h-4 w-4" /> },
  { type: 'vip', label: 'VIP', icon: <Star className="h-4 w-4" /> },
  { type: 'blocked', label: 'Bloqueado', icon: <Lock className="h-4 w-4" /> },
];

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  sectors,
  elements,
  selectedIds,
  onSelectSector,
  onToggleSectorVisibility,
  onToggleSectorLock,
  onDeleteSector,
  onDeleteElement,
  activeSeatType,
  onSeatTypeChange,
  activeFurnitureType,
  onFurnitureTypeChange,
  tableConfig,
  onTableConfigChange,
  onAddElement,
}) => {
  const [sectorsOpen, setSectorsOpen] = React.useState(true);
  const [typesOpen, setTypesOpen] = React.useState(true);
  const [elementsOpen, setElementsOpen] = React.useState(false);
  const [furnitureOpen, setFurnitureOpen] = React.useState(false);

  return (
    <div className="absolute left-4 top-20 bottom-4 w-72 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg z-10 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-semibold text-sm">Ferramentas & Camadas</h2>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Tipos de Assento */}
          <Collapsible open={typesOpen} onOpenChange={setTypesOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium hover:text-primary transition-colors">
              {typesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Palette className="h-4 w-4" />
              <span>Tipos de Assento</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 pl-6">
              <div className="grid grid-cols-2 gap-1.5">
                {seatTypes.map(({ type, label, icon }) => (
                  <button
                    key={type}
                    onClick={() => onSeatTypeChange(type)}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-all",
                      activeSeatType === type
                        ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                        : "hover:bg-muted"
                    )}
                  >
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: SEAT_COLORS[type] }}
                    />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Selecione assentos e clique em um tipo para aplicar
              </p>
            </CollapsibleContent>
          </Collapsible>

          {/* Tipo de Mobília */}
          <Collapsible open={furnitureOpen} onOpenChange={setFurnitureOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium hover:text-primary transition-colors">
              {furnitureOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Armchair className="h-4 w-4" />
              <span>Mobília (Mesa/Bistrô)</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 pl-4">
              <FurnitureSelector
                selectedType={activeFurnitureType}
                tableConfig={tableConfig}
                onTypeChange={onFurnitureTypeChange}
                onTableConfigChange={onTableConfigChange}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Elementos do Evento */}
          <Collapsible open={elementsOpen} onOpenChange={setElementsOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium hover:text-primary transition-colors">
              {elementsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <MapPin className="h-4 w-4" />
              <span>Elementos ({elements.length})</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 pl-4">
              <ElementsPanel onAddElement={onAddElement} />
              
              {elements.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-[10px] text-muted-foreground mb-1">Elementos no mapa:</p>
                  {elements.map((el) => (
                    <div
                      key={el.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded text-xs bg-muted/50 group"
                    >
                      <span>{ELEMENT_ICONS[el.type]}</span>
                      <span className="flex-1 truncate">{el.label}</span>
                      <button
                        className="p-0.5 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                        onClick={() => onDeleteElement(el.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Setores */}
          <Collapsible open={sectorsOpen} onOpenChange={setSectorsOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium hover:text-primary transition-colors">
              {sectorsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Layers className="h-4 w-4" />
              <span>Setores ({sectors.length})</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 pl-2">
              {sectors.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Nenhum setor criado.<br/>
                  Use <strong>Novo Mapa</strong> ou ferramenta <strong>Setor (R)</strong>
                </p>
              ) : (
                <div className="space-y-1">
                  {sectors.map((sector) => (
                    <div
                      key={sector.id}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer transition-all group",
                        selectedIds.includes(sector.id)
                          ? "bg-primary/20 text-primary"
                          : "hover:bg-muted"
                      )}
                      onClick={() => onSelectSector(sector.id)}
                    >
                      <div
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: sector.color }}
                      />
                      <span className="flex-1 truncate text-xs">{sector.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {sector.seats.length}
                      </span>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-0.5 hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSectorVisibility(sector.id);
                          }}
                        >
                          {sector.visible ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3" />
                          )}
                        </button>
                        <button
                          className="p-0.5 hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSectorLock(sector.id);
                          }}
                        >
                          {sector.locked ? (
                            <Lock className="h-3 w-3" />
                          ) : (
                            <Unlock className="h-3 w-3" />
                          )}
                        </button>
                        <button
                          className="p-0.5 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSector(sector.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
};
