import type { RequestHandler } from "express";
import { AdminLoginRequest, AdminLoginResponse } from "@shared/api";
import { createAdminSession, validateAdmin } from "./store";

export const adminLogin: RequestHandler = (req, res) => {
  const { username, password } = req.body as AdminLoginRequest;
  const expectedUser = process.env.ADMIN_USERNAME || "admin";
  const expectedPass = process.env.ADMIN_PASSWORD || "admin";

  if (username !== expectedUser || password !== expectedPass) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const { token, expiresAt } = createAdminSession(8);
  const response: AdminLoginResponse = {
    token,
    expiresAt: new Date(expiresAt).toISOString(),
  };
  return res.status(200).json(response);
};

export const validateAdminSession: RequestHandler = (req, res) => {
  const adminToken = req.header("x-admin-token");
  const isValid = validateAdmin(adminToken);
  
  if (isValid) {
    return res.status(200).json({ valid: true });
  } else {
    return res.status(401).json({ valid: false, error: "Invalid or expired session" });
  }
};
