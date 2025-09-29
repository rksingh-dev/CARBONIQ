import type { RequestHandler } from "express";
import crypto from "crypto";
import {
  MarketplaceListing,
  MarketplaceOrder,
  CreateListingRequest,
  CreateListingResponse,
  ListListingsResponse,
  BuyListingRequest,
  BuyListingResponse,
} from "@shared/api";

// Local helpers (similar to balance.ts)
function getPinataAuthHeaders() {
  const jwt = process.env.PINATA_JWT || process.env.VITE_PINATA_JWT;
  const apiKey = process.env.PINATA_API_KEY || process.env.VITE_PINATA_API_KEY;
  const apiSecret = process.env.PINATA_API_SECRET || process.env.VITE_PINATA_API_SECRET;
  
  if (jwt) {
    console.log('Using JWT authentication for Pinata');
    return { Authorization: `Bearer ${jwt}` } as Record<string, string>;
  }
  
  if (apiKey && apiSecret) {
    console.log('Using API key authentication for Pinata');
    return {
      pinata_api_key: apiKey,
      pinata_secret_api_key: apiSecret,
    } as Record<string, string>;
  }
  
  console.warn('No Pinata credentials found - will use in-memory storage only');
  return null;
}

// In-memory fallback stores (persisted to Pinata when possible)
let listings: MarketplaceListing[] = [];
let orders: MarketplaceOrder[] = [];
let listingsCid: string | null = null;
let ordersCid: string | null = null;

async function pinJSON(name: string, content: any): Promise<string | null> {
  const headers = getPinataAuthHeaders();
  if (!headers) return null;
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ pinataContent: content, pinataMetadata: { name } }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.IpfsHash as string;
}

async function saveListings() {
  const cid = await pinJSON("marketplace_listings.json", { listings });
  if (cid) listingsCid = cid;
}

async function saveOrders() {
  const cid = await pinJSON("marketplace_orders.json", { orders });
  if (cid) ordersCid = cid;
}

// Balance helpers
async function updateUserBalanceByEmail(
  userEmail: string,
  deltaTokens: number,
  deltaRupees: number,
  metadata: { reason: string; listingId?: string; counterpartyEmail?: string }
): Promise<{ totalBalance: number; rupeesBalance: number }> {
  // Call internal balance endpoint through local function
  const { getUserBalanceByEmailInternal, storeUserBalanceInternal } = await import("./balance");
  if (getUserBalanceByEmailInternal && storeUserBalanceInternal) {
    const current = await getUserBalanceByEmailInternal(userEmail);
    const newTokens = (current?.totalBalance || 0) + deltaTokens;
    const newRupees = (current?.rupeesBalance ?? 100) + deltaRupees;
    const txNote = `${metadata.reason}${metadata.listingId ? `|listing:${metadata.listingId}` : ""}${metadata.counterpartyEmail ? `|cp:${metadata.counterpartyEmail}` : ""}`;
    await storeUserBalanceInternal({
      userEmail,
      userId: current?.userId,
      walletAddress: current?.walletAddress,
      amount: deltaTokens, // keep token delta in amount, rupees tracked separately
      adminSignature: txNote,
      ticketId: `market_${Date.now()}`,
      deltaRupees: deltaRupees,
    });
    return { totalBalance: newTokens, rupeesBalance: newRupees };
  }
  // Fallback: if internal not available, do nothing meaningful
  return { totalBalance: 0, rupeesBalance: 0 };
}

export const createListing: RequestHandler = async (req, res) => {
  try {
    const body = req.body as CreateListingRequest;
    const { sellerEmail, sellerUserId, sellerWallet, amountTokens, priceRupees, signature } = body;
    if (!sellerEmail || !sellerWallet || !amountTokens || !priceRupees || !signature) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Basic signature presence check (not verifying on-chain owner here)
    if (typeof signature !== "string" || signature.length < 10) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    // Ensure seller has enough tokens
    // We rely on balance module internal helpers if available
    const { getUserBalanceByEmailInternal } = await import("./balance");
    if (getUserBalanceByEmailInternal) {
      const bal = await getUserBalanceByEmailInternal(sellerEmail);
      const available = bal?.totalBalance || 0;
      if (available < amountTokens) {
        return res.status(400).json({ error: "Insufficient token balance" });
      }
    }

    const now = new Date().toISOString();
    const listing: MarketplaceListing = {
      id: crypto.randomUUID(),
      sellerEmail: sellerEmail.toLowerCase(),
      sellerUserId,
      sellerWallet,
      amountTokens,
      priceRupees,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    listings.unshift(listing);
    await saveListings();

    const resp: CreateListingResponse = { listing };
    return res.status(201).json(resp);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Failed to create listing" });
  }
};

export const listListings: RequestHandler = async (req, res) => {
  try {
    const status = (req.query.status as string) || "active";
    const filtered = listings.filter((l) => (status ? l.status === status : true));
    const resp: ListListingsResponse = { listings: filtered };
    return res.status(200).json(resp);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Failed to list" });
  }
};

export const buyListing: RequestHandler = async (req, res) => {
  try {
    const body = req.body as BuyListingRequest;
    const { listingId, buyerEmail, buyerUserId, buyerWallet, signature } = body;
    if (!listingId || !buyerEmail || !buyerWallet || !signature) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const listing = listings.find((l) => l.id === listingId);
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    if (listing.status !== "active") return res.status(400).json({ error: "Listing not available" });
    if (listing.sellerEmail === buyerEmail.toLowerCase()) return res.status(400).json({ error: "Cannot buy your own listing" });

    // Check buyer rupees balance
    const { getUserBalanceByEmailInternal } = await import("./balance");
    if (getUserBalanceByEmailInternal) {
      const balBuyer = await getUserBalanceByEmailInternal(buyerEmail);
      const rupees = balBuyer?.rupeesBalance ?? 100;
      if (rupees < listing.priceRupees) {
        return res.status(400).json({ error: "Insufficient rupees balance" });
      }
    }

    // Perform atomic updates: buyer (+tokens -rupees), seller (-tokens +rupees)
    const buyerBalance = await updateUserBalanceByEmail(
      buyerEmail,
      +listing.amountTokens,
      -listing.priceRupees,
      { reason: "market_buy", listingId: listing.id, counterpartyEmail: listing.sellerEmail }
    );
    const sellerBalance = await updateUserBalanceByEmail(
      listing.sellerEmail,
      -listing.amountTokens,
      +listing.priceRupees,
      { reason: "market_sell", listingId: listing.id, counterpartyEmail: buyerEmail }
    );

    // Update listing and create order
    listing.status = "sold";
    listing.updatedAt = new Date().toISOString();
    await saveListings();

    const order: MarketplaceOrder = {
      id: crypto.randomUUID(),
      listingId: listing.id,
      buyerEmail: buyerEmail.toLowerCase(),
      buyerUserId,
      buyerWallet,
      amountTokens: listing.amountTokens,
      totalRupees: listing.priceRupees,
      status: "completed",
      adminSignature: signature,
      createdAt: new Date().toISOString(),
    };
    orders.unshift(order);
    await saveOrders();

    const resp: BuyListingResponse = {
      listing,
      order,
      buyerBalance,
      sellerBalance,
    };
    return res.status(200).json(resp);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Failed to buy listing" });
  }
};
