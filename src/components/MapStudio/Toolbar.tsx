import React from 'react';
import { 
  MousePointer2, 
  Hand, 
  Square, 
  Grid3X3, 
  Circle, 
  Layers,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Download,
  Upload,
  Image,
  Trash2,
  Copy,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ToolType } from '@/types/mapStudio';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onExport: () => void;
  onImportImage: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  zoom: number;
}

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({ 
  icon, label, shortcut, active, disabled, onClick 
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-9 w-9 p-0 transition-all",
          active && "bg-primary/20 text-primary hover:bg-primary/30",
          disabled && "opacity-40 cursor-not-allowed"
        )}
        onClick={onClick}
        disabled={disabled}
      >
        {icon}
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="flex items-center gap-2">
      <span>{label}</span>
      {shortcut && (
        <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded font-mono">
          {shortcut}
        </kbd>
      )}
    </TooltipContent>
  </Tooltip>
);

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onExport,
  onImportImage,
  onDelete,
  onDuplicate,
  canUndo,
  canRedo,
  hasSelection,
  zoom,
}) => {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-card/95 backdrop-blur-sm border border-border rounded-lg px-2 py-1.5 shadow-lg">
      {/* Ferramentas de Seleção */}
      <ToolButton
        icon={<MousePointer2 className="h-4 w-4" />}
        label="Selecionar"
        shortcut="V"
        active={activeTool === 'select'}
        onClick={() => onToolChange('select')}
      />
      <ToolButton
        icon={<Hand className="h-4 w-4" />}
        label="Mover Canvas"
        shortcut="H"
        active={activeTool === 'pan'}
        onClick={() => onToolChange('pan')}
      />
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      {/* Ferramentas de Criação */}
      <ToolButton
        icon={<Square className="h-4 w-4" />}
        label="Criar Setor"
        shortcut="R"
        active={activeTool === 'sector'}
        onClick={() => onToolChange('sector')}
      />
      <ToolButton
        icon={<Grid3X3 className="h-4 w-4" />}
        label="Gerar Grade de Assentos"
        shortcut="G"
        active={activeTool === 'seat-grid'}
        onClick={() => onToolChange('seat-grid')}
      />
      <ToolButton
        icon={<Circle className="h-4 w-4" />}
        label="Assento Individual"
        shortcut="S"
        active={activeTool === 'seat-single'}
        onClick={() => onToolChange('seat-single')}
      />
      <ToolButton
        icon={<Layers className="h-4 w-4" />}
        label="Adicionar Elemento"
        shortcut="E"
        active={activeTool === 'element'}
        onClick={() => onToolChange('element')}
      />
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      {/* Ações de Edição */}
      <ToolButton
        icon={<Undo2 className="h-4 w-4" />}
        label="Desfazer"
        shortcut="⌘Z"
        disabled={!canUndo}
        onClick={onUndo}
      />
      <ToolButton
        icon={<Redo2 className="h-4 w-4" />}
        label="Refazer"
        shortcut="⌘⇧Z"
        disabled={!canRedo}
        onClick={onRedo}
      />
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      {/* Ações de Seleção */}
      <ToolButton
        icon={<Copy className="h-4 w-4" />}
        label="Duplicar"
        shortcut="⌘D"
        disabled={!hasSelection}
        onClick={onDuplicate}
      />
      <ToolButton
        icon={<Trash2 className="h-4 w-4" />}
        label="Excluir"
        shortcut="Del"
        disabled={!hasSelection}
        onClick={onDelete}
      />
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      {/* Zoom */}
      <ToolButton
        icon={<ZoomOut className="h-4 w-4" />}
        label="Diminuir Zoom"
        shortcut="-"
        onClick={onZoomOut}
      />
      <span className="text-xs font-medium text-muted-foreground w-12 text-center">
        {Math.round(zoom * 100)}%
      </span>
      <ToolButton
        icon={<ZoomIn className="h-4 w-4" />}
        label="Aumentar Zoom"
        shortcut="+"
        onClick={onZoomIn}
      />
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      {/* Import/Export */}
      <ToolButton
        icon={<Image className="h-4 w-4" />}
        label="Importar Imagem de Fundo"
        onClick={onImportImage}
      />
      <ToolButton
        icon={<Download className="h-4 w-4" />}
        label="Exportar JSON"
        onClick={onExport}
      />
    </div>
  );
};
