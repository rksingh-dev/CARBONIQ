export const config = { runtime: 'nodejs' };
import type { ListListingsResponse } from '../../shared/api';
import { listings } from './list';

export default async function handler(req: any, res: any) {
  // CORS: allow all origins and methods
  res.setHeader?.('Access-Control-Allow-Origin', '*');
  res.setHeader?.('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader?.('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  res.setHeader?.('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  res.setHeader?.('Content-Type', 'application/json');
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const status = (req.query.status as string) || "active";
    const filtered = listings.filter((l) => (status ? l.status === status : true));
    const resp: ListListingsResponse = { listings: filtered };
    return res.status(200).json(resp);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Failed to list" });
  }
}
