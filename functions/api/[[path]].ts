// Cloudflare Pages Function for API routes

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

    // Route handling
    switch (true) {
      // Health check
      case path === '/ping':
        const ping = env.PING_MESSAGE ?? 'ping';
        return new Response(JSON.stringify({ message: ping }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      // Demo endpoint
      case path === '/demo' && method === 'GET':
        return new Response(JSON.stringify({ 
          message: 'Hello from CarbonIQ API!',
          timestamp: new Date().toISOString(),
          environment: env.NODE_ENV || 'development'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      // Admin login (simplified)
      case path === '/admin/login' && method === 'POST':
        // This is a simplified implementation - in production you'd want proper authentication
        const { username, password } = (body as any) || {};
        if (username === 'admin' && password === 'admin123') {
          return new Response(JSON.stringify({ 
            success: true, 
            token: 'mock-admin-token',
            message: 'Login successful' 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else {
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'Invalid credentials' 
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

      // Admin session validation
      case path === '/admin/validate' && method === 'GET':
        const authHeader = request.headers.get('authorization');
        const isValid = authHeader === 'Bearer mock-admin-token';
        return new Response(JSON.stringify({ 
          valid: isValid,
          message: isValid ? 'Session valid' : 'Invalid session'
        }), {
          status: isValid ? 200 : 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      // Tickets endpoints (simplified - using in-memory storage for demo)
      case path === '/tickets' && method === 'GET':
        return new Response(JSON.stringify({ 
          tickets: [],
          message: 'Tickets endpoint - implement with your preferred database'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case path === '/tickets' && method === 'POST':
        return new Response(JSON.stringify({ 
          success: true,
          ticket: { id: Date.now(), ...((body as any) || {}), status: 'open' },
          message: 'Ticket created successfully'
        }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      // Upload report endpoint
      case path === '/upload-report' && method === 'POST':
        return new Response(JSON.stringify({ 
          success: true,
          message: 'Report uploaded successfully',
          reportId: Date.now()
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      // Analyze report endpoint
      case path === '/analyze-report' && method === 'POST':
        return new Response(JSON.stringify({ 
          success: true,
          analysis: {
            carbonFootprint: Math.random() * 1000,
            recommendations: ['Use renewable energy', 'Optimize transportation'],
            score: Math.floor(Math.random() * 100)
          },
          message: 'Report analyzed successfully'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      // Balance endpoints
      case path === '/balance/store' && method === 'POST':
        return new Response(JSON.stringify({ 
          success: true,
          message: 'Balance stored successfully'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case path.startsWith('/balance/') && method === 'GET':
        const userId = path.split('/')[2];
        return new Response(JSON.stringify({ 
          userId,
          balance: Math.floor(Math.random() * 10000),
          currency: 'BCT' // Blue Carbon Tokens
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      // Marketplace endpoints
      case path === '/marketplace/listings' && method === 'GET':
        return new Response(JSON.stringify({ 
          listings: [
            {
              id: 1,
              title: 'Carbon Credits - Forest Conservation',
              price: 25,
              quantity: 100,
              seller: 'EcoPartner Inc.'
            },
            {
              id: 2,
              title: 'Renewable Energy Credits',
              price: 30,
              quantity: 50,
              seller: 'GreenEnergy Co.'
            }
          ]
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case path === '/marketplace/list' && method === 'POST':
        return new Response(JSON.stringify({ 
          success: true,
          listing: { id: Date.now(), ...((body as any) || {}) },
          message: 'Listing created successfully'
        }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case path === '/marketplace/buy' && method === 'POST':
        return new Response(JSON.stringify({ 
          success: true,
          transaction: { id: Date.now(), ...((body as any) || {}) },
          message: 'Purchase completed successfully'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      default:
        return new Response(JSON.stringify({ 
          error: 'Not Found',
          path,
          method,
          message: 'The requested endpoint does not exist'
        }), { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
