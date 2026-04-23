import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Loader2, Check, RotateCcw, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AIMapPlan, summarizePlan } from '@/lib/aiMapPlan';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  plan?: AIMapPlan;
}

// Cache do relatório de análise visual produzido na FASE 1.
// Reutilizamos em refinamentos para evitar reanalisar a imagem (mais rápido + mais barato + mais consistente).

interface AIMapAssistantProps {
  open: boolean;
  onClose: () => void;
  imageBase64: string | null;
  canvasWidth: number;
  canvasHeight: number;
  onApplyPlan: (plan: AIMapPlan) => void;
}

export const AIMapAssistant: React.FC<AIMapAssistantProps> = ({
  open,
  onClose,
  imageBase64,
  canvasWidth,
  canvasHeight,
  onApplyPlan,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(null);
  const [cachedAnalysis, setCachedAnalysis] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset ao abrir com nova imagem + extrai dimensões reais da imagem
  useEffect(() => {
    if (open && imageBase64) {
      setMessages([]);
      setInput('');
      setCachedAnalysis(null);
      const img = new Image();
      img.onload = () => {
        setImageDims({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => setImageDims(null);
      img.src = imageBase64;
    }
  }, [open, imageBase64]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!imageBase64) {
      toast.error('Importe uma imagem primeiro');
      return;
    }
    if (!text.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    // Primeira chamada => fase 1 (análise) + fase 2 (geração). Demais => apenas geração.
    setLoadingStage(
      cachedAnalysis
        ? 'Refinando plano...'
        : 'Analisando imagem em detalhe (fase 1/2)...'
    );

    try {
      const { data, error } = await supabase.functions.invoke(
        'ai-map-generator',
        {
          body: {
            imageBase64,
            messages: newMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            canvasWidth,
            canvasHeight,
            imageWidth: imageDims?.width ?? null,
            imageHeight: imageDims?.height ?? null,
            cachedAnalysis,
          },
        }
      );

      if (error) {
        const status = (error as any).context?.status;
        if (status === 429) {
          toast.error('Muitas requisições. Aguarde alguns segundos.');
        } else if (status === 402) {
          toast.error('Créditos da IA esgotados. Adicione créditos na sua workspace.');
        } else {
          toast.error(error.message || 'Falha ao consultar IA');
        }
        setMessages(messages); // rollback
        return;
      }

      if (!data?.plan) {
        toast.error(data?.error || 'A IA não retornou um plano válido');
        setMessages(messages);
        return;
      }

      // Cacheia o relatório de análise para reutilizar em refinamentos
      if (data.analysis && !cachedAnalysis) {
        setCachedAnalysis(data.analysis);
      }

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.message || 'Aqui está o plano gerado.',
        plan: data.plan,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('AI assistant error:', err);
      toast.error('Erro ao conversar com a IA');
      setMessages(messages);
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  const handleStartAnalysis = () => {
    sendMessage(
      'Analise esta imagem em DETALHE e RECRIE fielmente o layout no canvas — como uma cópia visual exata. Inclua TODOS os setores visíveis (não agrupe nem simplifique), mantendo posições, tamanhos, cores, formas, rotações e contagens reais de fileiras/assentos. Inclua palco e elementos contextuais.'
    );
  };

  const handleApply = (plan: AIMapPlan) => {
    onApplyPlan(plan);
    toast.success('Plano aplicado ao mapa!');
  };

  const handleReset = () => {
    setMessages([]);
    setInput('');
    setCachedAnalysis(null);
  };

  if (!open) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-96 bg-card/95 backdrop-blur-md border-l border-border shadow-2xl z-30 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-purple-500/10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Assistente IA</h3>
            <p className="text-[10px] text-muted-foreground">
              Gere mapas a partir de imagens
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleReset}
              title="Recomeçar conversa"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Estado: sem imagem */}
      {!imageBase64 && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
          <ImageOff className="h-12 w-12 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Importe uma imagem</h4>
          <p className="text-xs text-muted-foreground">
            Para a IA gerar um mapa, importe primeiro uma imagem de fundo
            (planta, foto do venue ou layout esquemático).
          </p>
        </div>
      )}

      {/* Chat */}
      {imageBase64 && (
        <>
          <ScrollArea className="flex-1" ref={scrollRef as any}>
            <div className="p-4 space-y-3">
              {/* Mensagem inicial */}
              {messages.length === 0 && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border p-3 bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-2">
                      <Sparkles className="h-3 w-3 inline mr-1" />
                      Imagem detectada e pronta para análise.
                    </p>
                    <p className="text-xs">
                      Clique em <strong>Analisar imagem</strong> para que a IA
                      identifique setores, formas e elementos automaticamente.
                      Depois você pode pedir refinamentos no chat.
                    </p>
                  </div>
                  <Button
                    onClick={handleStartAnalysis}
                    className="w-full bg-gradient-to-r from-primary to-purple-500 hover:opacity-90"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Analisar imagem
                  </Button>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex flex-col gap-2',
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[90%] rounded-lg px-3 py-2 text-xs',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-xs prose-invert max-w-none [&>*]:my-1 [&_p]:text-xs [&_li]:text-xs [&_strong]:text-foreground">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>

                  {msg.plan && (
                    <div className="w-full rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px]">
                          Plano gerado
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {summarizePlan(msg.plan)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={() => handleApply(msg.plan!)}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Aplicar este plano no mapa
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-md border border-border/60 bg-muted/40 p-2">
                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                  <span>{loadingStage || 'IA processando...'}</span>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t border-border space-y-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                messages.length === 0
                  ? 'Ou descreva o que deseja gerar...'
                  : 'Refinar: "aumente o setor VIP", "remova o palco"...'
              }
              className="min-h-[60px] text-xs resize-none"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
            />
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">
                Ctrl+Enter para enviar
              </p>
              <Button
                size="sm"
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                className="h-8 text-xs"
              >
                <Send className="h-3 w-3 mr-1" />
                Enviar
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
