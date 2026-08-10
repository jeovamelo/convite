"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error("Senha incorreta.");
      }

      router.push("/admin/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Falha ao entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-sonicBlueNavy">
      <div className="absolute inset-0 z-0 checkerboard-bg opacity-40" />

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md bg-white p-8 rounded-3xl shadow-2xl relative z-10 mx-4"
      >
        <div className="text-center mb-8">
          <h2 className="font-montserrat font-black italic text-sonicBlueMain text-3xl uppercase leading-tight">
            LUIZ MAURICIO
          </h2>
          <div className="bg-sonicRed text-white text-xs font-bold px-2 py-0.5 rounded inline-block mt-1">
            4 ANOS
          </div>
          <p className="font-inter font-bold text-gray-500 mt-4 uppercase tracking-wider text-sm">
            Painel Administrativo
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block font-inter font-bold text-gray-700 text-sm mb-2">
              Senha de Acesso
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock size={20} className="text-gray-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha de administrador"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-sonicBlueMain focus:bg-white transition-all font-inter"
                required
              />
            </div>
          </div>

          {error && <p className="text-sm font-bold text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sonicBlueMain hover:bg-sonicBlueDark text-white font-inter font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-solid-3d-cyan active:translate-y-1 active:shadow-none disabled:opacity-60"
          >
            {loading ? "ENTRANDO..." : "ENTRAR"} <ArrowRight size={20} />
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-8 font-inter">
          Acesso restrito à organização do evento.
        </p>
      </motion.div>
    </div>
  );
}

