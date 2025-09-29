export default function SiteFooter() {
  return (
    <footer className="border-t mt-12">
      <div className="container py-10 text-sm text-foreground/70 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌱</span>
          <span>CarbonIQ © {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="hover:text-primary">Features</a>
          <a href="#how" className="hover:text-primary">How it works</a>
          <a href="#" className="hover:text-primary">Privacy</a>
        </div>
      </div>
    </footer>
  );
}
