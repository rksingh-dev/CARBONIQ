import type { RequestHandler } from "express";

// In-memory stores
// Map Google userEmail -> IPFS hash (primary key)
const emailToIpfsMap = new Map<string, string>();
// Optional: userId -> email reverse index (best-effort)
const userIdToEmail = new Map<string, string>();
// In-memory balance fallback when Pinata credentials are not configured
const inMemoryBalances = new Map<string, UserBalance>(); // key: userEmail (lowercased)

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

export interface UserBalance {
  userEmail: string;
  userId?: string;
  walletAddress?: string; // optional, for metadata
  totalBalance: number;
  rupeesBalance: number;
  transactions: Array<{
    id: string;
    amount: number;
    adminSignature: string;
    timestamp: string;
    ticketId: string;
    walletAddress?: string; // optional metadata
    userEmail: string;
    adminEmail?: string;
  }>;
  lastUpdated: string;
}

// Store user balance in IPFS
export const storeUserBalance: RequestHandler = async (req, res) => {
  try {
    const { userEmail, userId, walletAddress, amount, adminSignature, ticketId, adminEmail } = req.body as {
      userEmail: string;
      userId?: string;
      walletAddress?: string;
      amount: number;
      adminSignature: string;
      ticketId: string;
      adminEmail?: string;
    };

    if (!userEmail || !amount || !adminSignature || !ticketId) {
      return res.status(400).json({ error: "Missing required fields (userEmail, amount, adminSignature, ticketId)" });
    }
    const emailKey = userEmail.toLowerCase();
    if (userId) userIdToEmail.set(userId, emailKey);

    // First, try to get existing balance from IPFS
    let existingBalance: UserBalance | null = null;
    const existingIpfsHash = emailToIpfsMap.get(emailKey);
    
    if (existingIpfsHash) {
      try {
        console.log('Fetching existing balance from IPFS hash:', existingIpfsHash);
        const existingResponse = await fetch(`https://amethyst-additional-flamingo-32.mypinata.cloud/ipfs/${existingIpfsHash}`);
        if (existingResponse.ok) {
          existingBalance = await existingResponse.json();
          console.log('Existing balance found:', existingBalance);
        }
      } catch (e) {
        console.log('Error fetching existing balance:', e);
      }
    } else {
      console.log('No existing IPFS hash found for email:', emailKey);
      // Fallback to in-memory
      const mem = inMemoryBalances.get(emailKey);
      if (mem) existingBalance = mem;
    }

    // Create or update balance
    const newTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount,
      adminSignature,
      timestamp: new Date().toISOString(),
      ticketId,
      walletAddress,
      userEmail: emailKey,
      adminEmail,
    };

    console.log('Creating new transaction:', newTransaction);
    console.log('Amount being added:', amount, 'Type:', typeof amount);

    const updatedBalance: UserBalance = existingBalance ? {
      ...existingBalance,
      totalBalance: existingBalance.totalBalance + amount,
      rupeesBalance: existingBalance.rupeesBalance ?? 100,
      transactions: [...existingBalance.transactions, newTransaction],
      lastUpdated: new Date().toISOString(),
    } : {
      userEmail: emailKey,
      userId,
      walletAddress,
      totalBalance: amount,
      rupeesBalance: 100,
      transactions: [newTransaction],
      lastUpdated: new Date().toISOString(),
    };

    console.log('Updated balance to store:', updatedBalance);
    console.log('Total balance after update:', updatedBalance.totalBalance);

    // Upload to IPFS
    const headers = getPinataAuthHeaders();
    if (headers) {
      const uploadResponse = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pinataContent: updatedBalance,
          pinataMetadata: {
            name: `${emailKey}_balance.json`,
          },
        }),
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.warn("Failed to store balance in IPFS, falling back to memory:", errorText);
        inMemoryBalances.set(emailKey, updatedBalance);
        return res.status(200).json({
          success: true,
          cid: "",
          balance: updatedBalance.totalBalance,
          ipfsUrl: "",
          note: "Stored in-memory (Pinata not available)",
        });
      }

      const uploadResult = await uploadResponse.json();
      const cid = uploadResult.IpfsHash;

      // Update the mapping
      emailToIpfsMap.set(emailKey, cid);
      console.log('Updated IPFS mapping for userEmail:', emailKey, '->', cid);

      return res.status(200).json({
        success: true,
        cid,
        balance: updatedBalance.totalBalance,
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
      });
    } else {
      // No Pinata creds: store in-memory
      inMemoryBalances.set(emailKey, updatedBalance);
      return res.status(200).json({
        success: true,
        cid: "",
        balance: updatedBalance.totalBalance,
        ipfsUrl: "",
        note: "Stored in-memory (Pinata credentials missing)",
      });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Failed to store balance" });
  }
};

// Retrieve user balance from IPFS
export const getUserBalance: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.params as { userId: string };

    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    // Map userId -> email if known
    const emailKey = userIdToEmail.get(userId);
    if (emailKey) {
      // Delegate to email-based lookup
      (req.params as any).userEmail = emailKey;
      return await (getUserBalanceByEmail as any)(req, res, (() => {}) as any);
    }

    // As a fallback: return zero if we don't know the email mapping
    return res.status(200).json({
      userEmail: "",
      userId,
      totalBalance: 0,
      transactions: [],
      lastUpdated: new Date().toISOString(),
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Failed to retrieve balance" });
  }
};

// Retrieve user balance by email from IPFS or memory
export const getUserBalanceByEmail: RequestHandler = async (req, res) => {
  try {
    const { userEmail } = req.params as { userEmail: string };
    if (!userEmail) return res.status(400).json({ error: "User email required" });
    const emailKey = userEmail.toLowerCase();

    // Check in-memory first
    const mem = inMemoryBalances.get(emailKey);
    if (mem) {
      return res.status(200).json(mem);
    }

    // Try to fetch from IPFS using the stored hash
    let ipfsHash = emailToIpfsMap.get(emailKey);

    if (!ipfsHash) {
      console.log('No IPFS hash found in memory for email:', emailKey, '— attempting Pinata search');
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
                console.log('Recovered IPFS hash from Pinata for email:', emailKey, '->', ipfsHash);
              }
            }
          } else {
            console.warn('Pinata search failed with status', searchRes.status);
          }
        } catch (e) {
          console.warn('Pinata search error:', e);
        }
      }

      if (!ipfsHash) {
        console.log('No IPFS hash found for email after search:', emailKey);
        return res.status(200).json({
          userEmail: emailKey,
          totalBalance: 0,
          transactions: [],
          lastUpdated: new Date().toISOString(),
        });
      }
    }

    const ipfsUrl = `https://amethyst-additional-flamingo-32.mypinata.cloud/ipfs/${ipfsHash}`;
    console.log('Fetching balance from IPFS URL:', ipfsUrl);
    try {
      const response = await fetch(ipfsUrl);
      if (!response.ok) {
        return res.status(200).json({
          userEmail: emailKey,
          totalBalance: 0,
          transactions: [],
          lastUpdated: new Date().toISOString(),
        });
      }
      const balance: UserBalance = await response.json();
      return res.status(200).json(balance);
    } catch (e) {
      return res.status(200).json({
        userEmail: emailKey,
        totalBalance: 0,
        transactions: [],
        lastUpdated: new Date().toISOString(),
      });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Failed to retrieve balance" });
  }
};

// Get all user balances (admin only)
export const getAllBalances: RequestHandler = async (req, res) => {
  try {
    // Return the mapping for debugging
    const balances = Array.from(emailToIpfsMap.entries()).map(([userEmail, hash]) => ({
      userEmail,
      ipfsHash: hash,
      ipfsUrl: `https://amethyst-additional-flamingo-32.mypinata.cloud/ipfs/${hash}`
    }));
    
    return res.status(200).json({
      balances,
      totalUsers: balances.length,
      mapping: Object.fromEntries(emailToIpfsMap)
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Failed to retrieve balances" });
  }
};

// Internal helpers for marketplace usage
export async function getUserBalanceByEmailInternal(userEmail: string): Promise<UserBalance | null> {
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
    } as UserBalance;
  }
  try {
    const resp = await fetch(`https://amethyst-additional-flamingo-32.mypinata.cloud/ipfs/${ipfsHash}`);
    if (!resp.ok) return null;
    const bal = (await resp.json()) as UserBalance;
    if (typeof bal.rupeesBalance !== 'number') bal.rupeesBalance = 100;
    return bal;
  } catch {
    return null;
  }
}

export async function storeUserBalanceInternal(args: {
  userEmail: string;
  userId?: string;
  walletAddress?: string;
  amount: number;
  adminSignature: string;
  ticketId: string;
  deltaRupees?: number;
}): Promise<UserBalance> {
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
  const newBal: UserBalance = {
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
