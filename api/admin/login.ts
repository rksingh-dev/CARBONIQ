export const config = { runtime: 'nodejs' };
import type { AdminLoginRequest, AdminLoginResponse } from '../../shared/api';
import { createAdminToken, getAdminCredentials, getAdminSessionHours } from '../../server/utils/adminAuth';

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body as AdminLoginRequest;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const { username: expectedUser, password: expectedPass } = getAdminCredentials();
    if (username !== expectedUser || password !== expectedPass) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const expiresAt = Date.now() + getAdminSessionHours() * 60 * 60 * 1000;
    const token = createAdminToken(expectedUser, expiresAt);

    const response: AdminLoginResponse = {
      token,
      expiresAt: new Date(expiresAt).toISOString(),
    };

    return res.status(200).json(response);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Login failed" });
  }
}
