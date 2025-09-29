import type {
  AdminLoginRequest,
  AdminLoginResponse,
  AnalysisResult,
  CreateTicketRequest,
  ReportUploadResponse,
  Ticket,
  TicketsListResponse,
  UpdateTicketRequest,
  CreateListingRequest,
  CreateListingResponse,
  ListListingsResponse,
  BuyListingRequest,
  BuyListingResponse,
} from "@shared/api";

interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

// Rate limiting for API calls
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

function checkRateLimit(endpoint: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(endpoint);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(endpoint, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (limit.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  limit.count++;
  return true;
}

async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: ApiError;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as ApiError;
      
      if (attempt === config.maxRetries) {
        throw lastError;
      }
      
      // Don't retry on client errors (4xx) except 429 (rate limit)
      if (lastError.status && lastError.status >= 400 && lastError.status < 500 && lastError.status !== 429) {
        throw lastError;
      }
      
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    let errorDetails: any = null;
    
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        errorDetails = errorData;
      } else {
        errorMessage = await response.text() || errorMessage;
      }
    } catch {
      // Use default error message if parsing fails
    }
    
    const error: ApiError = new Error(errorMessage);
    error.status = response.status;
    error.details = errorDetails;
    
    // Add specific error codes for common scenarios
    if (response.status === 401) {
      error.code = 'UNAUTHORIZED';
    } else if (response.status === 403) {
      error.code = 'FORBIDDEN';
    } else if (response.status === 404) {
      error.code = 'NOT_FOUND';
    } else if (response.status === 429) {
      error.code = 'RATE_LIMITED';
    } else if (response.status >= 500) {
      error.code = 'SERVER_ERROR';
    }
    
    throw error;
  }
  
  try {
    return await response.json();
  } catch (error) {
    throw new Error('Failed to parse response as JSON');
  }
}

export const Api = {
  async uploadReport(filename: string, fileBase64: string): Promise<ReportUploadResponse> {
    const endpoint = "upload-report";
    
    if (!checkRateLimit(endpoint)) {
      throw new Error("Rate limit exceeded. Please wait before trying again.");
    }

    return withRetry(async () => {
      const response = await fetch("/api/upload-report", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ filename, fileBase64 }),
      });
      
      return handleResponse<ReportUploadResponse>(response);
    });
  },

  async analyzeReport(fileBase64: string, reportName?: string): Promise<AnalysisResult> {
    const endpoint = "analyze-report";
    
    if (!checkRateLimit(endpoint)) {
      throw new Error("Rate limit exceeded. Please wait before trying again.");
    }

    return withRetry(async () => {
      const response = await fetch("/api/analyze-report", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ fileBase64, reportName }),
      });
      
      return handleResponse<AnalysisResult>(response);
    });
  },

  async createTicket(req: CreateTicketRequest): Promise<Ticket> {
    const endpoint = "create-ticket";
    
    if (!checkRateLimit(endpoint)) {
      throw new Error("Rate limit exceeded. Please wait before trying again.");
    }

    // Validate request
    if (!req.walletAddress || !req.reportCid || !req.reportName || !req.analysis) {
      throw new Error("Invalid ticket request: missing required fields");
    }

    return withRetry(async () => {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(req),
      });
      
      return handleResponse<Ticket>(response);
    });
  },

  async listTickets(walletAddress?: string, adminToken?: string): Promise<TicketsListResponse> {
    const endpoint = "list-tickets";
    
    if (!checkRateLimit(endpoint)) {
      throw new Error("Rate limit exceeded. Please wait before trying again.");
    }

    return withRetry(async () => {
      const url = new URL(location.origin + "/api/tickets");
      if (walletAddress) {
        url.searchParams.set("walletAddress", walletAddress);
      }
      
      const headers: Record<string, string> = {
        "Accept": "application/json",
      };
      
      if (adminToken) {
        headers["x-admin-token"] = adminToken;
      }
      
      const response = await fetch(url.toString(), { headers });
      return handleResponse<TicketsListResponse>(response);
    });
  },

  async updateTicket(id: string, body: UpdateTicketRequest, adminToken: string): Promise<Ticket> {
    const endpoint = "update-ticket";
    
    if (!checkRateLimit(endpoint)) {
      throw new Error("Rate limit exceeded. Please wait before trying again.");
    }

    if (!id || !adminToken) {
      throw new Error("Invalid update request: missing ticket ID or admin token");
    }

    return withRetry(async () => {
      const response = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify(body),
      });
      
      return handleResponse<Ticket>(response);
    });
  },

  async deleteTicket(id: string, walletAddress?: string, adminToken?: string): Promise<{ success: boolean }> {
    const endpoint = "delete-ticket";
    if (!checkRateLimit(endpoint)) {
      throw new Error("Rate limit exceeded. Please wait before trying again.");
    }
    return withRetry(async () => {
      const url = new URL(location.origin + `/api/tickets/${id}`);
      if (walletAddress) url.searchParams.set("walletAddress", walletAddress);
      const headers: Record<string, string> = { "Accept": "application/json" };
      if (adminToken) headers["x-admin-token"] = adminToken;
      const response = await fetch(url.toString(), {
        method: "DELETE",
        headers,
      });
      return handleResponse<{ success: boolean }>(response);
    });
  },

  async adminLogin(body: AdminLoginRequest): Promise<AdminLoginResponse> {
    const endpoint = "admin-login";
    
    if (!checkRateLimit(endpoint)) {
      throw new Error("Rate limit exceeded. Please wait before trying again.");
    }

    if (!body.username || !body.password) {
      throw new Error("Invalid login request: username and password are required");
    }

    return withRetry(async () => {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(body),
      });
      
      return handleResponse<AdminLoginResponse>(response);
    });
  },

  async validateAdminSession(token: string): Promise<{ valid: boolean }> {
    const endpoint = "admin-validate";
    
    if (!checkRateLimit(endpoint)) {
      throw new Error("Rate limit exceeded. Please wait before trying again.");
    }

    return withRetry(async () => {
      const response = await fetch("/api/admin/validate", {
        method: "GET",
        headers: { 
          "Accept": "application/json",
          "x-admin-token": token,
        },
      });
      
      return handleResponse<{ valid: boolean }>(response);
    });
  },

  // Balance Management
  async storeUserBalance(data: {
    userEmail: string;
    userId?: string;
    walletAddress?: string;
    amount: number;
    adminSignature: string;
    ticketId: string;
    adminEmail?: string;
  }): Promise<{ success: boolean; cid: string; balance: number; ipfsUrl: string; note?: string }> {
    const endpoint = "store-balance";
    
    if (!checkRateLimit(endpoint)) {
      throw new Error("Rate limit exceeded. Please wait before trying again.");
    }

    return withRetry(async () => {
      const response = await fetch("/api/balance/store", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      return handleResponse<{ success: boolean; cid: string; balance: number; ipfsUrl: string; note?: string }>(response);
    });
  },

  async getUserBalanceByUser(userId: string): Promise<{
    userEmail?: string;
    userId?: string;
    totalBalance: number;
    rupeesBalance: number;
    transactions: Array<{
      id: string;
      amount: number;
      adminSignature: string;
      timestamp: string;
      ticketId: string;
      walletAddress?: string;
      userEmail?: string;
      adminEmail?: string;
    }>;
    lastUpdated: string;
  }> {
    const endpoint = "get-balance";
    
    if (!checkRateLimit(endpoint)) {
      throw new Error("Rate limit exceeded. Please wait before trying again.");
    }

    return withRetry(async () => {
      const response = await fetch(`/api/balance/${userId}`, {
        method: "GET",
        headers: { 
          "Accept": "application/json",
        },
      });
      
      return handleResponse<{
        userEmail?: string;
        userId?: string;
        totalBalance: number;
        rupeesBalance: number;
        transactions: Array<{
          id: string;
          amount: number;
          adminSignature: string;
          timestamp: string;
          ticketId: string;
          walletAddress?: string;
          userEmail?: string;
          adminEmail?: string;
        }>;
        lastUpdated: string;
      }>(response);
    });
  },

  async getUserBalanceByEmail(userEmail: string): Promise<{
    userEmail: string;
    userId?: string;
    totalBalance: number;
    rupeesBalance: number;
    transactions: Array<{
      id: string;
      amount: number;
      adminSignature: string;
      timestamp: string;
      ticketId: string;
      walletAddress?: string;
      userEmail?: string;
      adminEmail?: string;
    }>;
    lastUpdated: string;
  }> {
    const endpoint = "get-balance-by-email";
    
    if (!checkRateLimit(endpoint)) {
      throw new Error("Rate limit exceeded. Please wait before trying again.");
    }

    return withRetry(async () => {
      const response = await fetch(`/api/balance/email/${encodeURIComponent(userEmail)}`, {
        method: "GET",
        headers: { 
          "Accept": "application/json",
        },
      });
      
      return handleResponse<{
        userEmail: string;
        userId?: string;
        totalBalance: number;
        rupeesBalance: number;
        transactions: Array<{
          id: string;
          amount: number;
          adminSignature: string;
          timestamp: string;
          ticketId: string;
          walletAddress?: string;
          userEmail?: string;
          adminEmail?: string;
        }>;
        lastUpdated: string;
      }>(response);
    });
  },

  // Marketplace
  async createListing(body: CreateListingRequest): Promise<CreateListingResponse> {
    const endpoint = "market-create-listing";
    if (!checkRateLimit(endpoint)) throw new Error("Rate limit exceeded. Please wait before trying again.");
    return withRetry(async () => {
      const response = await fetch("/api/marketplace/list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(body),
      });
      return handleResponse<CreateListingResponse>(response);
    });
  },

  async listListings(status: string = "active"): Promise<ListListingsResponse> {
    const endpoint = "market-list-listings";
    if (!checkRateLimit(endpoint)) throw new Error("Rate limit exceeded. Please wait before trying again.");
    return withRetry(async () => {
      const url = new URL(location.origin + "/api/marketplace/listings");
      if (status) url.searchParams.set("status", status);
      const response = await fetch(url.toString(), { headers: { "Accept": "application/json" } });
      return handleResponse<ListListingsResponse>(response);
    });
  },

  async buyListing(body: BuyListingRequest): Promise<BuyListingResponse> {
    const endpoint = "market-buy-listing";
    if (!checkRateLimit(endpoint)) throw new Error("Rate limit exceeded. Please wait before trying again.");
    return withRetry(async () => {
      const response = await fetch("/api/marketplace/buy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(body),
      });
      return handleResponse<BuyListingResponse>(response);
    });
  },

  // Ticket Management
  async clearAllTickets(adminToken: string): Promise<{ success: boolean; clearedCount: number; message: string }> {
    const endpoint = "clear-all-tickets";
    
    if (!checkRateLimit(endpoint)) {
      throw new Error("Rate limit exceeded. Please wait before trying again.");
    }

    if (!adminToken) {
      throw new Error("Admin token required");
    }

    return withRetry(async () => {
      const response = await fetch("/api/tickets/clear/all", {
        method: "DELETE",
        headers: { 
          "Accept": "application/json",
          "x-admin-token": adminToken,
        },
      });
      
      return handleResponse<{ success: boolean; clearedCount: number; message: string }>(response);
    });
  },

  async clearTicketsByStatus(status: string, adminToken: string): Promise<{ success: boolean; clearedCount: number; remainingCount: number; message: string }> {
    const endpoint = "clear-tickets-by-status";
    
    if (!checkRateLimit(endpoint)) {
      throw new Error("Rate limit exceeded. Please wait before trying again.");
    }

    if (!adminToken || !status) {
      throw new Error("Admin token and status are required");
    }

    return withRetry(async () => {
      const response = await fetch("/api/tickets/clear/status", {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({ status }),
      });
      
      return handleResponse<{ success: boolean; clearedCount: number; remainingCount: number; message: string }>(response);
    });
  },

  // Utility methods
  clearRateLimit(): void {
    rateLimitMap.clear();
  },

  getRateLimitStatus(endpoint: string): { count: number; resetTime: number } | null {
    return rateLimitMap.get(endpoint) || null;
  },
};
