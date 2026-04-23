// Edge function: ai-map-generator
// Pipeline em 2 fases:
//   Fase 1 — Análise visual: descreve a imagem em texto estruturado (setores, cores, contagens reais)
//   Fase 2 — Geração: usa a análise + imagem para produzir um plano JSON via tool calling
// Esta abordagem aumenta drasticamente a fidelidade visual da reconstrução.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// =====================================================================
// FASE 1 — Análise visual exaustiva
// =====================================================================
const ANALYSIS_PROMPT = `Você é um analista visual especializado em PLANTAS DE VENUES (estádios, teatros, casas de show, cinemas).
Sua tarefa é EXAMINAR exaustivamente a imagem fornecida e produzir um relatório técnico DETALHADO em texto.

## NÃO gere JSON nem código. Produza um relatório descritivo em markdown.

## O relatório deve conter, OBRIGATORIAMENTE:

### 1. Visão geral
- Tipo de venue (arena, teatro, anfiteatro, etc.)
- Orientação geral (palco em cima/baixo/esquerda/direita)
- Dimensões aproximadas em pixels da imagem original (você receberá IMAGE_WIDTH x IMAGE_HEIGHT)

### 2. Inventário de SETORES (um a um, sem pular nenhum)
Para CADA setor visível na imagem, liste:
- **Nome / Identificação**: rótulo visível ou descrição (ex: "Setor azul superior", "Plateia verde central", "Camarote PCD direito")
- **Cor predominante**: nome em português + estimativa HSL (ex: "azul forte ~ hsl(210, 65%, 50%)")
- **Posição na imagem (em pixels)**: bounding box (x_topo_esquerdo, y_topo_esquerdo, largura, altura) — USE coordenadas REAIS da imagem original
- **Forma geométrica visual**: rectangle, trapezoid (qual lado é maior), arc/curva (qual o grau de curvatura aparente: leve / moderada / acentuada), pentagon, hexagon, l-shape, u-shape, t-shape, triangle, diamond, octagon, circle
- **Inclinação/rotação aparente** em graus (0 se reto)
- **Fileiras visíveis**: CONTE olhando a imagem (use zoom mental nas linhas A, B, C…). Indique quantas linhas distintas aparecem.
- **Assentos por fileira**: CONTE a fileira mais larga e a mais estreita; se variar, dê uma média
- **Tipo de label das fileiras** (alpha A,B,C / numeric 1,2,3 / roman I,II,III) se visível
- **Observações** (ocupações, áreas vazias, etc.)

### 3. Elementos contextuais
Liste palco (stage), bares (bar), banheiros (bathroom), entradas (entrance), saídas (exit), DJ, telão (screen), área VIP rotulada, food, etc., COM posições em pixels da imagem original.

### 4. Notas de fidelidade
Aponte:
- Quais setores são pequenos e fáceis de esquecer
- Setores com formas atípicas
- Diferenças de densidade de assentos
- Qualquer rótulo legível na imagem (ex: "PCD", "VIP", "Camarote")

## Diretrizes
- Seja METICULOSO. É melhor enumerar 12 setores do que agrupar em 4.
- Use coordenadas em PIXELS DA IMAGEM ORIGINAL (você receberá as dimensões).
- NÃO invente: se algo não está claro, diga "não claramente visível".
- Seu relatório será usado por outra IA para reconstruir o mapa pixel a pixel — a precisão dos números é CRÍTICA.`;

// =====================================================================
// FASE 2 — Geração estruturada via tool calling
// =====================================================================
const GENERATION_PROMPT = `Você é um VETORIZADOR de plantas de venues. Recebe:
1) Uma IMAGEM da planta original
2) Um RELATÓRIO TÉCNICO já produzido por um analista visual (descreve setores, cores, contagens, posições)
3) Dimensões da imagem e do canvas

Sua tarefa: REPRODUZIR FIELMENTE no canvas o layout descrito, usando a função 'generate_map_plan'.

## Regra de ouro: FIDELIDADE TOTAL ao relatório E à imagem

- Inclua TODOS os setores listados no relatório, sem omitir.
- Se o relatório lista 12 setores, o plano deve ter 12.
- Use as posições/tamanhos EM PIXELS DA IMAGEM e aplique o MAPEAMENTO DE ESCALA fornecido.
- Use as contagens de fileiras e assentos exatamente como descritas — não simplifique.
- Use as cores HSL sugeridas (ou aproxime ao máximo).
- Use a forma geométrica indicada; para curvas/arcos use shape "arc" com curvature 30-80.

## Mapeamento de coordenadas (CRÍTICO)

Você receberá scale, offsetX, offsetY pré-calculados. Para cada setor/elemento descrito no relatório em (img_x, img_y, img_w, img_h):
  canvas_x = offsetX + img_x * scale
  canvas_y = offsetY + img_y * scale
  canvas_w = img_w * scale
  canvas_h = img_h * scale

RETORNE x, y, width, height JÁ COM ESSE CÁLCULO APLICADO.

## Conhecimento do construtor (Map Studio)

- Setores: shape ∈ [rectangle, circle, trapezoid, pentagon, hexagon, triangle, arc, l-shape, u-shape, t-shape, diamond, octagon]
- Curvatura 0-100 (use 30-80 para arquibancadas curvas)
- rowLabelType: alpha | numeric | roman
- Modo conservador: todos assentos type "normal", status "available". NÃO infira VIP/PCD a menos que explicitamente rotulado.
- Elementos contextuais disponíveis: stage, bar, bathroom, entrance, exit, speaker, dj, screen, vip-area, food.

## Refinamentos
Se o usuário pedir ajustes ("aumente VIP", "remova X"), retorne o plano AJUSTADO mantendo fidelidade do restante.

Sempre responda usando 'generate_map_plan'.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "generate_map_plan",
    description:
      "Gera um plano estruturado de mapa de venue REPRODUZINDO fielmente o layout descrito no relatório de análise.",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description:
            "Mensagem ao usuário em markdown (máx 4 parágrafos): resuma o que reconstruiu, quantos setores/assentos, e sugestões de refinamento.",
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
                      "X em pixels do CANVAS, JÁ com mapeamento de escala aplicado.",
                  },
                  y: {
                    type: "number",
                    description:
                      "Y em pixels do CANVAS, JÁ com mapeamento de escala aplicado.",
                  },
                  width: { type: "number" },
                  height: { type: "number" },
                  curvature: {
                    type: "number",
                    description: "0-100. 30-80 para arquibancadas em arco.",
                  },
                  rotation: {
                    type: "number",
                    description: "Graus, refletindo inclinação visual.",
                  },
                  rows: {
                    type: "number",
                    description:
                      "Quantidade EXATA de fileiras conforme relatório.",
                  },
                  cols: {
                    type: "number",
                    description:
                      "Quantidade EXATA de assentos por fileira conforme relatório.",
                  },
                  rowLabelType: {
                    type: "string",
                    enum: ["alpha", "numeric", "roman"],
                  },
                  labelPrefix: { type: "string" },
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
  imageWidth?: number | null;
  imageHeight?: number | null;
  // Quando fornecido, pula a fase de análise e usa este texto como relatório
  cachedAnalysis?: string | null;
}

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callGateway(payload: any, apiKey: string) {
  const resp = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return resp;
}

function gatewayErrorResponse(status: number, errText: string) {
  console.error("Gateway error:", status, errText);
  if (status === 429) {
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
  if (status === 402) {
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
  return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
    status: 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
      cachedAnalysis,
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

    // ============================================================
    // FASE 1 — Análise visual (apenas na primeira mensagem do usuário)
    // ============================================================
    let analysisReport = cachedAnalysis ?? "";
    const isFirstTurn = messages.filter((m) => m.role === "user").length === 1;

    if (isFirstTurn && imageBase64 && !cachedAnalysis) {
      console.log("[ai-map-generator] Iniciando FASE 1 (análise visual)");

      const analysisUserContent: any[] = [
        {
          type: "text",
          text: `IMAGE_WIDTH=${imageWidth ?? "desconhecido"}\nIMAGE_HEIGHT=${imageHeight ?? "desconhecido"}\n\nProduza o relatório técnico exaustivo desta imagem conforme as instruções.`,
        },
        {
          type: "image_url",
          image_url: { url: imageBase64 },
        },
      ];

      const analysisResp = await callGateway(
        {
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: ANALYSIS_PROMPT },
            { role: "user", content: analysisUserContent },
          ],
        },
        LOVABLE_API_KEY
      );

      if (!analysisResp.ok) {
        const errText = await analysisResp.text();
        return gatewayErrorResponse(analysisResp.status, errText);
      }

      const analysisData = await analysisResp.json();
      analysisReport =
        analysisData?.choices?.[0]?.message?.content ?? "";

      if (!analysisReport) {
        console.error(
          "[ai-map-generator] FASE 1 retornou vazio:",
          JSON.stringify(analysisData)
        );
        return new Response(
          JSON.stringify({
            error:
              "A IA não conseguiu analisar a imagem. Tente uma imagem mais nítida.",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(
        "[ai-map-generator] FASE 1 concluída. Tamanho do relatório:",
        analysisReport.length
      );
    }

    // ============================================================
    // FASE 2 — Geração estruturada do plano
    // ============================================================
    let mappingHint = "";
    if (imageWidth && imageHeight) {
      const scale = Math.min(
        canvasWidth / imageWidth,
        canvasHeight / imageHeight
      );
      const offsetX = (canvasWidth - imageWidth * scale) / 2;
      const offsetY = (canvasHeight - imageHeight * scale) / 2;
      mappingHint = `\n\n## MAPEAMENTO PRÉ-CALCULADO (use exatamente)
IMAGE_WIDTH=${imageWidth}
IMAGE_HEIGHT=${imageHeight}
CANVAS_WIDTH=${canvasWidth}
CANVAS_HEIGHT=${canvasHeight}
scale=${scale.toFixed(6)}
offsetX=${offsetX.toFixed(2)}
offsetY=${offsetY.toFixed(2)}

Para cada (img_x, img_y, img_w, img_h) do relatório:
  canvas_x = ${offsetX.toFixed(2)} + img_x * ${scale.toFixed(6)}
  canvas_y = ${offsetY.toFixed(2)} + img_y * ${scale.toFixed(6)}
  canvas_w = img_w * ${scale.toFixed(6)}
  canvas_h = img_h * ${scale.toFixed(6)}`;
    } else {
      mappingHint = `\n\nCANVAS_WIDTH=${canvasWidth}\nCANVAS_HEIGHT=${canvasHeight}\n(Dimensões da imagem desconhecidas — estime proporcionalmente.)`;
    }

    const analysisBlock = analysisReport
      ? `\n\n## RELATÓRIO TÉCNICO DA ANÁLISE VISUAL (use como fonte de verdade)\n\n${analysisReport}`
      : "";

    const generationSystem = `${GENERATION_PROMPT}${mappingHint}${analysisBlock}`;

    // Monta histórico para fase 2 (anexa imagem na primeira user message)
    const aiMessages: any[] = [
      { role: "system", content: generationSystem },
    ];

    messages.forEach((msg, idx) => {
      if (idx === 0 && msg.role === "user" && imageBase64) {
        aiMessages.push({
          role: "user",
          content: [
            { type: "text", text: msg.content },
            { type: "image_url", image_url: { url: imageBase64 } },
          ],
        });
      } else {
        aiMessages.push({ role: msg.role, content: msg.content });
      }
    });

    console.log("[ai-map-generator] Iniciando FASE 2 (geração estruturada)");

    const genResp = await callGateway(
      {
        model: "google/gemini-2.5-pro",
        messages: aiMessages,
        tools: [TOOL_SCHEMA],
        tool_choice: {
          type: "function",
          function: { name: "generate_map_plan" },
        },
      },
      LOVABLE_API_KEY
    );

    if (!genResp.ok) {
      const errText = await genResp.text();
      return gatewayErrorResponse(genResp.status, errText);
    }

    const data = await genResp.json();
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

    console.log(
      "[ai-map-generator] FASE 2 concluída. Setores:",
      parsed?.plan?.sectors?.length,
      "Elementos:",
      parsed?.plan?.elements?.length
    );

    return new Response(
      JSON.stringify({
        message: parsed.message,
        plan: parsed.plan,
        // Devolve a análise para o cliente cachear e reutilizar em refinamentos
        analysis: analysisReport || null,
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
