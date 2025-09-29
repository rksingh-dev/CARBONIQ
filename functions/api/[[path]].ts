// Cloudflare Pages Function for API routes
import { handleDemo } from '../../server/routes/demo';
import { adminLogin, validateAdminSession } from '../../server/routes/admin';
import { listTickets, createTicket, updateTicketStatus, getTicket, deleteTicket, clearAllTickets, clearTicketsByStatus } from '../../server/routes/tickets';
import { uploadReport } from '../../server/routes/upload';
import { analyzeReport } from '../../server/routes/analyze';
import { storeUserBalance, getUserBalance, getAllBalances, getUserBalanceByEmail } from '../../server/routes/balance';
import { createListing, listListings, buyListing } from '../../server/routes/marketplace';

interface CloudflareContext {
  request: Request;
  env: any;
  params: { path: string[] };
}

export async function onRequest(context: CloudflareContext): Promise<Response> {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const path = '/' + (params.path || []).join('/');
  const method = request.method;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight requests
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body for POST/PUT/PATCH requests
    let body = null;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        body = await request.json();
      } else {
        body = await request.text();
      }
    }

    // Create Express-like request object
    const req = {
      method,
      url: path + url.search,
      path,
      query: Object.fromEntries(url.searchParams.entries()),
      params: {},
      body,
      headers: Object.fromEntries(request.headers.entries()),
    };

    // Create Express-like response object
    let responseData: any = null;
    let statusCode = 200;
    let responseHeaders = { ...corsHeaders };

    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: any) => {
        responseData = data;
        responseHeaders['Content-Type'] = 'application/json';
        return res;
      },
      send: (data: any) => {
        responseData = data;
        return res;
      },
      setHeader: (name: string, value: string) => {
        responseHeaders[name] = value;
        return res;
      },
    };

    // Route handling
    switch (true) {
      // Health check
      case path === '/ping':
        const ping = env.PING_MESSAGE ?? 'ping';
        return new Response(JSON.stringify({ message: ping }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      // Demo
      case path === '/demo' && method === 'GET':
        await handleDemo(req as any, res as any);
        break;

      // Admin routes
      case path === '/admin/login' && method === 'POST':
        await adminLogin(req as any, res as any);
        break;
      case path === '/admin/validate' && method === 'GET':
        await validateAdminSession(req as any, res as any);
        break;

      // Ticket routes
      case path === '/tickets' && method === 'GET':
        await listTickets(req as any, res as any);
        break;
      case path === '/tickets' && method === 'POST':
        await createTicket(req as any, res as any);
        break;
      case path.startsWith('/tickets/') && method === 'GET':
        req.params = { id: path.split('/')[2] };
        await getTicket(req as any, res as any);
        break;
      case path.startsWith('/tickets/') && method === 'PATCH':
        req.params = { id: path.split('/')[2] };
        await updateTicketStatus(req as any, res as any);
        break;
      case path.startsWith('/tickets/') && method === 'DELETE':
        req.params = { id: path.split('/')[2] };
        await deleteTicket(req as any, res as any);
        break;
      case path === '/tickets/clear/all' && method === 'DELETE':
        await clearAllTickets(req as any, res as any);
        break;
      case path === '/tickets/clear/status' && method === 'DELETE':
        await clearTicketsByStatus(req as any, res as any);
        break;

      // Upload & Analysis
      case path === '/upload-report' && method === 'POST':
        await uploadReport(req as any, res as any);
        break;
      case path === '/analyze-report' && method === 'POST':
        await analyzeReport(req as any, res as any);
        break;

      // Balance routes
      case path === '/balance/store' && method === 'POST':
        await storeUserBalance(req as any, res as any);
        break;
      case path.startsWith('/balance/') && method === 'GET':
        req.params = { userId: path.split('/')[2] };
        await getUserBalance(req as any, res as any);
        break;
      case path.startsWith('/balance/email/') && method === 'GET':
        req.params = { userEmail: path.split('/')[3] };
        await getUserBalanceByEmail(req as any, res as any);
        break;
      case path === '/balance' && method === 'GET':
        await getAllBalances(req as any, res as any);
        break;

      // Marketplace routes
      case path === '/marketplace/list' && method === 'POST':
        await createListing(req as any, res as any);
        break;
      case path === '/marketplace/listings' && method === 'GET':
        await listListings(req as any, res as any);
        break;
      case path === '/marketplace/buy' && method === 'POST':
        await buyListing(req as any, res as any);
        break;

      default:
        return new Response('Not Found', { 
          status: 404, 
          headers: corsHeaders 
        });
    }

    // Return response
    const responseBody = typeof responseData === 'string' 
      ? responseData 
      : JSON.stringify(responseData);

    return new Response(responseBody, {
      status: statusCode,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
