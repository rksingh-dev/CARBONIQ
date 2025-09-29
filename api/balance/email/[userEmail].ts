export const config = { runtime: 'edge' };

// Re-declare types and globals for Edge runtime
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

const { emailToIpfsMap, inMemoryBalances } = global._carboniq_store;

function getPinataAuthHeaders() {
  const jwt = process.env.PINATA_JWT || process.env.VITE_PINATA_JWT;
  const apiKey = process.env.PINATA_API_KEY || process.env.VITE_PINATA_API_KEY;
  const apiSecret = process.env.PINATA_API_SECRET || process.env.VITE_PINATA_API_SECRET;
  
  console.log('Pinata env check (balance/email):', {
    hasJWT: !!jwt,
    hasApiKey: !!apiKey,
    hasApiSecret: !!apiSecret,
    env: process.env.NODE_ENV || 'production'
  });
  
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

export default async function handler(req: any, res: any) {
  // CORS: allow all origins and methods
  res.setHeader?.('Access-Control-Allow-Origin', '*');
  res.setHeader?.('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader?.('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  res.setHeader?.('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  // Always return fresh JSON to avoid 304 with empty body
  res.setHeader?.('Content-Type', 'application/json');
  res.setHeader?.('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader?.('Pragma', 'no-cache');
  res.setHeader?.('Expires', '0');
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userEmail } = req.query;
    if (!userEmail || typeof userEmail !== 'string') {
      return res.status(400).json({ error: "User email required" });
    }

    const emailKey = userEmail.toLowerCase();

    // Check in-memory first
    const mem = inMemoryBalances.get(emailKey);
    if (mem) {
      return res.status(200).json(mem);
    }

    // Try to fetch from IPFS using the stored hash
    let ipfsHash = emailToIpfsMap.get(emailKey);
    let fetchedFromIPFS = false;
    let balanceData: UserBalance | null = null;

    // Try multiple IPFS gateways for redundancy
    const ipfsGateways = [
      'https://amethyst-additional-flamingo-32.mypinata.cloud/ipfs/',
      'https://gateway.pinata.cloud/ipfs/',
      'https://ipfs.io/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/',
      'https://gateway.ipfs.io/ipfs/'
    ];

    if (!ipfsHash) {
      const headers = getPinataAuthHeaders();
      console.log('Searching for IPFS hash for email:', emailKey, 'headers available:', !!headers);
      if (headers) {
        try {
          const searchUrl = `https://api.pinata.cloud/data/pinList?status=pinned&metadata[name]=${encodeURIComponent(emailKey + "_balance.json")}`;
          console.log('Pinata search URL:', searchUrl);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          const searchRes = await fetch(searchUrl, { 
            headers: { ...headers },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          console.log('Pinata search response status:', searchRes.status);
          if (searchRes.ok) {
            const json = await searchRes.json();
            console.log('Pinata search results count:', json?.rows?.length || json?.items?.length || 0);
            const rows = json?.rows || json?.items || [];
            if (Array.isArray(rows) && rows.length > 0) {
              const first = rows[0];
              const hash = first?.ipfs_pin_hash || first?.ipfsHash || first?.cid;
              if (hash) {
                ipfsHash = hash;
                emailToIpfsMap.set(emailKey, ipfsHash);
                console.log('Found IPFS hash:', hash);
              }
            } else {
              console.log('No pinned files found for this email');
            }
          } else {
            const errorText = await searchRes.text();
            console.error('Pinata search failed:', searchRes.status, errorText.substring(0, 200));
          }
        } catch (e: any) {
          console.error('Pinata search error:', e.message || e);
          if (e.name === 'AbortError') {
            console.error('Pinata search timed out');
          }
        }
      } else {
        console.log('No Pinata headers available - using in-memory storage only');
      }
    }

    // Try to fetch from IPFS if we have a hash
    if (ipfsHash) {
      for (const gateway of ipfsGateways) {
        try {
          const ipfsUrl = `${gateway}${ipfsHash}`;
          console.log(`Trying IPFS gateway: ${gateway}`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout per gateway
          
          const response = await fetch(ipfsUrl, {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
            }
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            balanceData = await response.json();
            fetchedFromIPFS = true;
            console.log(`Successfully fetched from IPFS via ${gateway}`);
            
            // Ensure rupeesBalance default
            if (balanceData && typeof balanceData.rupeesBalance !== 'number') {
              balanceData.rupeesBalance = 100;
            }
            
            // Cache in memory for faster access
            if (balanceData) {
              inMemoryBalances.set(emailKey, balanceData);
            }
            break;
          }
        } catch (e: any) {
          console.warn(`Failed to fetch from ${gateway}:`, e.message);
          continue;
        }
      }
    }

    // Return the data or default
    if (balanceData) {
      return res.status(200).json(balanceData);
    } else {
      // Return default balance
      return res.status(200).json({
        userEmail: emailKey,
        totalBalance: 0,
        rupeesBalance: 100,
        transactions: [],
        lastUpdated: new Date().toISOString(),
        note: ipfsHash ? 'IPFS data temporarily unavailable' : 'No balance data found'
      });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Failed to retrieve balance" });
  }
}
