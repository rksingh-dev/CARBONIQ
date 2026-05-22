export const config = { runtime: 'nodejs18.x' };
import { verifyAdminToken } from '../../server/utils/adminAuth';

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
    const token = req.headers['x-admin-token'] as string;
    if (!token) {
      return res.status(401).json({ error: "Admin token required" });
    }

    const result = verifyAdminToken(token);
    if (!result.valid) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    return res.status(200).json({ valid: true, expiresAt: new Date(result.expiresAt!).toISOString() });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Validation failed" });
  }
}
