import type { Ticket, CreateTicketRequest, TicketsListResponse } from '../../shared/api';
import crypto from 'crypto';
import { verifyAdminToken } from '../../server/utils/adminAuth';

// In-memory ticket store (use database in production)
let tickets: Ticket[] = [];
// export const config = { runtime: 'nodejs18.x' };

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
    const adminToken = req.headers['x-admin-token'] as string | undefined;
    const isAdmin = verifyAdminToken(adminToken).valid;

    let filtered = tickets;
    if (!isAdmin) {
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address required for non-admin users" });
      }
      filtered = tickets.filter(t => t.walletAddress === walletAddress);
    } else if (walletAddress) {
      filtered = tickets.filter(t => t.walletAddress === walletAddress);
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
