export const config = { runtime: 'nodejs' };
import type { UpdateTicketRequest } from '../../shared/api';
import { tickets } from './index';
import { sessions } from '../admin/login';

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
  const { id } = req.query;
  
  if (req.method === 'GET') {
    return handleGetTicket(req, res, id as string);
  } else if (req.method === 'PATCH') {
    return handleUpdateTicket(req, res, id as string);
  } else if (req.method === 'DELETE') {
    return handleDeleteTicket(req, res, id as string);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGetTicket(req: any, res: any, id: string) {
  try {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    return res.status(200).json(ticket);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Failed to get ticket" });
  }
}

async function handleUpdateTicket(req: any, res: any, id: string) {
  try {
    const adminToken = req.headers['x-admin-token'] as string;
    if (!adminToken) {
      return res.status(401).json({ error: "Admin token required" });
    }

    const session = sessions.get(adminToken);
    if (!session || Date.now() > session.expiresAt) {
      return res.status(401).json({ error: "Invalid or expired admin token" });
    }

    const ticket = tickets.find(t => t.id === id);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const { action, txHash, adminNote } = req.body as UpdateTicketRequest;
    
    if (action === "approve") {
      ticket.status = "approved";
      if (txHash) ticket.txHash = txHash;
    } else if (action === "reject") {
      ticket.status = "rejected";
    }

    ticket.updatedAt = new Date().toISOString();
    return res.status(200).json(ticket);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Failed to update ticket" });
  }
}

async function handleDeleteTicket(req: any, res: any, id: string) {
  try {
    const walletAddress = req.query.walletAddress as string;
    const adminToken = req.headers['x-admin-token'] as string;

    const ticketIndex = tickets.findIndex(t => t.id === id);
    if (ticketIndex === -1) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const ticket = tickets[ticketIndex];

    // Check permissions
    if (adminToken) {
      const session = sessions.get(adminToken);
      if (!session || Date.now() > session.expiresAt) {
        return res.status(401).json({ error: "Invalid or expired admin token" });
      }
    } else if (walletAddress && ticket.walletAddress === walletAddress) {
      // User can delete their own ticket
    } else {
      return res.status(403).json({ error: "Not authorized to delete this ticket" });
    }

    tickets.splice(ticketIndex, 1);
    return res.status(200).json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Failed to delete ticket" });
  }
}
