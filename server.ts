import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = 3000;

// Initialize Google GenAI with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper function to robustly clean JSON strings
function cleanJSONString(str: string): string {
  let cleaned = str.trim();
  // Remove markdown code block backticks if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "");
  }
  return cleaned.trim();
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Schema layout description for reports
const reportSchema = {
  type: Type.OBJECT,
  properties: {
    praisePoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Lista de pontos de aclamação baseados nos dados de satisfação."
    },
    criticalAlerts: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Lista de alertas ou reclamações de setores com dados."
    },
    strategicActions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Lista de ações corretivas no SUS."
    },
    conclusionText: {
      type: Type.STRING,
      description: "Texto longo de conclusão e parecer técnico oficial."
    }
  },
  required: ["praisePoints", "criticalAlerts", "strategicActions", "conclusionText"]
};

// Helper function for simulated report generation when GEMINI_API_KEY is missing
function generateSimulatedReport(metrics: any, comments: string[], extraPrompt?: string) {
  const total = metrics?.totalEvaluations || 0;
  const aprIndex = metrics?.technicalQualityIndex || 0;
  const nps = metrics?.npsGlobal || 0;
  const classification = metrics?.npsClassification || 'Não classificado';

  const sectorsPerformance = metrics?.sectorsPerformance || {};
  const criticalSectors = Object.entries(sectorsPerformance)
    .filter(([_, perf]: any) => perf.negativePercent > 15)
    .map(([sec]) => sec);

  // Default praise points based on actual positive indices
  const praisePoints = [
    `Excelente índice de aprovação global de ${aprIndex}%, refletindo o alinhamento operacional exemplar e o cumprimento consistente dos protocolos de qualidade assistencial da unidade.`,
    `Taxa sólida de promotores fixada em ${metrics?.promotersPercent || 0}%, indicando confiança e reconhecimento recorrentes da comunidade sobre o atendimento prestado.`,
    `Acolhimento humanizado amplamente elogiado nos feedbacks diretos, corroborando as diretrizes norteadoras da Política Nacional de Humanização (PNH) do SUS.`
  ];

  // Default critical alerts based on real failures
  const criticalAlerts: string[] = [];
  if (criticalSectors.length > 0) {
    criticalSectors.forEach(sec => {
      criticalAlerts.push(`Necessidade crítica de readequação no setor "${sec}", que registrou insatisfação de ${sectorsPerformance[sec]?.negativePercent || 0}% (superior ao limite de tolerância estabelecido).`);
    });
  } else {
    criticalAlerts.push("Nenhuma inconformidade sistêmica prioritária ou setor com insatisfação superior a 15% foi computado no período analítico corrente.");
  }
  
  if (comments && comments.length > 0) {
    const CleanComments = comments.filter(c => c && c.trim().length > 3).slice(0, 2);
    CleanComments.forEach((c) => {
      criticalAlerts.push(`Ação estratégica apontada por feedback direto do paciente: "${c}"`);
    });
  }

  // Default strategic actions using SUS healthcare framework terminology
  const strategicActions = [
    "Instituição imediata de Treinamento em Acolhimento e Humanização com foco nas equipes de pronto-atendimento e triagem.",
    "Revisão dos fluxos de triagem e mapeamento de gargalos de fila operacional para reduzir o tempo de espera referenciado nos relatos.",
    "Implementação de rondas preventivas diárias pelo coordenador do setor crítico para validação de insumos e condutas de guichê."
  ];

  if (extraPrompt) {
    strategicActions.push(`Reforço técnico imediato baseado no foco do Ouvidor: "${extraPrompt}"`);
  }

  const conclusionText = `PARECER TÉCNICO OFICIAL DE OUVIDORIA STRATÉGICA

Fica homologado que a Policlínica Bernardo Félix da Silva, à luz dos relatórios quantitativos e qualitativos processados, opera com forte aderência aos preceitos da integralidade da atenção especializada. O indicador técnico de aprovação fixado em ${aprIndex}% consolida os esforços administrativos de humanização e acolhimento contínuo.

Os desvios setoriais individuais que ultrapassaram a barreira recomendada de 15% de insatisfação passam a ser objeto de plano de ação imediata pela gerência de operações, com fixação de metas de ajuste de processos de triagem e tempos de atendimento correspondentes para os próximos 15 dias.

Este relatório reflete o compromisso com o controle de qualidade do SUS, visando sempre a excelência e universalidade resolutiva.

[Atenciosamente, Ouvidoria Geral da Policlínica Bernardo Félix da Silva]
*(Relatório de demonstração gerado localmente pelo simulador de IA. Ative sua GEMINI_API_KEY no menu Secrets do AI Studio para obter análises reais direto das redes neurais do Gemini)*`;

  return {
    praisePoints,
    criticalAlerts,
    strategicActions,
    conclusionText,
    isSimulated: true
  };
}

// Gemini API Report Generation
app.post("/api/gemini/report", async (req: any, res: any) => {
  const { metrics, comments, extraPrompt } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    console.log("GEMINI_API_KEY ausente. Ativando simulador de inteligência artificial de ouvidoria de forma transparente.");
    const simulated = generateSimulatedReport(metrics, comments, extraPrompt);
    return res.json(simulated);
  }

  try {
    const prompt = `Você é o Ouvidor de Excelência e Inteligência Estratégica da Policlínica Bernardo Félix da Silva, um hospital público de alta relevância com foco em conformidade prática com o SUS.
Estude os dados reais compilados de satisfação do mês abaixo e gere um relatório técnico, formal, acolhedor e estratégico.

Métricas de Satisfação Coletadas:
- Total de Avaliações Recebidas: ${metrics?.totalEvaluations || 0}
- Índice de Aprovação Técnica (Ótimo + Bom): ${metrics?.technicalQualityIndex || 0}%
- NPS Global (Net Promoter Score): ${metrics?.npsGlobal || 0}% (Classificação: ${metrics?.npsClassification || 'Não classificado'})
- Porcentagem de Promotores (notas 9-10): ${metrics?.promotersPercent || 0}%
- Porcentagem de Neutros (notas 7-8): ${metrics?.neutralsPercent || 0}%
- Porcentagem de Detratores (notas 0-6): ${metrics?.detractorsPercent || 0}%

Desempenho por Setor (Qualidade Ótimo/Bom):
${Object.entries(metrics?.sectorsPerformance || {}).map(([sec, perf]: any) => `  * ${sec}: ${perf.positivePercent}% positivo, ${perf.negativePercent}% insatisfeito (Total amostras: ${perf.total})`).join('\n')}

Comentários/Feedbacks de Pacientes Recebidos:
${(comments || []).slice(0, 45).map((c: string) => `- "${c}"`).join('\n')}

${extraPrompt ? `Instrução Adicional Adicionada pelo Ouvidor:\n-> ${extraPrompt}\n` : ''}

Você deve gerar um JSON válido contendo exatamente as seguintes propriedades estruturadas para preencher o formulário final:
- praisePoints: Lista de até 4 pontos de maior aclamação com justificativa curta baseada nos dados reais
- criticalAlerts: Lista de alertas de setores críticos ou questões recorrentes com base em insatisfações reais superiores a 15%
- strategicActions: Lista de 3 a 5 ações imediatas, técnicas e viáveis no âmbito do SUS para corrigir os desvios
- conclusionText: Um texto longo de encerramento do relatório em formato de parecer oficial de ouvidoria, assinado tecnicamente, comentando a evolução da unidade e o compromisso do SUS na Policlínica Bernardo Félix da Silva.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: reportSchema
      }
    });

    const textResponse = cleanJSONString(response.text || "{}");
    try {
      const parsedData = JSON.parse(textResponse);
      res.json({
        ...parsedData,
        isSimulated: false
      });
    } catch (parseErr) {
      console.error("Erro ao analisar resposta JSON do Gemini:", textResponse);
      res.status(502).json({ error: "O modelo Inteligente gerou um formato de relatório corrompido. Tente novamente.", raw: textResponse });
    }

  } catch (err: any) {
    console.error("Erro na rota do Gemini Report:", err);
    res.status(500).json({ error: err.message || "Erro desconhecido ao processar relatório" });
  }
});

// Gemini API Co-Authoring Chat / Adjust Report
app.post("/api/gemini/chat", async (req: any, res: any) => {
  const { currentReport, message } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    console.log("GEMINI_API_KEY ausente na rota de chat. Fornecendo sintonia simulada.");
    const textMsg = (message || "").toLowerCase();
    
    // Simulate co-authoring adjustment
    let praise = [...(currentReport.praisePoints || [])];
    let critical = [...(currentReport.criticalAlerts || [])];
    let actions = [...(currentReport.strategicActions || [])];
    let conclusion = currentReport.conclusionText || "";

    if (textMsg.includes("executivo") || textMsg.includes("curt") || textMsg.includes("resum")) {
      praise = praise.map(p => p.split(".")[0] + ".");
      critical = critical.map(c => c.split(".")[0] + ".");
      actions = actions.slice(0, 2);
      conclusion = "PARECER TÉCNICO OFICIAL CORPORATIVO\n\nTodos os índices operacionais foram consolidados e aprovados. Ações administrativas de correção e humanização de guichês seguem vigentes em cronograma simplificado.\n\n[Laudo Executivo Compactado]";
    } else {
      actions.push(`Diretriz customizada sob demanda: "Reforçar controles imediatos de atendimento na unidade de saúde."`);
      conclusion = `${conclusion}\n\n* Parecer Técnico atualizado com base nos ajustes solicitados pelo Ouvidor: "${message}".`;
    }

    return res.json({
      praisePoints: praise,
      criticalAlerts: critical,
      strategicActions: actions,
      conclusionText: conclusion,
      isSimulated: true
    });
  }

  try {
    const prompt = `Você é o Ouvidor Estratégico Consultor da Policlínica Bernardo Félix da Silva.
O usuário lhe forneceu o relatório atual da ouvidoria e quer fazer alterações dinâmicas a partir de um pedido/comando.

Relatório Atual:
${JSON.stringify(currentReport, null, 2)}

Instrução de Ajuste do Usuário:
"${message}"

Analise a instrução de alteração do usuário e ajuste de forma inteligente o relatório. Por exemplo, se ele pediu "Torne o relatório mais executivo", reduza as palavras das listas organizando de forma clara. Se pediu "Aumente as ações da portaria", atualize e expanda a lista de "strategicActions" e atualize a conclusão.

Você deve retornar o novo relatório completo estruturado em JSON com as mesmas propriedades do original:

{
  "praisePoints": ["Traduções ou listas de pontos positivos atualizados"],
  "criticalAlerts": ["Traduções ou alertas críticos atualizados"],
  "strategicActions": ["Ações imediatas e viáveis do SUS atualizadas"],
  "conclusionText": "Conclusão e parecer de autoria ajustada"
}

Retorne unicamente o JSON sem qualquer blá blá blá de introdução.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: reportSchema
      }
    });

    const textResponse = cleanJSONString(response.text || "{}");
    try {
      const parsedData = JSON.parse(textResponse);
      res.json({
        ...parsedData,
        isSimulated: false
      });
    } catch (parseErr) {
      console.error("Erro no chat de relatório:", textResponse);
      res.status(502).json({ error: "A IA errou na formatação dos ajustes do relatório. Tente reenviar suas instruções.", raw: textResponse });
    }

  } catch (err: any) {
    console.error("Erro no chat do Gemini:", err);
    res.status(500).json({ error: err.message || "Erro de comunicação no chat inteligente" });
  }
});

// Handle Vite Dev and Prod builds
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
