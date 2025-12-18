import React, { useState } from 'react';
import { Ban, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface BlockSeatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seatCount: number;
  onConfirm: (description?: string) => void;
}

export const BlockSeatModal: React.FC<BlockSeatModalProps> = ({
  open,
  onOpenChange,
  seatCount,
  onConfirm,
}) => {
  const [addDescription, setAddDescription] = useState(false);
  const [description, setDescription] = useState('');

  const handleConfirm = () => {
    onConfirm(addDescription && description.trim() ? description.trim() : undefined);
    setAddDescription(false);
    setDescription('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setAddDescription(false);
    setDescription('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            Bloquear {seatCount > 1 ? `${seatCount} Assentos` : 'Assento'}
          </DialogTitle>
          <DialogDescription>
            Os assentos bloqueados não poderão ser vendidos ou reservados.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="add-description"
              checked={addDescription}
              onCheckedChange={(checked) => setAddDescription(checked === true)}
            />
            <Label 
              htmlFor="add-description" 
              className="text-sm cursor-pointer flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Adicionar motivo do bloqueio
            </Label>
          </div>
          
          {addDescription && (
            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs text-muted-foreground">
                Descrição (opcional)
              </Label>
              <Textarea
                id="description"
                placeholder="Ex: Visão obstruída, manutenção, reserva especial..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px] resize-none"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground text-right">
                {description.length}/200
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            <Ban className="h-4 w-4 mr-2" />
            Bloquear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
