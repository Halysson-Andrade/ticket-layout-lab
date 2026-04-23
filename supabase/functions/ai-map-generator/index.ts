// Edge function: ai-map-generator
// Recebe imagem (base64) + histórico de mensagens + dimensões do canvas
// Retorna plano estruturado de mapa (setores + assentos) + mensagem do assistente
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um especialista em análise de plantas e mapas de venues (estádios, teatros, cinemas, casas de show).
Sua missão é analisar a imagem fornecida e gerar um PLANO ESTRUTURADO para construir um mapa de assentos.

## Conhecimento do construtor (Map Studio)

O construtor possui:
- **Setores**: áreas com forma geométrica (rectangle, circle, trapezoid, pentagon, hexagon, triangle, arc, l-shape, u-shape, t-shape, diamond, octagon). Cada setor tem cor, opacidade, posição (x, y), tamanho (width, height) e curvatura (0-100).
- **Assentos por setor**: gerados em grade (rows x cols) com tipos: 'normal', 'pcd', 'companion', 'obeso', 'vip', 'blocked'. Labels de fila: 'alpha' (A,B,C), 'numeric' (1,2,3) ou 'roman' (I,II,III).
- **Elementos contextuais**: 'stage' (palco), 'bar', 'bathroom', 'entrance', 'exit', 'speaker', 'dj', 'screen', 'vip-area', 'food'.

## Regras de geração (modo conservador)

- Todos os assentos devem ter type "normal" e status "available" — não infira VIP/PCD a menos que esteja EXPLICITAMENTE rotulado na imagem.
- Use cores distintas e harmoniosas para cada setor (formato HSL).
- O canvas tem dimensões fornecidas em CANVAS_WIDTH x CANVAS_HEIGHT. Posicione setores PROPORCIONALMENTE à imagem analisada, mantendo o layout visual.
- Estime quantidade realista de assentos por setor olhando a densidade visível.
- Use rowSpacing 8, colSpacing 8 e seatSize 10 como padrão, ajustando se necessário.

## Formato de resposta

Você DEVE responder usando a função 'generate_map_plan' com a estrutura completa.
Sempre inclua um campo 'message' explicando o que detectou e como organizou o mapa.
Se o usuário pedir refinamentos (ex: "aumente o setor VIP", "remova o palco"), retorne o plano AJUSTADO mantendo o que faz sentido.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "generate_map_plan",
    description:
      "Gera um plano estruturado de mapa de venue baseado na análise da imagem.",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description:
            "Mensagem para o usuário explicando o que foi detectado, decisões tomadas e sugestões de refinamento. Use markdown e seja conciso (max 4 parágrafos).",
        },
        plan: {
          type: "object",
          properties: {
            sectors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  color: {
                    type: "string",
                    description: "Cor HSL no formato 'hsl(H, S%, L%)'",
                  },
                  shape: {
                    type: "string",
                    enum: [
                      "rectangle",
                      "circle",
                      "trapezoid",
                      "pentagon",
                      "hexagon",
                      "triangle",
                      "arc",
                      "l-shape",
                      "u-shape",
                      "t-shape",
                      "diamond",
                      "octagon",
                    ],
                  },
                  x: { type: "number", description: "Posição X em pixels do canvas" },
                  y: { type: "number", description: "Posição Y em pixels do canvas" },
                  width: { type: "number" },
                  height: { type: "number" },
                  curvature: {
                    type: "number",
                    description: "0 a 100 (apenas para arc ou rectangle curvo)",
                  },
                  rotation: { type: "number", description: "Ângulo em graus" },
                  rows: {
                    type: "number",
                    description: "Quantidade de fileiras de assentos (0 = sem assentos)",
                  },
                  cols: {
                    type: "number",
                    description: "Quantidade de assentos por fileira",
                  },
                  rowLabelType: {
                    type: "string",
                    enum: ["alpha", "numeric", "roman"],
                  },
                  labelPrefix: {
                    type: "string",
                    description: "Prefixo opcional (ex: 'VIP-')",
                  },
                },
                required: [
                  "name",
                  "color",
                  "shape",
                  "x",
                  "y",
                  "width",
                  "height",
                  "rows",
                  "cols",
                ],
                additionalProperties: false,
              },
            },
            elements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: [
                      "stage",
                      "bar",
                      "bathroom",
                      "entrance",
                      "exit",
                      "speaker",
                      "dj",
                      "screen",
                      "vip-area",
                      "food",
                    ],
                  },
                  label: { type: "string" },
                  x: { type: "number" },
                  y: { type: "number" },
                  width: { type: "number" },
                  height: { type: "number" },
                  rotation: { type: "number" },
                },
                required: ["type", "label", "x", "y", "width", "height"],
                additionalProperties: false,
              },
            },
          },
          required: ["sectors", "elements"],
          additionalProperties: false,
        },
      },
      required: ["message", "plan"],
      additionalProperties: false,
    },
  },
};

interface RequestBody {
  imageBase64?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  canvasWidth: number;
  canvasHeight: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body: RequestBody = await req.json();
    const { imageBase64, messages, canvasWidth, canvasHeight } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Mensagens são obrigatórias" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Constrói mensagens. A primeira mensagem do usuário inclui a imagem.
    const aiMessages: any[] = [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n\nCANVAS_WIDTH=${canvasWidth}\nCANVAS_HEIGHT=${canvasHeight}`,
      },
    ];

    messages.forEach((msg, idx) => {
      // Anexa a imagem APENAS na primeira mensagem do usuário
      if (idx === 0 && msg.role === "user" && imageBase64) {
        aiMessages.push({
          role: "user",
          content: [
            { type: "text", text: msg.content },
            {
              type: "image_url",
              image_url: { url: imageBase64 },
            },
          ],
        });
      } else {
        aiMessages.push({ role: msg.role, content: msg.content });
      }
    });

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: aiMessages,
          tools: [TOOL_SCHEMA],
          tool_choice: {
            type: "function",
            function: { name: "generate_map_plan" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({
            error:
              "Limite de requisições excedido. Aguarde alguns segundos e tente novamente.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({
            error:
              "Créditos da IA esgotados. Adicione créditos na sua workspace Lovable.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro no gateway de IA" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await aiResponse.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("Resposta inválida:", JSON.stringify(data));
      return new Response(
        JSON.stringify({
          error: "A IA não retornou um plano estruturado. Tente novamente.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        message: parsed.message,
        plan: parsed.plan,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("ai-map-generator error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
