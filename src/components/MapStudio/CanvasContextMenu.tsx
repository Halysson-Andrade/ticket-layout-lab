import React from 'react';
import { Plus, Trash2, Copy, Scissors } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAddVertex?: () => void;
  onRemoveVertex?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  showVertexOptions: boolean;
  showElementOptions: boolean;
  canRemoveVertex: boolean;
}

export const CanvasContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  onAddVertex,
  onRemoveVertex,
  onDuplicate,
  onDelete,
  showVertexOptions,
  showElementOptions,
  canRemoveVertex,
}) => {
  return (
    <>
      {/* Backdrop para fechar menu */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />
      
      {/* Menu */}
      <div 
        className="fixed z-50 bg-background border border-border rounded-lg shadow-xl py-1 min-w-[180px]"
        style={{ left: x, top: y }}
      >
        {showVertexOptions && (
          <>
            <button
              onClick={() => { onAddVertex?.(); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <Plus className="w-4 h-4 text-primary" />
              Adicionar ponto
            </button>
            
            {canRemoveVertex && (
              <button
                onClick={() => { onRemoveVertex?.(); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
                Remover ponto
              </button>
            )}
            
            <div className="border-t border-border my-1" />
          </>
        )}
        
        {showElementOptions && (
          <>
            <button
              onClick={() => { onDuplicate?.(); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <Copy className="w-4 h-4 text-muted-foreground" />
              Duplicar
            </button>
            
            <button
              onClick={() => { onDelete?.(); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          </>
        )}
        
        {!showVertexOptions && !showElementOptions && (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            Nenhuma ação disponível
          </div>
        )}
      </div>
    </>
  );
};
