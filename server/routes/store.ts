import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { Ticket } from "@shared/api";

const DATA_DIR = path.resolve("server/data");
const TICKETS_FILE = path.join(DATA_DIR, "tickets.json");

let ticketsCache: Ticket[] | null = null;
const adminSessions = new Map<string, number>(); // token -> expiresAt (ms)

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {}
}

async function loadTickets(): Promise<Ticket[]> {
  if (ticketsCache) return ticketsCache;
  await ensureDataDir();
  try {
    const raw = await fs.readFile(TICKETS_FILE, "utf-8");
    ticketsCache = JSON.parse(raw);
  } catch {
    ticketsCache = [];
  }
  return ticketsCache!;
}

export async function saveTickets(t: Ticket[]) {
  ticketsCache = t;
  await ensureDataDir();
  await fs.writeFile(TICKETS_FILE, JSON.stringify(t, null, 2));
}

export async function addTicket(ticket: Ticket) {
  const all = await loadTickets();
  all.unshift(ticket);
  await saveTickets(all);
}

export async function getTickets(): Promise<Ticket[]> {
  return loadTickets();
}

export async function getTicketById(id: string): Promise<Ticket | undefined> {
  const all = await loadTickets();
  return all.find((t) => t.id === id);
}

export async function updateTicket(id: string, updater: (t: Ticket) => Ticket) {
  const all = await loadTickets();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return;
  all[idx] = updater({ ...all[idx] });
  await saveTickets(all);
}

export async function deleteTicket(id: string): Promise<boolean> {
  const all = await loadTickets();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  all.splice(idx, 1);
  await saveTickets(all);
  return true;
}

export function createAdminSession(hours = 8) {
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = Date.now() + hours * 60 * 60 * 1000;
  adminSessions.set(token, expiresAt);
  return { token, expiresAt };
}

export function validateAdmin(token?: string | null) {
  if (!token) return false;
  const exp = adminSessions.get(token);
  if (!exp) return false;
  if (Date.now() > exp) {
    adminSessions.delete(token);
    return false;
  }
  return true;
}
