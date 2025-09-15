import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { signup, login } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

export default function Index() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-500 to-emerald-500">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-400/40 blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-cyan-400/40 blur-3xl animate-pulse [animation-delay:200ms]" />
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
      </div>

      <header className="relative z-10">
        <nav className="container flex h-16 items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-white/90" />
            <div className="text-xl font-extrabold tracking-tight">Team-Work</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setLoginOpen(true)}>Login</Button>
            <Button onClick={() => setSignupOpen(true)}>Create Account</Button>
          </div>
        </nav>
      </header>

      <main className="relative z-10 text-white">
        <section className="container py-24">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <h1 className="text-5xl md:text-6xl font-extrabold leading-tight drop-shadow-lg">
                Team-Work — Modern, Animated Dashboard Suite
              </h1>
              <p className="mt-4 max-w-xl text-white/90">
                Collaborate. Sell. Succeed. Create an account or sign in to access a powerful dashboard with a collapsible sidebar, vibrant quick styles, sales analytics, and team chat.
              </p>
              <div className="mt-8 flex gap-3">
                <Button size="lg" onClick={() => setSignupOpen(true)}>Start as Admin</Button>
                <Button size="lg" variant="secondary" onClick={() => setLoginOpen(true)}>Login</Button>
              </div>
              <div className="mt-6 text-sm text-white/80">The first account to sign up becomes the Admin. Only Admins can see the Admin Panel.</div>
            </div>
            <div className="relative">
              <div className="relative rounded-2xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur">
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-24 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500" />
                  <div className="h-24 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500" />
                  <div className="h-24 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500" />
                  <div className="col-span-3 h-36 rounded-xl bg-white/20" />
                </div>
                <div className="absolute -right-6 -top-6 size-20 rounded-full bg-white/30 blur-2xl" />
              </div>
            </div>
          </div>
        </section>

        <section className="container py-16">
          <div className="grid gap-6 md:grid-cols-3">
            <Feature title="Colorful Analytics" desc="Vibrant, at-a-glance metrics with gradients and motion." />
            <Feature title="Collapsible Sidebar" desc="Fast, keyboard-friendly navigation with quick actions." />
            <Feature title="Role-based Access" desc="Admin, Scrapper, Seller permissions baked-in from day one." />
          </div>
        </section>

        <section className="container py-16">
          <div className="grid items-center gap-8 md:grid-cols-3">
            <Stat value="10k+" label="Transactions/day" />
            <Stat value="2.5x" label="Faster onboarding" />
            <Stat value="99.9%" label="Uptime target" />
          </div>
        </section>

        <section className="container py-20">
          <div className="rounded-2xl border border-white/20 bg-white/5 p-8 backdrop-blur">
            <h2 className="text-3xl font-bold">Built for modern teams</h2>
            <p className="mt-2 max-w-2xl text-white/90">A clean, latest layout with smooth micro‑interactions and a premium feel. Start as Admin and invite your team in minutes.</p>
            <div className="mt-6 flex gap-3">
              <Button onClick={() => setSignupOpen(true)}>Create free account</Button>
              <Button variant="secondary" onClick={() => setLoginOpen(true)}>Sign in</Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />

      <AuthModals
        loginOpen={loginOpen}
        setLoginOpen={setLoginOpen}
        signupOpen={signupOpen}
        setSignupOpen={setSignupOpen}
        onSuccess={(u) => { setUser(u); navigate("/app"); }}
      />
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur">
      <div className="h-10 w-10 rounded-md bg-gradient-to-br from-indigo-500 to-emerald-500" />
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-white/90">{desc}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/10 p-6 text-center backdrop-blur">
      <div className="text-4xl font-extrabold">{value}</div>
      <div className="mt-1 text-sm text-white/90">{label}</div>
    </div>
  );
}

function AuthModals({ loginOpen, setLoginOpen, signupOpen, setSignupOpen, onSuccess }: { loginOpen: boolean; setLoginOpen: (v: boolean) => void; signupOpen: boolean; setSignupOpen: (v: boolean) => void; onSuccess: (u: any) => void; }) {
  return (
    <>
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login</DialogTitle>
            <DialogDescription>After login, the dashboard will be shown.</DialogDescription>
          </DialogHeader>
          <LoginForm onSuccess={(u) => { setLoginOpen(false); onSuccess(u); }} />
        </DialogContent>
      </Dialog>
      <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Account</DialogTitle>
            <DialogDescription>The first account to sign up becomes the Admin.</DialogDescription>
          </DialogHeader>
          <SignupForm onSuccess={(u) => { setSignupOpen(false); onSuccess(u); }} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function LoginForm({ onSuccess }: { onSuccess: (u: any) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          const u = login(email, password);
          onSuccess(u);
        } catch (err: any) {
          setError(err.message || "Login failed");
        }
      }}
    >
      <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <div className="text-sm text-destructive">{error}</div>}
      <Button type="submit" className="w-full">Login</Button>
    </form>
  );
}

function SignupForm({ onSuccess }: { onSuccess: (u: any) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          const u = signup(name, email, password);
          onSuccess(u);
        } catch (err: any) {
          setError(err.message || "Signup failed");
        }
      }}
    >
      <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
      <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <div className="text-sm text-destructive">{error}</div>}
      <Button type="submit" className="w-full">Create Account</Button>
    </form>
  );
}
