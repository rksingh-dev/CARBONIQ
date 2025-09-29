import { useNavigate } from "react-router-dom";
import { useUserWallet } from "@/hooks/useUserWallet";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "@/components/auth/AuthModal";
import { useState } from "react";

export default function Index() {
  const { connect, hasProvider, isConnecting } = useUserWallet();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const onConnect = async () => {
    // First, ensure user is signed in with Google
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    // Check if MetaMask is available
    if (!hasProvider) {
      alert("MetaMask is not installed. Please install MetaMask to continue.");
      return;
    }
    
    try {
      const acc = await connect();
      if (acc) {
        // Navigate to dashboard after successful connection
        navigate("/dashboard");
      }
    } catch (e: any) {
      alert(e?.message || "Failed to connect wallet");
    }
  };

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/80 via-teal-100/60 to-transparent" />
        <div className="container relative py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="mt-3 text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
                Revolutionize carbon credit management with blockchain transparency
              </h1>
              <p className="mt-4 text-lg text-foreground/70">
                Verify, score, and trade carbon offsets with complete transparency and AI-powered accuracy.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button onClick={onConnect} disabled={!hasProvider || isConnecting} className="px-5 py-3 rounded-lg bg-primary text-primary-foreground text-base shadow hover:opacity-95 disabled:opacity-50">
                  {user 
                    ? (hasProvider ? (isConnecting ? "Connecting…" : "Connect Wallet & Start") : "Install MetaMask")
                    : "Sign In with Google & Get Started"
                  }
                </button>
                <a href="#features" className="px-5 py-3 rounded-lg border bg-background text-base">Learn More</a>
              </div>
              <p className="mt-3 text-sm text-emerald-700 font-medium">
                Sign in to get free 100 rupees in balance.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl font-extrabold">1,250+</div>
                  <div className="text-sm text-foreground/70">Credits Verified</div>
                </div>
                <div>
                  <div className="text-3xl font-extrabold">500+</div>
                  <div className="text-sm text-foreground/70">Projects Audited</div>
                </div>
                <div>
                  <div className="text-3xl font-extrabold">98%</div>
                  <div className="text-sm text-foreground/70">Accuracy Rate</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-6 bg-gradient-to-br from-emerald-200/50 to-teal-200/40 blur-2xl rounded-full" />
              <div className="relative rounded-2xl border bg-card p-8 shadow-sm">
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 rounded-xl bg-emerald-50 border"><div className="text-2xl">🌱</div><div className="font-semibold mt-2">Environmental Impact</div><p className="text-sm text-foreground/70 mt-1">Track real benefits with verified projects.</p></div>
                  <div className="p-4 rounded-xl bg-teal-50 border"><div className="text-2xl">🔗</div><div className="font-semibold mt-2">Blockchain Transparency</div><p className="text-sm text-foreground/70 mt-1">Immutable records ensure trust.</p></div>
                  <div className="p-4 rounded-xl bg-emerald-50 border"><div className="text-2xl">🤖</div><div className="font-semibold mt-2">AI Verification</div><p className="text-sm text-foreground/70 mt-1">Analyze satellite & energy data.</p></div>
                  <div className="p-4 rounded-xl bg-teal-50 border"><div className="text-2xl">⚡</div><div className="font-semibold mt-2">Instant Processing</div><p className="text-sm text-foreground/70 mt-1">Fast AI & blockchain pipeline.</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose */}
      <section id="features" className="container py-16 md:py-24">
        <div className="text-center mb-12">
          <div className="text-4xl mb-2">🌍 🌱 ⚡ 🔬</div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Why Choose CarbonIQ?</h2>
          <p className="mt-3 text-foreground/70">Revolutionary features that make carbon credit management transparent, efficient, and trustworthy</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <Feature icon="🤖" title="AI-Powered Verification" desc="Advanced ML analyzes satellite imagery, energy reports, and documentation for accurate verification." />
          <Feature icon="🔗" title="Blockchain Transparency" desc="Immutable records on-chain ensure complete transparency and trust in transactions." />
          <Feature icon="📊" title="Real-time Analytics" desc="Monitor your portfolio with comprehensive analytics and impact tracking." />
          <Feature icon="🏪" title="Decentralized Marketplace" desc="Buy and sell verified credits in a secure, decentralized marketplace." />
          <Feature icon="🌱" title="Environmental Impact" desc="Track real environmental benefits with verified Blue Carbon projects." />
          <Feature icon="⚡" title="Instant Processing" desc="Fast verification powered by AI automation and blockchain efficiency." />
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="bg-grid">
        <div className="container py-16 md:py-24">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-center mb-10">How CarbonIQ Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <Step n="01" icon="📁" title="Upload Project Evidence" desc="Submit documentation, images, and data for AI analysis." />
            <Step n="02" icon="🔍" title="AI Verification Process" desc="We analyze satellite and energy data and validate claims." />
            <Step n="03" icon="🏆" title="Blockchain Certification" desc="Receive blockchain-based carbon credit tokens." />
            <Step n="04" icon="💱" title="Trade in Marketplace" desc="Buy, sell, or trade verified credits securely." />
          </div>
        </div>
      </section>
      <AuthModal 
        open={showAuthModal} 
        onOpenChange={setShowAuthModal}
      />
    </main>
  );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="p-6 rounded-2xl border bg-card hover:shadow-sm transition-shadow">
      <div className="text-3xl">{icon}</div>
      <div className="font-semibold mt-3 text-lg">{title}</div>
      <p className="text-sm text-foreground/70 mt-1">{desc}</p>
    </div>
  );
}

function Step({ n, icon, title, desc }: { n: string; icon: string; title: string; desc: string }) {
  return (
    <div className="p-6 rounded-2xl border bg-card">
      <div className="text-xs text-foreground/60">{n}</div>
      <div className="text-3xl mt-1">{icon}</div>
      <div className="font-semibold mt-3">{title}</div>
      <p className="text-sm text-foreground/70 mt-1">{desc}</p>
    </div>
  );
}
