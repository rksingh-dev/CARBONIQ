import type { RequestHandler } from "express";
import {
  CreateTicketRequest,
  TicketsListResponse,
  Ticket,
  UpdateTicketRequest,
} from "@shared/api";
import { addTicket, getTicketById, getTickets, updateTicket, deleteTicket as deleteTicketFromStore, saveTickets } from "./store";
import crypto from "crypto";
import { validateAdmin } from "./store";

export const listTickets: RequestHandler = async (req, res) => {
  const all = await getTickets();
  const adminToken = req.header("x-admin-token");
  const isAdmin = validateAdmin(adminToken);
  const walletAddress = (req.query.walletAddress as string) || "";

  let result: Ticket[] = all;
  if (!isAdmin) {
    if (!walletAddress) return res.status(400).json({ error: "walletAddress required" });
    result = all.filter(
      (t) => t.walletAddress.toLowerCase() === walletAddress.toLowerCase(),
    );
  } else {
    // Admin can see all tickets, but if walletAddress is provided, filter by it
    if (walletAddress) {
      result = all.filter(
        (t) => t.walletAddress.toLowerCase() === walletAddress.toLowerCase(),
      );
    }
  }
  const response: TicketsListResponse = { tickets: result };
  return res.status(200).json(response);
};

export const getTicket: RequestHandler = async (req, res) => {
  const id = req.params.id;
  const t = await getTicketById(id);
  if (!t) return res.status(404).json({ error: "Not found" });
  return res.json(t);
};

export const createTicket: RequestHandler = async (req, res) => {
  const { walletAddress, reportCid, reportName, analysis, userId, userEmail } = req.body as CreateTicketRequest;
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
  await addTicket(ticket);
  return res.status(201).json(ticket);
};

export const updateTicketStatus: RequestHandler = async (req, res) => {
  const adminToken = req.header("x-admin-token");
  if (!validateAdmin(adminToken)) return res.status(401).json({ error: "Unauthorized" });

  const id = req.params.id;
  const body = req.body as UpdateTicketRequest;

  const t = await getTicketById(id);
  if (!t) return res.status(404).json({ error: "Not found" });

  await updateTicket(id, (prev) => {
    const now = new Date().toISOString();
    if (body.action === "approve") {
      prev.status = "approved";
      if (body.txHash) prev.txHash = body.txHash;
      prev.updatedAt = now;
    } else if (body.action === "reject") {
      prev.status = "rejected";
      prev.updatedAt = now;
    } else if (body.action === "setTxHash") {
      if (body.txHash) prev.txHash = body.txHash;
      prev.updatedAt = now;
    }
    return prev;
  });

  const updated = await getTicketById(id);
  return res.json(updated);
};

export const deleteTicket: RequestHandler = async (req, res) => {
  try {
    const id = req.params.id;
    const adminToken = req.header("x-admin-token");
    const isAdmin = validateAdmin(adminToken);
    const all = await getTickets();
    const ticket = all.find((t) => t.id === id);
    
    console.log('Delete ticket request:', { id, isAdmin, ticketFound: !!ticket, ticket });
    
    if (!ticket) return res.status(404).json({ error: "Not found" });

    // Allow admin or owner
    const walletAddress = (req.query.walletAddress as string) || req.body.walletAddress;
    console.log('Authorization check:', { isAdmin, walletAddress, ticketWalletAddress: ticket?.walletAddress });
    
    if (!isAdmin && (!walletAddress || ticket.walletAddress.toLowerCase() !== walletAddress.toLowerCase())) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const deleted = await deleteTicketFromStore(id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error('Error deleting ticket:', e);
    return res.status(500).json({ error: e?.message || 'Delete failed' });
  }
};

// Clear all tickets (admin only)
export const clearAllTickets: RequestHandler = async (req, res) => {
  try {
    const adminToken = req.header("x-admin-token");
    if (!validateAdmin(adminToken)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const all = await getTickets();
    const clearedCount = all.length;
    
    // Clear all tickets
    await saveTickets([]);
    
    return res.status(200).json({ 
      success: true, 
      clearedCount,
      message: `Cleared ${clearedCount} tickets successfully` 
    });
  } catch (e: any) {
    console.error('Error clearing tickets:', e);
    return res.status(500).json({ error: e?.message || 'Clear failed' });
  }
};

// Clear tickets by status (admin only)
export const clearTicketsByStatus: RequestHandler = async (req, res) => {
  try {
    const adminToken = req.header("x-admin-token");
    if (!validateAdmin(adminToken)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { status } = req.body as { status: string };
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const all = await getTickets();
    const filteredTickets = all.filter(ticket => ticket.status !== status);
    const clearedCount = all.length - filteredTickets.length;
    
    await saveTickets(filteredTickets);
    
    return res.status(200).json({ 
      success: true, 
      clearedCount,
      remainingCount: filteredTickets.length,
      message: `Cleared ${clearedCount} ${status} tickets successfully` 
    });
  } catch (e: any) {
    console.error('Error clearing tickets by status:', e);
    return res.status(500).json({ error: e?.message || 'Clear failed' });
  }
};
