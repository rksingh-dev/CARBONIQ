import type { RequestHandler } from "express";
import { AdminLoginRequest, AdminLoginResponse } from "@shared/api";
import { createAdminSession } from "./store";
import { getAdminCredentials, verifyAdminToken } from "../utils/adminAuth";

export const adminLogin: RequestHandler = (req, res) => {
  const { username, password } = req.body as AdminLoginRequest;
  const { username: expectedUser, password: expectedPass } = getAdminCredentials();

  if (username !== expectedUser || password !== expectedPass) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const { token, expiresAt } = createAdminSession(expectedUser);
  const response: AdminLoginResponse = {
    token,
    expiresAt: new Date(expiresAt).toISOString(),
  };
  return res.status(200).json(response);
};

export const validateAdminSession: RequestHandler = (req, res) => {
  const adminToken = req.header("x-admin-token");
  const result = verifyAdminToken(adminToken);

  if (result.valid) {
    return res.status(200).json({ valid: true, expiresAt: new Date(result.expiresAt!).toISOString() });
  }
  return res.status(401).json({ valid: false, error: "Invalid or expired session" });
};
