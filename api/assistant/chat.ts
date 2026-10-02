import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';

interface VercelRequest extends IncomingMessage {
  body: any;
  query: { [key: string]: string | string[] };
}

interface VercelResponse extends ServerResponse {
  status: (statusCode: number) => VercelResponse;
  json: (data: any) => VercelResponse;
  send: (body: any) => VercelResponse;
}

const SYSTEM_INSTRUCTION = `Eres el Asistente Contable Personal en Finora.
Tu rol es actuar como un Contador Público Matriculado y Asesor Financiero riguroso, empático y experto.
Principios de respuesta:
1. Sé conciso, profesional y directo.
2. Analiza los datos del usuario con lógica contable (partida doble, control de pasivos, flujo de fondos).
3. Distingue estrictamente entre gastos fijos, variables y gastos hormiga.
4. Para cuotas, evalúa costo financiero total e impacto en la liquidez futura.
5. Estructura tus consejos con viñetas claras y recomendaciones de acción inmediata.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // keep as is
      }
    }

    const prompt = body?.prompt;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        reply:
          'El Asistente Contable Finora está configurado y listo. Para activar el análisis con IA en tiempo real en Vercel, agrega la variable de entorno GEMINI_API_KEY en el panel de Vercel (Settings > Environment Variables). Tus balances locales siguen 100% operativos.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'finora-pwa-vercel',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4,
      },
    });

    return res.json({ reply: response.text || 'Sin respuesta del modelo.' });
  } catch (err: any) {
    console.error('Error in /api/assistant/chat:', err);
    return res.status(500).json({ error: 'Failed to generate response', details: err.message });
  }
}
