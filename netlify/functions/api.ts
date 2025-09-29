import { Handler } from "@netlify/functions";

// In-memory storage for tickets (since Netlify functions can't write to filesystem)
let ticketsCache: any[] = [];

// Simple handler that routes to the appropriate API function
export const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-token',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Netlify invokes functions under "/.netlify/functions"; normalize to app paths
  const path = (event.path || '').replace(/^\/\.netlify\/functions/, '');
  const method = event.httpMethod;

  try {
    // Route to appropriate handler based on path
    if (path.startsWith('/api/balance/email/')) {
      const { getUserBalanceByEmail } = await import('../../server/routes/balance');
      const userEmail = path.split('/').pop();
      const mockReq = { params: { userEmail } } as any;
      const mockRes = {
        status: (code: number) => ({ json: (data: any) => ({ statusCode: code, headers, body: JSON.stringify(data) }) }),
        json: (data: any) => ({ statusCode: 200, headers, body: JSON.stringify(data) })
      } as any;
      return await getUserBalanceByEmail(mockReq, mockRes);
    }
    
    if (path.startsWith('/api/tickets') && method === 'GET') {
      // Handle tickets endpoint with in-memory storage
      const walletAddress = event.queryStringParameters?.walletAddress;
      
      let result = ticketsCache;
      if (walletAddress) {
        result = ticketsCache.filter(ticket => 
          ticket.walletAddress?.toLowerCase() === walletAddress.toLowerCase()
        );
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ tickets: result })
      };
    }

    if (path === '/api/upload-report' && method === 'POST') {
      // Forward to existing upload handler; ensure body is parsed
      const { uploadReport } = await import('../../server/routes/upload');
      const rawBody = event.body || '';
      const bodyStr = event.isBase64Encoded ? Buffer.from(rawBody, 'base64').toString('utf8') : rawBody;
      const parsedBody = bodyStr ? JSON.parse(bodyStr) : {};
      const mockReq = { body: parsedBody, headers: event.headers } as any;
      const mockRes = {
        status: (code: number) => ({ json: (data: any) => ({ statusCode: code, headers, body: JSON.stringify(data) }) }),
        json: (data: any) => ({ statusCode: 200, headers, body: JSON.stringify(data) })
      } as any;
      return await uploadReport(mockReq, mockRes);
    }

    if (path === '/api/ping') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'pong' })
      };
    }

    // Default response for unmatched routes
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
