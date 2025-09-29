export async function fetchIpfsJson(
  cid: string,
  timeoutMs = 8000,
): Promise<any> {
  const gateways = [
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
    `https://dweb.link/ipfs/${cid}`,
  ];

  let lastError: unknown = null;

  for (const url of gateways) {
    try {
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        headers: { Accept: "application/json, text/plain;q=0.8,*/*;q=0.5" },
        signal: controller.signal,
      } as RequestInit);
      clearTimeout(to);
      if (!res.ok) continue;

      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        return await res.json();
      }
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        // Not JSON, try next gateway
        continue;
      }
    } catch (e) {
      lastError = e;
      continue;
    }
  }

  throw new Error(
    `Failed to fetch IPFS JSON for cid ${cid}. Last error: ${
      (lastError as any)?.message || String(lastError)
    }`,
  );
}

export function setSwrCache(res: any, seconds = 300, stale = 600) {
  try {
    res.setHeader?.(
      "Cache-Control",
      `public, s-maxage=${seconds}, stale-while-revalidate=${stale}`,
    );
  } catch {}
}
