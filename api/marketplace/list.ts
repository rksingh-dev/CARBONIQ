export const config = { runtime: "nodejs" };
import type {
  MarketplaceListing,
  CreateListingRequest,
  CreateListingResponse,
} from "../../shared/api";
import { fetchIpfsJson } from "../_lib/ipfs";
import crypto from "crypto";
import {
  emailToIpfsMap,
  inMemoryBalances,
  getPinataAuthHeaders,
  pinataRequest,
} from "../balance/store";

// In-memory marketplace stores (use database in production)
let listings: MarketplaceListing[] = [];
let listingsCid: string | null = null;

async function pinJSON(name: string, content: any): Promise<string | null> {
  try {
    const res = await pinataRequest(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pinataContent: content,
          pinataMetadata: { name },
        }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.IpfsHash as string;
  } catch (e) {
    return null;
  }
}

async function saveListings() {
  const cid = await pinJSON("marketplace_listings.json", { listings });
  if (cid) listingsCid = cid;
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
              emailToIpfsMap.set(emailKey, hash);
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
    const bal: any = await fetchIpfsJson(ipfsHash);
    if (typeof bal.rupeesBalance !== "number") bal.rupeesBalance = 100;
    return bal;
  } catch {
    return null;
  }
}

export default async function handler(req: any, res: any) {
  // CORS: allow all origins and methods
  res.setHeader?.("Access-Control-Allow-Origin", "*");
  res.setHeader?.(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS",
  );
  res.setHeader?.(
    "Access-Control-Allow-Headers",
    "Content-Type, x-admin-token",
  );
  res.setHeader?.("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  res.setHeader?.("Content-Type", "application/json");
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body as CreateListingRequest;
    const {
      sellerEmail,
      sellerUserId,
      sellerWallet,
      amountTokens,
      priceRupees,
      signature,
    } = body;
    if (
      !sellerEmail ||
      !sellerWallet ||
      !amountTokens ||
      !priceRupees ||
      !signature
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Basic signature presence check
    if (typeof signature !== "string" || signature.length < 10) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    // Ensure seller has enough tokens
    const bal = await getUserBalanceByEmailInternal(sellerEmail);
    const available = bal?.totalBalance || 0;
    if (available < amountTokens) {
      return res.status(400).json({ error: "Insufficient token balance" });
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
    return res
      .status(500)
      .json({ error: e?.message || "Failed to create listing" });
  }
}

// Export for other endpoints
export { listings };
