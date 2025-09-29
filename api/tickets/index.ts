export const config = { runtime: 'nodejs' };
import type { Ticket, CreateTicketRequest, TicketsListResponse } from '../../shared/api';
import crypto from 'crypto';

// In-memory ticket store (use database in production)
let tickets: Ticket[] = [];

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
  // Ensure JSON body is parsed for POST requests in some runtimes
  if (req.method !== 'GET' && typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }
  if (req.method === 'GET') {
    return handleListTickets(req, res);
  } else if (req.method === 'POST') {
    return handleCreateTicket(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleListTickets(req: any, res: any) {
  try {
    const walletAddress = req.query.walletAddress as string;
    const adminToken = req.headers['x-admin-token'] as string;

    let filtered = tickets;

    // Admin can see all tickets
    if (adminToken) {
      try {
        const mod = await import('../admin/login');
        const sessions = (mod as any).sessions as Map<string, { expiresAt: number }> | undefined;
        const session = sessions?.get(adminToken);
        if (!session || Date.now() > session.expiresAt) {
          return res.status(401).json({ error: "Invalid or expired admin token" });
        }
      } catch {
        return res.status(401).json({ error: "Admin validation unavailable" });
      }
    } else if (walletAddress) {
      // Non-admin users can only see their own tickets
      filtered = tickets.filter(t => t.walletAddress === walletAddress);
    } else {
      return res.status(400).json({ error: "Wallet address required for non-admin users" });
    }

    const response: TicketsListResponse = { tickets: filtered };
    return res.status(200).json(response);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Failed to list tickets" });
  }
}

async function handleCreateTicket(req: any, res: any) {
  try {
    const body = (req.body || {}) as Partial<CreateTicketRequest>;
    const { walletAddress, reportCid, reportName, analysis, userId, userEmail } = body as CreateTicketRequest;
    if (!walletAddress || !reportCid || !reportName || !analysis || !userId || !userEmail) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const now = new Date().toISOString();
    const ticket: Ticket = {
      id: crypto.randomUUID(),
      walletAddress,
      userId,
      userEmail,
      reportCid,
      reportName,
      analysis,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    tickets.unshift(ticket);
    return res.status(201).json(ticket);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Failed to create ticket" });
  }
}

// Export tickets for other endpoints
export { tickets };
