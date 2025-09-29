import { Link, useLocation, useNavigate } from "react-router-dom";
import { useUserWallet } from "@/hooks/useUserWallet";
import { useAuth } from "@/hooks/useAuth";
import { UserMenu } from "@/components/auth/UserMenu";
import { AuthModal } from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function SiteHeader() {
  const { account, connect, disconnect, hasProvider, isConnecting, chainId } = useUserWallet();
  const { user } = useAuth();
  const short = account ? `${account.slice(0, 6)}…${account.slice(-4)}` : null;
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const onConnect = async () => {
    try {
      const acc = await connect();
      if (acc) navigate("/dashboard");
    } catch (e: any) {
      alert(e?.message || "Failed to connect wallet");
    }
  };

  const handleConnectWallet = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    await onConnect();
  };

  const nav = [
    { to: "/", label: "Home" },
    { to: "/dashboard", label: "Dashboard" },
    { to: "/marketplace", label: "Marketplace" },
    { to: "/admin", label: "Admin" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b backdrop-blur bg-background/70">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🌍</span>
          <span className="font-extrabold tracking-tight text-xl">CarbonIQ</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "text-sm font-medium hover:text-primary transition-colors",
                pathname === n.to ? "text-primary" : "text-foreground/70",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              {account ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="px-2 py-1">User Wallet</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/dashboard")}
                  >
                    {short}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => connect({ forceSelect: true })}
                    title="Switch MetaMask Account"
                  >
                    Switch Account
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { disconnect(); navigate("/"); }}
                    title="Disconnect MetaMask (app session)"
                  >
                    Disconnect Wallet
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleConnectWallet}
                  disabled={!hasProvider || isConnecting}
                  size="sm"
                >
                  {hasProvider ? (isConnecting ? "Connecting…" : "Connect Wallet") : "Install MetaMask"}
                </Button>
              )}
              <UserMenu onConnectWallet={!account ? handleConnectWallet : undefined} />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAuthModal(true)}
              >
                Sign In with Google
              </Button>
              <Button
                onClick={() => setShowAuthModal(true)}
                size="sm"
              >
                Get Started
              </Button>
            </div>
          )}
        </div>
      </div>
      <AuthModal 
        open={showAuthModal} 
        onOpenChange={setShowAuthModal}
      />
    </header>
  );
}
