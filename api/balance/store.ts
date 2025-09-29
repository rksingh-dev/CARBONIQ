export const config = { runtime: 'edge' };

// Balance types and storage
interface UserBalance {
  userEmail: string;
  userId?: string;
  walletAddress?: string;
  totalBalance: number;
  rupeesBalance: number;
  transactions: Array<{
    id: string;
    amount: number;
    adminSignature: string;
    timestamp: string;
    ticketId: string;
    walletAddress?: string;
    userEmail: string;
    adminEmail?: string;
  }>;
  lastUpdated: string;
}

// In-memory stores - Using global object for edge runtime persistence
declare global {
  var _carboniq_store: {
    emailToIpfsMap: Map<string, string>;
    userIdToEmail: Map<string, string>;
    inMemoryBalances: Map<string, UserBalance>;
  } | undefined;
}

if (!global._carboniq_store) {
  global._carboniq_store = {
    emailToIpfsMap: new Map(),
    userIdToEmail: new Map(),
    inMemoryBalances: new Map()
  };
}

const { emailToIpfsMap, userIdToEmail, inMemoryBalances } = global._carboniq_store;

function getPinataAuthHeaders() {
  // Vercel environment variable access
  const jwt = process.env.PINATA_JWT || process.env.VITE_PINATA_JWT;
  const apiKey = process.env.PINATA_API_KEY || process.env.VITE_PINATA_API_KEY;
  const apiSecret = process.env.PINATA_API_SECRET || process.env.VITE_PINATA_API_SECRET;
  
  // Debug logging for production
  console.log('Pinata env check:', {
    hasJWT: !!jwt,
    hasApiKey: !!apiKey,
    hasApiSecret: !!apiSecret,
    jwtLength: jwt?.length || 0,
    apiKeyLength: apiKey?.length || 0,
    env: process.env.NODE_ENV || 'production'
  });
  
  if (jwt) {
    console.log('Using JWT authentication');
    return { Authorization: `Bearer ${jwt}` } as Record<string, string>;
  }
  
  if (apiKey && apiSecret) {
    console.log('Using API key authentication');
    return {
      pinata_api_key: apiKey,
      pinata_secret_api_key: apiSecret,
    } as Record<string, string>;
  }
  
  console.warn('No Pinata credentials found - will use in-memory storage only');
  return null;
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

    // Get existing balance
    let existingBalance: UserBalance | null = null;
    const existingIpfsHash = emailToIpfsMap.get(emailKey);
    
    if (existingIpfsHash) {
      try {
        const existingResponse = await fetch(`https://amethyst-additional-flamingo-32.mypinata.cloud/ipfs/${existingIpfsHash}`);
        if (existingResponse.ok) {
          existingBalance = await existingResponse.json();
        }
      } catch (e) {
        console.log('Error fetching existing balance:', e);
      }
    } else {
      const mem = inMemoryBalances.get(emailKey);
      if (mem) existingBalance = mem;
    }

    // Create new transaction
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
      emailToIpfsMap.set(emailKey, cid);

      return res.status(200).json({
        success: true,
        cid,
        balance: updatedBalance.totalBalance,
        ipfsUrl: `https://amethyst-additional-flamingo-32.mypinata.cloud/ipfs/${cid}`,
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
}

// Export for other endpoints
export { emailToIpfsMap, userIdToEmail, inMemoryBalances, getPinataAuthHeaders };
export type { UserBalance };
