import type { RequestHandler } from "express";

function getPinataAuthHeaders() {
  const jwt = process.env.PINATA_JWT || process.env.VITE_PINATA_JWT;
  const apiKey = process.env.PINATA_API_KEY || process.env.VITE_PINATA_API_KEY;
  const apiSecret = process.env.PINATA_API_SECRET || process.env.VITE_PINATA_API_SECRET;
  
  if (jwt) {
    console.log('Using JWT authentication for Pinata');
    return { Authorization: `Bearer ${jwt}` } as Record<string, string>;
  }
  
  if (apiKey && apiSecret) {
    console.log('Using API key authentication for Pinata');
    return {
      pinata_api_key: apiKey,
      pinata_secret_api_key: apiSecret,
    } as Record<string, string>;
  }
  
  throw new Error("Pinata credentials not configured. Set PINATA_JWT or PINATA_API_KEY + PINATA_API_SECRET in .env");
}

export const uploadReport: RequestHandler = async (req, res) => {
  try {
    const { filename, fileBase64 } = req.body as { filename: string; fileBase64: string };
    if (!filename || !fileBase64) return res.status(400).json({ error: "filename and fileBase64 required" });

    const b64 = fileBase64.replace(/^data:.*;base64,/, "");
    const buffer = Buffer.from(b64, "base64");
    const blob = new Blob([buffer], { type: "application/pdf" });
    const form = new FormData();
    form.append("file", blob, filename);

    const headers = getPinataAuthHeaders();
    const r = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers,
      body: form as any,
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(500).json({ error: "Pinata upload failed", details: text });
    }
    const json = (await r.json()) as any;
    const cid = json.IpfsHash;
    const ipfsUrl = `https://amethyst-additional-flamingo-32.mypinata.cloud/ipfs/${cid}`;
    return res.status(200).json({ cid, ipfsUrl });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Upload failed" });
  }
};
