import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini API Proxy
  app.post("/api/generate-summary", async (req, res) => {
    try {
      const { tournamentData } = req.body;
      
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY!,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `Crie um resumo curto e profissional (em português do Brasil, máximo de 3 frases) para um torneio de jogos escolares com os seguintes detalhes:
- Nome do Torneio: ${tournamentData.name || 'Sem nome'}
- Modalidade: ${tournamentData.modality || 'Variada'}
- Competição: ${tournamentData.participantType === 'team' ? 'Por Equipes / Grupos' : 'Individual / Alunos'}
- Formato: ${tournamentData.format === 'mata_mata' ? 'Mata-Mata Direto' : tournamentData.format === 'grupo_unico' ? 'Pontos Corridos' : 'Fase de Grupos + Playoffs'}
- Quantidade de competidores: ${tournamentData.players?.length || 0}
- Status atual do torneio: ${tournamentData.stage === 'setup' ? 'Ainda em Configuração' : tournamentData.stage === 'groups' ? 'Fase de Grupos Ativa' : tournamentData.stage === 'finals' ? 'Fase de Playoffs / Finais Ativa' : 'Competição Concluída / Finalizada'}

Por favor, gere apenas o resumo de 2 a 3 frases, sem introduções ou observações adicionais.`;

      let response: any;
      let retries = 0;
      const MAX_RETRIES = 2;

      while (retries <= MAX_RETRIES) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
          });
          break;
        } catch (error: any) {
          if (error.status === 503 && retries < MAX_RETRIES) {
            retries++;
            console.log(`Retry ${retries}/${MAX_RETRIES} due to 503`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            continue;
          }
          throw error;
        }
      }

      res.json({ summary: response.text });
    } catch (error) {
      console.error("Erro ao chamar Gemini:", error);
      res.status(500).json({ error: "Failed to generate summary" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
