// Edge function: ai-map-generator
// Pipeline em 2 fases:
//   Fase 1 — Análise visual com GRADE DE VALIDAÇÃO (3x3) e bounding boxes em PERCENTUAIS
//   Fase 2 — Geração estruturada via tool calling, com mapeamento de coordenadas pré-calculado
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// =====================================================================
// CONTEXTO COMPLETO DO MAP STUDIO (passado para ambas as fases)
// =====================================================================
const MAP_STUDIO_CONTEXT = `
## SISTEMA: Map Studio (construtor 2D de mapas de venue)

### Formas de SETOR disponíveis (escolha SEMPRE a que melhor se aproxima do contorno visual)
- **rectangle**: retângulo simples (camarotes, áreas regulares)
- **trapezoid**: trapézio (lados não paralelos, base maior — comum em arquibancadas frontais)
- **parallelogram**: paralelogramo (lados oblíquos)
- **triangle**: triângulo (cantos)
- **pentagon / hexagon / octagon**: polígonos regulares
- **diamond**: losango (rotação de 45°)
- **circle**: círculo (raros — pista central, ringue)
- **arc**: ARCO/MEIA-LUA — USE para arquibancadas curvas, anfiteatros, plateias em forma de leque (com curvature 30-80)
- **l-shape / u-shape / t-shape / z-shape / cross**: para setores com recortes
- **arrow / star / wave**: especiais (raros)

### Curvatura
- 0 = forma reta
- 30-50 = leve curvatura (arquibancada quase reta)
- 60-80 = curvatura média (leque)
- 80-100 = arco completo (180°)

### Cores (HSL — varie matiz, mantenha S~60-70%, L~45-55%)
Cores típicas observadas em plantas: azul \`hsl(210, 65%, 50%)\`, verde \`hsl(142, 65%, 45%)\`, amarelo \`hsl(48, 90%, 55%)\`, vermelho \`hsl(0, 70%, 50%)\`, roxo \`hsl(280, 60%, 55%)\`, laranja \`hsl(24, 90%, 55%)\`, cinza \`hsl(0, 0%, 60%)\`.

### Assentos (gerados em GRADE rows × cols dentro de cada setor)
- Cada setor pode ter rows (fileiras) e cols (assentos por fileira).
- rowLabelType: 'alpha' (A,B,C…), 'numeric' (1,2,3…), 'roman' (I,II,III…)
- IMPORTANTE: rows/cols devem refletir a CONTAGEM REAL visível na imagem.

### Elementos contextuais (não são setores)
stage (palco), bar, bathroom, entrance, exit, speaker, dj, screen, vip-area, food.

### Regras CRÍTICAS de cobertura
- A planta INTEIRA deve ser coberta. Se há setores no canto superior, no centro E no canto inferior, TODOS devem aparecer.
- NUNCA agrupe múltiplos setores visuais em um só. Se vê 12 blocos coloridos distintos, retorne 12 setores.
- NUNCA omita setores periféricos (laterais, fundo, balcões superiores).
`;

// =====================================================================
// FASE 1 — Análise visual exaustiva com GRADE 3x3 e PERCENTUAIS
// =====================================================================
const ANALYSIS_PROMPT = `Você é um analista visual de PLANTAS DE VENUES.
Sua tarefa: produzir um RELATÓRIO TÉCNICO em markdown descrevendo a imagem com PRECISÃO MILIMÉTRICA.

${MAP_STUDIO_CONTEXT}

## METODOLOGIA OBRIGATÓRIA

### Passo 1 — Divida MENTALMENTE a imagem em GRADE 3x3
Identifique 9 quadrantes:
- Q1 (superior-esquerdo) | Q2 (superior-centro) | Q3 (superior-direito)
- Q4 (centro-esquerdo)   | Q5 (centro)          | Q6 (centro-direito)
- Q7 (inferior-esquerdo) | Q8 (inferior-centro) | Q9 (inferior-direito)

Liste, antes de tudo, em qual(is) quadrante(s) está cada setor visível e o palco/elementos. Isso garante que você NÃO esqueça nenhuma região.

### Passo 2 — Inventário EXAUSTIVO de SETORES
Para CADA setor visível (sem agrupar, sem omitir):

\`\`\`
#### Setor N — <Nome/identificação>
- **Quadrante(s)**: Q5, Q6 (etc)
- **Cor predominante**: <nome> ≈ hsl(H, S%, L%)
- **Bounding box em PERCENTUAIS da imagem original** (mais robusto que pixels):
  - x_pct: <0-100> (canto esquerdo da bbox em % da largura da imagem)
  - y_pct: <0-100> (canto superior em % da altura)
  - w_pct: <0-100> (largura em % da largura da imagem)
  - h_pct: <0-100> (altura em % da altura)
- **Forma escolhida** (do catálogo): rectangle | trapezoid | arc | …  
  Justifique brevemente (ex: "trapezoid pois a base superior é menor")
- **Curvatura sugerida**: 0-100
- **Rotação aparente**: graus
- **Fileiras visíveis**: <conte olhando atentamente. Use zoom mental se preciso>
- **Assentos por fileira**: <conte a fileira mais larga>
- **Tipo de label**: alpha | numeric | roman (se visível)
- **Rótulo legível na imagem**: ex: "PCD", "VIP", capacidade impressa, etc.
\`\`\`

### Passo 3 — Elementos contextuais
Liste palco e demais elementos com bounding box em percentuais.

### Passo 4 — Validação final
Termine com:
- "Total de setores listados: N"
- "Quadrantes cobertos: Q1, Q2, Q3, ..."
- "Quadrantes SEM setor (apenas se realmente vazios): ..."

## REGRAS RÍGIDAS
- Use PERCENTUAIS (0-100), NÃO pixels absolutos.
- Setores na periferia (laterais, fundo, balcões) são frequentemente esquecidos — preste ATENÇÃO EXTRA neles.
- Se houver dúvida entre 2 formas, escolha a que cobre melhor a área visual sem invadir setores vizinhos.
- NÃO produza JSON. Produza texto markdown estruturado.`;

// =====================================================================
// FASE 2 — Geração estruturada do plano
// =====================================================================
const GENERATION_PROMPT = `Você é o VETORIZADOR do Map Studio.
Recebe: (1) a IMAGEM original, (2) um RELATÓRIO TÉCNICO já produzido com bounding boxes em PERCENTUAIS, (3) dimensões da imagem e do canvas, (4) o mapeamento de escala pré-calculado.

${MAP_STUDIO_CONTEXT}

## Sua tarefa
Reproduzir FIELMENTE no canvas o layout descrito no relatório, usando a função 'generate_map_plan'.

## Nível de detalhe OBRIGATÓRIO
- Não basta aproximar por bloco. Você deve reconstruir a DENSIDADE VISUAL do setor.
- Para cada setor, estime também a malha de assentos com precisão: 
  - rows = número real de fileiras visíveis
  - cols = capacidade da fileira de referência mais longa
  - seatsPerRow = contagem de assentos por fileira, uma entrada por fileira, quando houver afunilamento/chanfro/diagonal
  - rowSpacing, colSpacing e seatSize devem ser coerentes com a imagem para evitar setor “vazio” ou “folgado” demais
- Se o setor é trapezoidal, diagonal, chanfrado ou afunilado, use seatsPerRow para reduzir/aumentar fileiras progressivamente.
- Se dois setores têm a mesma bbox mas densidades diferentes, reflita isso em seatSize/spacing/seatsPerRow.
- Priorize fidelidade visual do preenchimento interno, não apenas da borda externa.

## Conversão CRÍTICA (percentual → pixel canvas)
Para cada setor/elemento descrito com (x_pct, y_pct, w_pct, h_pct), você receberá os valores pré-calculados:
- IMAGE_WIDTH, IMAGE_HEIGHT (pixels da imagem original)
- scale, offsetX, offsetY (mapeamento uniforme imagem → canvas)

Calcule:
\`\`\`
img_x = (x_pct / 100) * IMAGE_WIDTH
img_y = (y_pct / 100) * IMAGE_HEIGHT
img_w = (w_pct / 100) * IMAGE_WIDTH
img_h = (h_pct / 100) * IMAGE_HEIGHT

canvas_x = offsetX + img_x * scale
canvas_y = offsetY + img_y * scale
canvas_w = img_w * scale
canvas_h = img_h * scale
\`\`\`

RETORNE x, y, width, height JÁ NESTE SISTEMA DE PIXELS DO CANVAS.

## Validação obrigatória ANTES de retornar
1. O número de setores no plano deve ser IGUAL ao "Total de setores listados" do relatório.
2. Cada quadrante (Q1..Q9) coberto no relatório deve ter pelo menos um setor no plano cuja bbox cai naquele quadrante do canvas.
3. Para arcos/leques, use shape="arc" + curvature 30-80.
4. Modo conservador: todos assentos type "normal", status "available". NUNCA infira VIP/PCD.
5. Se houver fileiras irregulares visíveis, seatsPerRow é obrigatório.
6. Evite subcontagem: o total de assentos gerado deve ficar o mais próximo possível da imagem de referência.

## Refinamentos
Em mensagens posteriores, ajuste o plano conforme pedido (aumentar setor X, mover Y, etc.) mantendo fidelidade do restante.

Sempre responda usando 'generate_map_plan'.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "generate_map_plan",
    description:
      "Gera um plano estruturado de mapa de venue REPRODUZINDO fielmente o layout descrito no relatório.",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description:
            "Mensagem ao usuário em markdown (máx 4 parágrafos). Resuma o que reconstruiu e sugestões de refinamento.",
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
                    description: "HSL: 'hsl(H, S%, L%)'",
                  },
                  shape: {
                    type: "string",
                    enum: [
                      "rectangle",
                      "parallelogram",
                      "trapezoid",
                      "pentagon",
                      "hexagon",
                      "triangle",
                      "circle",
                      "arc",
                      "l-shape",
                      "u-shape",
                      "t-shape",
                      "z-shape",
                      "cross",
                      "diamond",
                      "octagon",
                      "arrow",
                      "star",
                      "wave",
                    ],
                  },
                  x: {
                    type: "number",
                    description:
                      "X em pixels DO CANVAS (com mapeamento aplicado).",
                  },
                  y: {
                    type: "number",
                    description:
                      "Y em pixels DO CANVAS (com mapeamento aplicado).",
                  },
                  width: { type: "number" },
                  height: { type: "number" },
                  curvature: { type: "number", description: "0-100" },
                  rotation: { type: "number", description: "graus" },
                  rows: { type: "number" },
                  cols: { type: "number" },
                  seatSize: {
                    type: "number",
                    description: "Tamanho do assento em px no canvas. Use para refletir densidade real.",
                  },
                  rowSpacing: {
                    type: "number",
                    description: "Espaço vertical entre fileiras em px.",
                  },
                  colSpacing: {
                    type: "number",
                    description: "Espaço horizontal entre assentos em px.",
                  },
                  rowAlignment: {
                    type: "string",
                    enum: ["left", "center", "right"],
                  },
                  seatsPerRow: {
                    type: "array",
                    description: "Quantidade de assentos por fileira para setores irregulares. Deve ter comprimento igual a rows quando usado.",
                    items: { type: "number" },
                  },
                  centerSeats: {
                    type: "boolean",
                    description: "Use true quando o bloco estiver visualmente centralizado dentro do setor.",
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
  cachedAnalysis?: string | null;
}

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callGateway(payload: any, apiKey: string) {
  return await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
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
    // FASE 1 — Análise visual (apenas no primeiro turno)
    // ============================================================
    let analysisReport = cachedAnalysis ?? "";
    const isFirstTurn = messages.filter((m) => m.role === "user").length === 1;

    if (isFirstTurn && imageBase64 && !cachedAnalysis) {
      console.log("[ai-map-generator] FASE 1: análise visual iniciada");

      const analysisUserContent: any[] = [
        {
          type: "text",
          text: `IMAGE_WIDTH=${imageWidth ?? "?"}\nIMAGE_HEIGHT=${imageHeight ?? "?"}\n\nProduza o relatório técnico exaustivo desta imagem usando GRADE 3x3 e PERCENTUAIS, conforme as instruções.`,
        },
        { type: "image_url", image_url: { url: imageBase64 } },
      ];

      const analysisResp = await callGateway(
        {
          model: "google/gemini-2.5-pro",
          max_completion_tokens: 8192,
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
      analysisReport = analysisData?.choices?.[0]?.message?.content ?? "";

      if (!analysisReport) {
        console.error(
          "[ai-map-generator] FASE 1 vazia:",
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
        "[ai-map-generator] FASE 1 OK. Tamanho:",
        analysisReport.length
      );
    }

    // ============================================================
    // FASE 2 — Geração estruturada
    // ============================================================
    let mappingHint = "";
    if (imageWidth && imageHeight) {
      const scale = Math.min(
        canvasWidth / imageWidth,
        canvasHeight / imageHeight
      );
      const offsetX = (canvasWidth - imageWidth * scale) / 2;
      const offsetY = (canvasHeight - imageHeight * scale) / 2;
      mappingHint = `

## MAPEAMENTO PRÉ-CALCULADO (use exatamente)
IMAGE_WIDTH=${imageWidth}
IMAGE_HEIGHT=${imageHeight}
CANVAS_WIDTH=${canvasWidth}
CANVAS_HEIGHT=${canvasHeight}
scale=${scale.toFixed(6)}
offsetX=${offsetX.toFixed(2)}
offsetY=${offsetY.toFixed(2)}

Para cada setor com (x_pct, y_pct, w_pct, h_pct) do relatório:
  img_x = (x_pct/100) * ${imageWidth}
  img_y = (y_pct/100) * ${imageHeight}
  img_w = (w_pct/100) * ${imageWidth}
  img_h = (h_pct/100) * ${imageHeight}
  canvas_x = ${offsetX.toFixed(2)} + img_x * ${scale.toFixed(6)}
  canvas_y = ${offsetY.toFixed(2)} + img_y * ${scale.toFixed(6)}
  canvas_w = img_w * ${scale.toFixed(6)}
  canvas_h = img_h * ${scale.toFixed(6)}

ÁREA ÚTIL DO CANVAS COBERTA PELA IMAGEM:
  left=${offsetX.toFixed(0)}, top=${offsetY.toFixed(0)}
  right=${(offsetX + imageWidth * scale).toFixed(0)}, bottom=${(offsetY + imageHeight * scale).toFixed(0)}
TODOS os setores devem cair DENTRO desta área (não invente coordenadas fora).`;
    } else {
      mappingHint = `\n\nCANVAS_WIDTH=${canvasWidth}\nCANVAS_HEIGHT=${canvasHeight}`;
    }

    const analysisBlock = analysisReport
      ? `\n\n## RELATÓRIO TÉCNICO (fonte de verdade)\n\n${analysisReport}`
      : "";

    const generationSystem = `${GENERATION_PROMPT}${mappingHint}${analysisBlock}`;

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

    console.log("[ai-map-generator] FASE 2: geração iniciada");

    const genResp = await callGateway(
      {
        model: "google/gemini-2.5-pro",
        max_completion_tokens: 8192,
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
    const finishReason = data?.choices?.[0]?.finish_reason;
    if (finishReason === "length") {
      console.error("[ai-map-generator] Resposta truncada por limite de tokens");
      return new Response(
        JSON.stringify({
          error: "A IA excedeu o limite de resposta ao montar o plano. Tente novamente com um refinamento mais específico.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
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

    const rawArguments = String(toolCall.function.arguments || "").trim();
    const sanitizedArguments = rawArguments
      .replace(/^```json\s*/im, "")
      .replace(/^```\s*/im, "")
      .replace(/```\s*$/im, "")
      .trim();

    const parsed = JSON.parse(sanitizedArguments);

    console.log(
      "[ai-map-generator] FASE 2 OK. Setores:",
      parsed?.plan?.sectors?.length,
      "Elementos:",
      parsed?.plan?.elements?.length
    );

    return new Response(
      JSON.stringify({
        message: parsed.message,
        plan: parsed.plan,
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
