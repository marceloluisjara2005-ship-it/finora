import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
let PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const portArgIdx = process.argv.indexOf('--port');
if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
  const parsed = parseInt(process.argv[portArgIdx + 1], 10);
  if (!isNaN(parsed)) PORT = parsed;
}

app.use(express.json());

// Initialize Google Gemini Client on server-side
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Server API Endpoint for Personal Accountant AI
app.post('/api/assistant/chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!ai) {
      // Descriptive fallback if key not attached yet
      return res.json({
        reply:
          'El Asistente Contable Finora está configurado y listo. Para activar el análisis con IA en tiempo real, asegúrate de que la clave de API esté configurada en el servidor. Tus registros locales y balances contables siguen 100% operativos.',
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'Eres el Contador Público Personal de la aplicación Finora. Brinda explicaciones financieras descriptivas, diagnósticos de flujo de caja, control de gastos hormiga y análisis de cuotas. Sé conciso, elegante y profesional. Nunca prometas rentabilidad garantizada ni asesoramiento legal vinculante.',
        temperature: 0.7,
      },
    });

    const reply = response.text || 'No fue posible generar una respuesta.';
    return res.json({ reply });
  } catch (error: any) {
    console.error('Error in Gemini assistant API:', error);
    return res.status(500).json({
      error: 'Error en el servicio contable de IA',
      details: error.message,
    });
  }
});

// Server API Endpoint for Outbox Sync Batch
const processedIdempotencyKeys = new Set<string>();

app.post('/api/sync/batch', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items must be an array' });
    }

    let newlyProcessed = 0;
    let duplicatesSkipped = 0;

    for (const item of items) {
      if (processedIdempotencyKeys.has(item.idempotencyKey)) {
        duplicatesSkipped++;
        continue;
      }
      processedIdempotencyKeys.add(item.idempotencyKey);
      newlyProcessed++;
    }

    return res.json({
      success: true,
      processed: newlyProcessed,
      duplicatesSkipped,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error in /api/sync/batch:', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// Mount Vite or static dist
async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const indexHtml = path.resolve(distPath, 'index.html');
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    (fs.existsSync(indexHtml) && process.env.NODE_ENV !== 'development');

  if (isProduction) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(indexHtml);
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Finora Server running on http://0.0.0.0:${PORT} [${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}]`
    );
  });
}

startServer();
