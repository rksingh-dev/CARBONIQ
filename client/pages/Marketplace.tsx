import { useEffect, useMemo, useState, useCallback } from "react";
import { Api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useUserWallet } from "@/hooks/useUserWallet";
import type { MarketplaceListing } from "@shared/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, ShoppingCart, PlusCircle, Coins } from "lucide-react";

export default function Marketplace() {
  const { user } = useAuth();
  const { account, connect } = useUserWallet();

  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(false);

  // Sell form
  const [sellAmount, setSellAmount] = useState<string>("");
  const price = useMemo(() => {
    const num = Number(sellAmount || 0);
    return Number.isFinite(num) ? num : 0;
  }, [sellAmount]);

  const ensureWallet = useCallback(async () => {
    if (!account) await connect();
  }, [account, connect]);

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await Api.listListings("active");
      setListings(resp.listings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const onCreateListing = async () => {
    if (!user?.email || !user?.uid) {
      alert("Sign in with Google first");
      return;
    }
    await ensureWallet();
    if (!account) {
      alert("Connect MetaMask to proceed");
      return;
    }
    const amt = Number(sellAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      alert("Enter a valid token amount");
      return;
    }

    try {
      const message = `List ${amt} tokens for ${amt} rupees from ${account} at ${new Date().toISOString()}`;
      const signature: string = await window.ethereum!.request({
        method: "personal_sign",
        params: [message, account],
      });
      const resp = await Api.createListing({
        sellerEmail: user.email,
        sellerUserId: user.uid,
        sellerWallet: account,
        amountTokens: amt,
        priceRupees: amt,
        signature,
      });
      setSellAmount("");
      await loadListings();
      alert(`Listed ${resp.listing.amountTokens} tokens for [4m[0m${resp.listing.priceRupees} rupees`);
    } catch (e: any) {
      alert(e?.message || "Failed to create listing");
    }
  };

  const onBuy = async (l: MarketplaceListing) => {
    if (!user?.email || !user?.uid) {
      alert("Sign in with Google first");
      return;
    }
    await ensureWallet();
    if (!account) {
      alert("Connect MetaMask to proceed");
      return;
    }
    if (l.sellerEmail === user.email.toLowerCase()) {
      alert("You cannot buy your own listing");
      return;
    }

    try {
      const message = `Buy listing ${l.id} for ${l.priceRupees} rupees by ${account} at ${new Date().toISOString()}`;
      const signature: string = await window.ethereum!.request({
        method: "personal_sign",
        params: [message, account],
      });
      const resp = await Api.buyListing({
        listingId: l.id,
        buyerEmail: user.email,
        buyerUserId: user.uid,
        buyerWallet: account,
        signature,
      });
      await loadListings();
      alert(`Purchase successful! Tokens +${resp.listing.amountTokens}, Rupees -${resp.listing.priceRupees}`);
    } catch (e: any) {
      alert(e?.message || "Failed to buy listing");
    }
  };

  return (
    <main className="container py-10">
      <section className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Marketplace</h1>
        <p className="text-sm text-foreground/70 mt-2">Buy and sell Blue Carbon Tokens. 1 token = 1 rupee.</p>
        <div className="mt-4 flex gap-2">
          <Button variant={tab === "buy" ? "default" : "outline"} onClick={() => setTab("buy")}>Buy</Button>
          <Button variant={tab === "sell" ? "default" : "outline"} onClick={() => setTab("sell")}>Sell</Button>
          <Button variant="outline" onClick={loadListings} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </section>

      {tab === "sell" ? (
        <section className="mb-10">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PlusCircle className="h-5 w-5" /> Create Listing</CardTitle>
              <CardDescription>List tokens for rupees. Your listing will appear in the Buy tab.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Amount of Tokens</label>
                  <Input type="number" value={sellAmount} onChange={(e) => setSellAmount(e.target.value)} placeholder="50" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Price (Rupees)</label>
                  <Input type="number" value={price} readOnly className="mt-1" />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={onCreateListing}>
                  <PlusCircle className="h-4 w-4 mr-2" /> List for Sale
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {tab === "buy" ? (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Active Listings</CardTitle>
              <CardDescription>Buy tokens from other users. Your rupees balance will be deducted and tokens credited.</CardDescription>
            </CardHeader>
            <CardContent>
              {listings.length === 0 ? (
                <div className="text-sm text-muted-foreground">No active listings yet.</div>
              ) : (
                <div className="grid gap-3">
                  {listings.map((l) => (
                    <div key={l.id} className="border rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{l.amountTokens} Tokens</div>
                        <div className="text-xs text-muted-foreground">Seller: {l.sellerEmail}</div>
                        <div className="text-xs text-muted-foreground">Price: ₹ {l.priceRupees}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button onClick={() => onBuy(l)}>
                          <Coins className="h-4 w-4 mr-2" /> Buy
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </main>
  );
}
