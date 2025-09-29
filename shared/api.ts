/**
 * Shared code between client and server
 * Types for API payloads
 */

export interface DemoResponse {
  message: string;
}

export type TicketStatus = "pending" | "approved" | "rejected";

export interface AnalysisResult {
  estimatedTokens: number; // integer number of carbon tokens
  confidence: number; // 0..1
  summary: string;
  model?: string;
}

export interface ReportUploadResponse {
  cid: string;
  ipfsUrl: string; // ipfs gateway url
}

export interface CreateTicketRequest {
  walletAddress: string;
  reportCid: string;
  reportName: string;
  analysis: AnalysisResult;
  userId: string; // Google auth user ID
  userEmail: string; // Google auth email
}

export interface Ticket {
  id: string;
  walletAddress: string;
  userId: string; // Google auth user ID
  userEmail: string; // Google auth email
  reportCid: string;
  reportName: string;
  analysis: AnalysisResult;
  status: TicketStatus;
  txHash?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface TicketsListResponse {
  tickets: Ticket[];
}

// Marketplace types
export type ListingStatus = "active" | "sold" | "cancelled";

export interface MarketplaceListing {
  id: string;
  sellerEmail: string;
  sellerUserId?: string;
  sellerWallet: string;
  amountTokens: number;
  priceRupees: number; // fixed rate 1:1 today, but explicit for future flexibility
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceOrder {
  id: string;
  listingId: string;
  buyerEmail: string;
  buyerUserId?: string;
  buyerWallet: string;
  amountTokens: number;
  totalRupees: number;
  status: "completed" | "failed";
  adminSignature?: string;
  createdAt: string;
}

export interface CreateListingRequest {
  sellerEmail: string;
  sellerUserId?: string;
  sellerWallet: string;
  amountTokens: number;
  priceRupees: number;
  signature: string;
}

export interface CreateListingResponse {
  listing: MarketplaceListing;
}

export interface ListListingsResponse {
  listings: MarketplaceListing[];
}

export interface BuyListingRequest {
  listingId: string;
  buyerEmail: string;
  buyerUserId?: string;
  buyerWallet: string;
  signature: string;
}

export interface BuyListingResponse {
  listing: MarketplaceListing;
  order: MarketplaceOrder;
  buyerBalance: { totalBalance: number; rupeesBalance: number };
  sellerBalance: { totalBalance: number; rupeesBalance: number };
}

export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  token: string;
  expiresAt: string; // ISO
}

export interface UpdateTicketRequest {
  action: "approve" | "reject" | "setTxHash";
  txHash?: string;
  adminNote?: string;
  tokenAmount?: number; // Admin-set token amount
}
