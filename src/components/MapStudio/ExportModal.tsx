import React from 'react';
import { Download, Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  data: object;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  open,
  onClose,
  data,
}) => {
  const [copied, setCopied] = React.useState(false);
  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    toast.success('JSON copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `venue-map-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Arquivo JSON baixado!');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Exportar Mapa (JSON)
          </DialogTitle>
          <DialogDescription>
            Exporte o mapa para integrar com seu sistema de vendas
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[400px] border border-border rounded-lg">
          <pre className="p-4 text-xs font-mono text-muted-foreground whitespace-pre-wrap">
            {jsonString}
          </pre>
        </ScrollArea>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </>
            )}
          </Button>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Baixar JSON
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
