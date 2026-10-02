import type { IncomingMessage, ServerResponse } from 'http';

interface VercelRequest extends IncomingMessage {
  body: any;
  query: { [key: string]: string | string[] };
}

interface VercelResponse extends ServerResponse {
  status: (statusCode: number) => VercelResponse;
  json: (data: any) => VercelResponse;
  send: (body: any) => VercelResponse;
}

const processedIdempotencyKeys = new Set<string>();

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

    const items = body?.items;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items must be an array' });
    }

    let newlyProcessed = 0;
    let duplicatesSkipped = 0;

    for (const item of items) {
      if (item?.idempotencyKey && processedIdempotencyKeys.has(item.idempotencyKey)) {
        duplicatesSkipped++;
        continue;
      }
      if (item?.idempotencyKey) {
        processedIdempotencyKeys.add(item.idempotencyKey);
      }
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
}
