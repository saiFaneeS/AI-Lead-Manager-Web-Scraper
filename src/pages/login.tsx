import React, { useState, useEffect } from "react";
import { Lock, Mail } from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import { Roboto } from "next/font/google";

export const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        setIsLoggedIn(true);
        window.location.href = "/";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (!error) {
        setIsLoggedIn(false);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Signout failed");
    }
  }

  return (
    <div
      className={`min-h-screen bg-zinc-950 flex items-center justify-center p-4 ${roboto.className}`}
    >
      <div className="w-full max-w-xs">
        <h2 className="text-lg font-medium text-zinc-200 text-center mb-4">
          Authorize
        </h2>
        <div>
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  size={16}
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-400 focus:outline outline-1 outline-zinc-500"
                  placeholder="Email"
                  required
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  size={16}
                />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-400 focus:outline outline-1 outline-zinc-500"
                  placeholder="Password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-500/40 border border-emerald-500/50 text-zinc-300 w-full py-2 hover:bg-emerald-500/50 focus:outline outline-1 outline-emerald-500"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            {isLoggedIn && (
              <button
                onClick={() => signOut()}
                type="button"
                disabled={loading}
                className="w-full py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-500 font-medium transition-colors focus:outline-none focus:bg-zinc-900 hover:bg-zinc-900"
              >
                Sign out
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
