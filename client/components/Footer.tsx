import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="relative mt-16 border-t bg-background/60 backdrop-blur">
      <div className="container py-10 grid gap-8 md:grid-cols-4">
        <div>
          <div className="font-extrabold text-lg">Team-Work</div>
          <p className="mt-2 text-sm text-muted-foreground">
            A modern, animated dashboard suite for high-performance teams.
          </p>
        </div>
        <div>
          <div className="font-semibold">Product</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">Home</Link></li>
            <li><Link to="/app" className="hover:text-foreground">Dashboard</Link></li>
            <li><a className="cursor-not-allowed opacity-60">Features</a></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold">Company</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><a className="cursor-not-allowed opacity-60">About</a></li>
            <li><a className="cursor-not-allowed opacity-60">Careers</a></li>
            <li><a className="cursor-not-allowed opacity-60">Contact</a></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold">Legal</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><a className="cursor-not-allowed opacity-60">Privacy</a></li>
            <li><a className="cursor-not-allowed opacity-60">Terms</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="container py-4 text-xs text-muted-foreground flex items-center justify-between">
          <span>© {new Date().getFullYear()} Team-Work. All rights reserved.</span>
          <span>Made with love for teams • Hammad Soomro</span>
        </div>
      </div>
    </footer>
  );
}
