export const config = { runtime: 'edge' };
import type { MarketplaceOrder, BuyListingRequest, BuyListingResponse } from '../../shared/api';

// Global store for Edge runtime
declare global {
  var _carboniq_marketplace: {
    orders: MarketplaceOrder[];
    listings: any[];
  } | undefined;
  var _carboniq_store: {
    emailToIpfsMap: Map<string, string>;
    userIdToEmail: Map<string, string>;
    inMemoryBalances: Map<string, any>;
  } | undefined;
}

if (!global._carboniq_marketplace) {
  global._carboniq_marketplace = {
    orders: [],
    listings: []
  };
}

if (!global._carboniq_store) {
  global._carboniq_store = {
    emailToIpfsMap: new Map(),
    userIdToEmail: new Map(),
    inMemoryBalances: new Map()
  };
}

const { orders, listings } = global._carboniq_marketplace;
const { emailToIpfsMap, inMemoryBalances } = global._carboniq_store;

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

async function saveOrders() {
  const cid = await pinJSON("marketplace_orders.json", { orders });
  return cid;
}

async function saveListings() {
  const cid = await pinJSON("marketplace_listings.json", { listings });
  return cid;
}

async function getUserBalanceByEmailInternal(userEmail: string) {
  const emailKey = userEmail.toLowerCase();
  const mem = inMemoryBalances.get(emailKey);
  if (mem) return mem;
  
  let ipfsHash = emailToIpfsMap.get(emailKey);
  if (!ipfsHash) {
    const headers = getPinataAuthHeaders();
    if (headers) {
      try {
        const searchUrl = `https://api.pinata.cloud/data/pinList?status=pinned&metadata[name]=${encodeURIComponent(emailKey + "_balance.json")}`;
        const searchRes = await fetch(searchUrl, { headers: { ...headers } });
        if (searchRes.ok) {
          const json = await searchRes.json();
          const rows = json?.rows || json?.items || [];
          if (Array.isArray(rows) && rows.length > 0) {
            const first = rows[0];
            const hash = first?.ipfs_pin_hash || first?.ipfsHash || first?.cid;
            if (hash) {
              ipfsHash = hash;
              emailToIpfsMap.set(emailKey, ipfsHash);
            }
          }
        }
      } catch {}
    }
  }
  
  if (!ipfsHash) {
    return {
      userEmail: emailKey,
      totalBalance: 0,
      rupeesBalance: 100,
      transactions: [],
      lastUpdated: new Date().toISOString(),
    };
  }
  
  try {
    const resp = await fetch(`https://amethyst-additional-flamingo-32.mypinata.cloud/ipfs/${ipfsHash}`);
    if (!resp.ok) return null;
    const bal = await resp.json();
    if (typeof bal.rupeesBalance !== 'number') bal.rupeesBalance = 100;
    return bal;
  } catch {
    return null;
  }
}

async function storeUserBalanceInternal(args: {
  userEmail: string;
  userId?: string;
  walletAddress?: string;
  amount: number;
  adminSignature: string;
  ticketId: string;
  deltaRupees?: number;
}) {
  const { userEmail, userId, walletAddress, amount, adminSignature, ticketId, deltaRupees = 0 } = args;
  const emailKey = userEmail.toLowerCase();
  
  let existing = await getUserBalanceByEmailInternal(emailKey);
  if (!existing) {
    existing = {
      userEmail: emailKey,
      userId,
      walletAddress,
      totalBalance: 0,
      rupeesBalance: 100,
      transactions: [],
      lastUpdated: new Date().toISOString(),
    };
  }
  
  const newBal = {
    ...existing,
    userId: existing.userId ?? userId,
    walletAddress: existing.walletAddress ?? walletAddress,
    totalBalance: (existing.totalBalance || 0) + amount,
    rupeesBalance: (typeof existing.rupeesBalance === 'number' ? existing.rupeesBalance : 100) + deltaRupees,
    transactions: [
      ...existing.transactions,
      {
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        amount,
        adminSignature,
        timestamp: new Date().toISOString(),
        ticketId,
        walletAddress,
        userEmail: emailKey,
      },
    ],
    lastUpdated: new Date().toISOString(),
  };
  
  const headers = getPinataAuthHeaders();
  if (headers) {
    const uploadResponse = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        pinataContent: newBal,
        pinataMetadata: { name: `${emailKey}_balance.json` },
      }),
    });
    if (uploadResponse.ok) {
      const uploadResult = await uploadResponse.json();
      const cid = uploadResult.IpfsHash;
      if (cid) emailToIpfsMap.set(emailKey, cid);
    } else {
      inMemoryBalances.set(emailKey, newBal);
    }
  } else {
    inMemoryBalances.set(emailKey, newBal);
  }
  return newBal;
}

async function updateUserBalanceByEmail(
  userEmail: string,
  deltaTokens: number,
  deltaRupees: number,
  metadata: { reason: string; listingId?: string; counterpartyEmail?: string }
): Promise<{ totalBalance: number; rupeesBalance: number }> {
  const current = await getUserBalanceByEmailInternal(userEmail);
  const newTokens = (current?.totalBalance || 0) + deltaTokens;
  const newRupees = (current?.rupeesBalance ?? 100) + deltaRupees;
  const txNote = `${metadata.reason}${metadata.listingId ? `|listing:${metadata.listingId}` : ""}${metadata.counterpartyEmail ? `|cp:${metadata.counterpartyEmail}` : ""}`;
  
  await storeUserBalanceInternal({
    userEmail,
    userId: current?.userId,
    walletAddress: current?.walletAddress,
    amount: deltaTokens,
    adminSignature: txNote,
    ticketId: `market_${Date.now()}`,
    deltaRupees: deltaRupees,
  });
  
  return { totalBalance: newTokens, rupeesBalance: newRupees };
}

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
    const balBuyer = await getUserBalanceByEmailInternal(buyerEmail);
    const rupees = balBuyer?.rupeesBalance ?? 100;
    if (rupees < listing.priceRupees) {
      return res.status(400).json({ error: "Insufficient rupees balance" });
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
}
