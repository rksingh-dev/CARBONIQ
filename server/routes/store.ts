import path from "path";
import crypto from "crypto";
import { Ticket } from "@shared/api";

const DATA_DIR = path.resolve("server/data");
const TICKETS_FILE = path.join(DATA_DIR, "tickets.json");

let ticketsCache: Ticket[] | null = null;
const adminSessions = new Map<string, number>(); // token -> expiresAt (ms)

// --- Pinata Helpers ---

function getPinataAuthHeaders() {
  const jwt = process.env.PINATA_JWT || process.env.VITE_PINATA_JWT;
  const apiKey = process.env.PINATA_API_KEY || process.env.VITE_PINATA_API_KEY;
  const apiSecret = process.env.PINATA_API_SECRET || process.env.VITE_PINATA_API_SECRET;

  if (jwt) {
    return { Authorization: `Bearer ${jwt}` } as Record<string, string>;
  }

  if (apiKey && apiSecret) {
    return {
      pinata_api_key: apiKey,
      pinata_secret_api_key: apiSecret,
    } as Record<string, string>;
  }
  return null;
}

async function fetchFromPinata(): Promise<Ticket[] | null> {
  const headers = getPinataAuthHeaders();
  if (!headers) return null;

  try {
    // Search for the latest "tickets.json"
    const searchUrl = `https://api.pinata.cloud/data/pinList?status=pinned&metadata[name]=tickets.json`;
    const searchRes = await fetch(searchUrl, { headers: { ...headers } });
    if (!searchRes.ok) return null;

    const json = await searchRes.json();
    const rows = json?.rows || json?.items || [];
    if (!Array.isArray(rows) || rows.length === 0) return null;

    // Get the most recent one (sorted by date usually, or just take first)
    const first = rows[0];
    const hash = first?.ipfs_pin_hash || first?.ipfsHash || first?.cid;
    if (!hash) return null;

    const ipfsUrl = `https://amethyst-additional-flamingo-32.mypinata.cloud/ipfs/${hash}`;
    const res = await fetch(ipfsUrl);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn("Error fetching tickets from Pinata:", e);
    return null;
  }
}

async function startPinning(tickets: Ticket[]) {
  const headers = getPinataAuthHeaders();
  if (!headers) return false;

  try {
    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pinataContent: tickets,
        pinataMetadata: {
          name: "tickets.json",
        },
      }),
    });
    return res.ok;
  } catch (e) {
    console.warn("Error pinning tickets to Pinata:", e);
    return false;
  }
}

// --- Storage Logic ---

// --- Storage Logic ---

async function ensureDataDir() {
  try {
    const fs = (await import("fs")).promises;
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch { }
}

async function loadTickets(): Promise<Ticket[]> {
  if (ticketsCache) return ticketsCache;

  // 1. Try Pinata (Source of Truth in Prov/Serverless)
  const fromPinata = await fetchFromPinata();
  if (fromPinata) {
    ticketsCache = fromPinata;
    return ticketsCache;
  }

  // 2. Try Local File System
  try {
    const fs = (await import("fs")).promises;
    await ensureDataDir();
    const raw = await fs.readFile(TICKETS_FILE, "utf-8");
    ticketsCache = JSON.parse(raw);
  } catch {
    ticketsCache = [];
  }

  return ticketsCache!;
}

export async function saveTickets(t: Ticket[]) {
  ticketsCache = t;

  // 1. Save to Pinata (Best Effort)
  const pinned = await startPinning(t);
  if (pinned) {
    console.log("Tickets saved to Pinata");
  }

  // 2. Save to Local File System (if possible)
  try {
    const fs = (await import("fs")).promises;
    await ensureDataDir();
    await fs.writeFile(TICKETS_FILE, JSON.stringify(t, null, 2));
  } catch (e) {
    // Ignore FS errors in serverless/readonly environments
    if (!pinned) {
      console.warn("Failed to save tickets to both Pinata and Disk. Data maintained in memory only.");
    }
  }
}

// --- Exported Methods ---

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
