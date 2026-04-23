// Edge function: ai-map-generator
// Recebe imagem (base64) + dimensões reais da imagem + dimensões do canvas
// Retorna plano estruturado de mapa que REPLICA fielmente o layout da imagem
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um especialista em VETORIZAÇÃO DE PLANTAS de venues (estádios, teatros, cinemas, casas de show).
Sua missão é OLHAR a imagem fornecida e RECRIAR fielmente o layout no canvas, como se estivesse decalcando a imagem — uma CÓPIA visual.

## Princípio fundamental: FIDELIDADE VISUAL

O mapa gerado DEVE ser uma reprodução fiel da imagem:
- A posição (x, y) de cada setor no canvas deve corresponder EXATAMENTE à posição visual do setor na imagem (após mapeamento de escala).
- O tamanho (width, height) de cada setor deve refletir a proporção real do setor na imagem.
- A forma escolhida (rectangle, circle, arc, trapezoid, etc.) deve ser a que MELHOR se aproxima visualmente do contorno do setor na imagem.
- A orientação (rotation) deve seguir a inclinação visual do setor na imagem.
- A quantidade de fileiras (rows) e assentos por fileira (cols) deve refletir a DENSIDADE VISUAL aparente — conte/estime olhando linhas e colunas visíveis.
- Se necessário, "amplie mentalmente" (zoom) regiões da imagem para contar fileiras com mais precisão.

## Conhecimento do construtor (Map Studio)

- **Setores**: shape ∈ [rectangle, circle, trapezoid, pentagon, hexagon, triangle, arc, l-shape, u-shape, t-shape, diamond, octagon]. Cada setor tem cor (HSL), opacidade, posição (x, y = canto SUPERIOR ESQUERDO da bounding box), tamanho (width, height) e curvatura (0-100, útil para arquibancadas curvas).
- **Assentos por setor**: gerados em grade (rows x cols). Tipo padrão: 'normal'. Labels: 'alpha' (A,B,C…), 'numeric' (1,2,3…) ou 'roman' (I,II,III…).
- **Elementos contextuais**: stage, bar, bathroom, entrance, exit, speaker, dj, screen, vip-area, food.

## Mapeamento de coordenadas (CRÍTICO)

Você receberá:
- IMAGE_WIDTH × IMAGE_HEIGHT: dimensões REAIS da imagem em pixels.
- CANVAS_WIDTH × CANVAS_HEIGHT: dimensões do canvas onde o mapa será desenhado.

Calcule a escala UNIFORME (preservando aspect ratio) para encaixar a imagem no canvas:
  scale = min(CANVAS_WIDTH / IMAGE_WIDTH, CANVAS_HEIGHT / IMAGE_HEIGHT)
  offsetX = (CANVAS_WIDTH  - IMAGE_WIDTH  * scale) / 2
  offsetY = (CANVAS_HEIGHT - IMAGE_HEIGHT * scale) / 2

Para cada setor identificado na imagem em coordenadas (img_x, img_y, img_w, img_h):
  canvas_x = offsetX + img_x * scale
  canvas_y = offsetY + img_y * scale
  canvas_w = img_w * scale
  canvas_h = img_h * scale

USE ESSE MAPEAMENTO. As coordenadas que você retornar (x, y, width, height) devem ser as coordenadas FINAIS no canvas após esse cálculo.

## Regras de geração (modo conservador)

- Todos os assentos type "normal", status "available". NÃO infira VIP/PCD a menos que esteja EXPLICITAMENTE rotulado.
- Cores HSL distintas e harmoniosas por setor (varie matiz, mantenha saturação ~60% e luminosidade ~55%).
- Para arquibancadas em arco/curvas, use shape "arc" com curvature entre 30 e 80.
- Para palcos, use elemento type "stage" no local visual correto da imagem.
- Identifique TODOS os setores visíveis, mesmo os pequenos. Não simplifique — o objetivo é fidelidade.

## Refinamentos via chat

Se o usuário pedir ajustes ("aumente o setor VIP", "reposicione o palco", "remova X"), retorne o plano AJUSTADO mantendo a fidelidade do restante.

Sempre responda usando a função 'generate_map_plan'.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "generate_map_plan",
    description:
      "Gera um plano estruturado de mapa de venue REPLICANDO fielmente o layout visual da imagem analisada.",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description:
            "Mensagem ao usuário explicando o que detectou, como mapeou para o canvas e sugestões de refinamento. Markdown, máx 4 parágrafos.",
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
                  x: {
                    type: "number",
                    description:
                      "Posição X (canto superior esquerdo) em pixels do CANVAS, JÁ aplicado o mapeamento de escala da imagem.",
                  },
                  y: {
                    type: "number",
                    description:
                      "Posição Y (canto superior esquerdo) em pixels do CANVAS, JÁ aplicado o mapeamento de escala da imagem.",
                  },
                  width: {
                    type: "number",
                    description: "Largura em pixels do canvas (após escala).",
                  },
                  height: {
                    type: "number",
                    description: "Altura em pixels do canvas (após escala).",
                  },
                  curvature: {
                    type: "number",
                    description:
                      "0 a 100. Use 30-80 para arquibancadas em arco.",
                  },
                  rotation: {
                    type: "number",
                    description:
                      "Ângulo em graus, refletindo a inclinação visual do setor na imagem.",
                  },
                  rows: {
                    type: "number",
                    description:
                      "Quantidade ESTIMADA de fileiras visíveis na imagem (0 = sem assentos).",
                  },
                  cols: {
                    type: "number",
                    description:
                      "Quantidade ESTIMADA de assentos por fileira visíveis na imagem.",
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
                  x: {
                    type: "number",
                    description:
                      "Posição X em pixels do CANVAS, JÁ mapeada da imagem.",
                  },
                  y: {
                    type: "number",
                    description:
                      "Posição Y em pixels do CANVAS, JÁ mapeada da imagem.",
                  },
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
  imageWidth?: number | null;
  imageHeight?: number | null;
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
    const {
      imageBase64,
      messages,
      canvasWidth,
      canvasHeight,
      imageWidth,
      imageHeight,
    } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Mensagens são obrigatórias" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calcula mapeamento sugerido (também enviado ao modelo como dica explícita)
    let mappingHint = "";
    if (imageWidth && imageHeight) {
      const scale = Math.min(
        canvasWidth / imageWidth,
        canvasHeight / imageHeight
      );
      const offsetX = (canvasWidth - imageWidth * scale) / 2;
      const offsetY = (canvasHeight - imageHeight * scale) / 2;
      mappingHint = `\n\n## MAPEAMENTO PRÉ-CALCULADO (use exatamente estes valores)
IMAGE_WIDTH=${imageWidth}
IMAGE_HEIGHT=${imageHeight}
CANVAS_WIDTH=${canvasWidth}
CANVAS_HEIGHT=${canvasHeight}
scale=${scale.toFixed(6)}
offsetX=${offsetX.toFixed(2)}
offsetY=${offsetY.toFixed(2)}

Para CADA setor/elemento que você identificar na imagem em coords (img_x, img_y, img_w, img_h):
  canvas_x = ${offsetX.toFixed(2)} + img_x * ${scale.toFixed(6)}
  canvas_y = ${offsetY.toFixed(2)} + img_y * ${scale.toFixed(6)}
  canvas_w = img_w * ${scale.toFixed(6)}
  canvas_h = img_h * ${scale.toFixed(6)}

RETORNE x, y, width, height JÁ COM ESSE CÁLCULO APLICADO.`;
    } else {
      mappingHint = `\n\nCANVAS_WIDTH=${canvasWidth}\nCANVAS_HEIGHT=${canvasHeight}\n(Dimensões da imagem não fornecidas — estime proporcionalmente.)`;
    }

    const aiMessages: any[] = [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}${mappingHint}`,
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
