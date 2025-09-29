export const config = { runtime: 'nodejs' };
import type { AdminLoginRequest, AdminLoginResponse } from '../../shared/api';

// In-memory session store (for serverless, consider using Redis/DB for production)
const sessions = new Map<string, { expiresAt: number }>();

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

    // Simple hardcoded admin check (use proper auth in production)
    if (username !== "admin" || password !== "admin123") {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    sessions.set(token, { expiresAt });

    const response: AdminLoginResponse = {
      token,
      expiresAt: new Date(expiresAt).toISOString(),
    };

    return res.status(200).json(response);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Login failed" });
  }
}

// Export sessions for validation endpoint
export { sessions };
