import React, { useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  title: string;
  shortcuts: ShortcutItem[];
}

const sections: ShortcutSection[] = [
  {
    title: 'Navegação',
    shortcuts: [
      { keys: ['Scroll'], description: 'Zoom in/out' },
      { keys: ['Clique direito', 'Arrastar'], description: 'Pan (mover canvas)' },
      { keys: ['Espaço', 'Arrastar'], description: 'Pan temporário' },
      { keys: ['Ctrl', '+'], description: 'Zoom in' },
      { keys: ['Ctrl', '-'], description: 'Zoom out' },
      { keys: ['Ctrl', '0'], description: 'Ajustar à tela' },
    ],
  },
  {
    title: 'Seleção',
    shortcuts: [
      { keys: ['Clique'], description: 'Selecionar setor/assento' },
      { keys: ['Shift', 'Clique'], description: 'Adicionar à seleção' },
      { keys: ['Arrastar'], description: 'Seleção em caixa (lasso)' },
      { keys: ['Ctrl', 'A'], description: 'Selecionar todos' },
      { keys: ['Esc'], description: 'Limpar seleção' },
    ],
  },
  {
    title: 'Edição',
    shortcuts: [
      { keys: ['Ctrl', 'Z'], description: 'Desfazer' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Refazer' },
      { keys: ['Ctrl', 'Y'], description: 'Refazer (alternativo)' },
      { keys: ['Ctrl', 'C'], description: 'Copiar setor(es)' },
      { keys: ['Ctrl', 'V'], description: 'Colar setor(es)' },
      { keys: ['Ctrl', 'D'], description: 'Duplicar setor(es)' },
      { keys: ['Delete'], description: 'Excluir selecionado' },
      { keys: ['Backspace'], description: 'Excluir selecionado' },
    ],
  },
  {
    title: 'Ferramentas',
    shortcuts: [
      { keys: ['V'], description: 'Ferramenta de seleção' },
      { keys: ['H'], description: 'Ferramenta de pan' },
      { keys: ['S'], description: 'Criar setor' },
      { keys: ['G'], description: 'Gerador de assentos' },
      { keys: ['E'], description: 'Adicionar elemento' },
    ],
  },
  {
    title: 'Formas e Setores',
    shortcuts: [
      { keys: ['R'], description: 'Rotacionar 90° horário' },
      { keys: ['Shift', 'R'], description: 'Rotacionar 90° anti-horário' },
      { keys: ['F'], description: 'Espelhar horizontal' },
      { keys: ['Shift', 'F'], description: 'Espelhar vertical' },
    ],
  },
];

export const KeyboardShortcuts: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Atalhos de teclado"
        >
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Atalhos de Teclado
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto py-2">
          {sections.map((section) => (
            <div key={section.title}>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                {section.title}
              </h4>
              <div className="space-y-1.5">
                {section.shortcuts.map((shortcut, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/50"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, ki) => (
                        <React.Fragment key={ki}>
                          <kbd className="px-2 py-0.5 text-xs font-mono bg-background border border-border rounded shadow-sm">
                            {key}
                          </kbd>
                          {ki < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
