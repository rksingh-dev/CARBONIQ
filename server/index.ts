import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { adminLogin, validateAdminSession } from "./routes/admin";
import { listTickets, createTicket, updateTicketStatus, getTicket, deleteTicket, clearAllTickets, clearTicketsByStatus } from "./routes/tickets";
import { uploadReport } from "./routes/upload";
import { analyzeReport } from "./routes/analyze";
import { storeUserBalance, getUserBalance, getAllBalances, getUserBalanceByEmail } from "./routes/balance";
import { createListing, listListings, buyListing } from "./routes/marketplace";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Health
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  // Demo
  app.get("/api/demo", handleDemo);

  // Admin
  app.post("/api/admin/login", adminLogin);
  app.get("/api/admin/validate", validateAdminSession);

  // Tickets
  app.get("/api/tickets", listTickets);
  app.get("/api/tickets/:id", getTicket);
  app.post("/api/tickets", createTicket);
  app.patch("/api/tickets/:id", updateTicketStatus);
  app.delete("/api/tickets/:id", deleteTicket);
  app.delete("/api/tickets/clear/all", clearAllTickets);
  app.delete("/api/tickets/clear/status", clearTicketsByStatus);

  // Upload & Analysis
  app.post("/api/upload-report", uploadReport);
  app.post("/api/analyze-report", analyzeReport);

  // Balance Management
  app.post("/api/balance/store", storeUserBalance);
  app.get("/api/balance/:userId", getUserBalance);
  app.get("/api/balance/email/:userEmail", getUserBalanceByEmail);
  app.get("/api/balance", getAllBalances);

  // Marketplace
  app.post("/api/marketplace/list", createListing);
  app.get("/api/marketplace/listings", listListings);
  app.post("/api/marketplace/buy", buyListing);

  return app;
}
