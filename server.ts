import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
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

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Gemini API Report Generation
app.post("/api/gemini/report", async (req: any, res: any) => {
  const { metrics, comments, extraPrompt } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ 
      error: "API Key do Gemini não configurada no servidor. Por favor, adicione em Settings > Secrets." 
    });
  }

  try {
    const prompt = `Você é o Ouvidor de Excelência e Inteligência Estratégica da Policlínica Bernardo Félix da Silva, um hospital público de alta relevância com foco em conformidade prática com o SUS.
Estude os dados reais compilados de satisfação do mês abaixo e gere um relatório técnico, formal, acolhedor e estratégico.

Métricas de Satisfação Coletadas:
- Total de Avaliações Recebidas: ${metrics.totalEvaluations || 0}
- Índice de Aprovação Técnica (Ótimo + Bom): ${metrics.technicalQualityIndex || 0}%
- NPS Global (Net Promoter Score): ${metrics.npsGlobal || 0}% (Classificação: ${metrics.npsClassification || 'Não classificado'})
- Porcentagem de Promotores (notas 9-10): ${metrics.promotersPercent || 0}%
- Porcentagem de Neutros (notas 7-8): ${metrics.neutralsPercent || 0}%
- Porcentagem de Detratores (notas 0-6): ${metrics.detractorsPercent || 0}%

Desempenho por Setor (Qualidade Ótimo/Bom):
${Object.entries(metrics.sectorsPerformance || {}).map(([sec, perf]: any) => `  * ${sec}: ${perf.positivePercent}% positivo, ${perf.negativePercent}% insatisfeito (Total amostras: ${perf.total})`).join('\n')}

Comentários/Feedbacks de Pacientes Recebidos:
${(comments || []).slice(0, 45).map((c: string) => `- "${c}"`).join('\n')}

${extraPrompt ? `Instrução Adicional Adicionada pelo Ouvidor:\n-> ${extraPrompt}\n` : ''}

Você deve gerar um JSON válido contendo exatamente as seguintes propriedades estruturadas para preencher o formulário final (sua resposta deve ser em formato JSON de acordo com o esquema solicitado):

{
  "praisePoints": ["Lista de até 4 pontos de maior aclamação com justificativa curta baseada nos dados reais"],
  "criticalAlerts": ["Lista de alertas de setores críticos ou questões recorrentes com base em insatisfações reais superiores a 15%"],
  "strategicActions": ["Lista de 3 a 5 ações imediatas, técnicas e viáveis no âmbito do SUS para corrigir os desvios"],
  "conclusionText": "Um texto longo de encerramento do relatório em formato de parecer oficial de ouvidoria, assinado tecnicamente, comentando a evolução da unidade e o compromisso do SUS na Policlínica Bernardo Félix da Silva."
}

Retorne exclusivamente o JSON, sem decorações markdown de bloco adicional, de modo que possa ser analisado no JSON.parse diretamente no servidor.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const textResponse = response.text || "{}";
    try {
      const parsedData = JSON.parse(textResponse);
      res.json(parsedData);
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
    return res.status(500).json({ 
      error: "API Key do Gemini não configurada no servidor. Por favor, adicione em Settings > Secrets." 
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
      }
    });

    const textResponse = response.text || "{}";
    try {
      const parsedData = JSON.parse(textResponse);
      res.json(parsedData);
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
