import React, { useState } from "react";
import { useAuth } from "../lib/auth";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export function LoginPage() {
  const { loginWithCredentials } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Por favor, informe seu e-mail e sua senha de 4 dígitos.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    const result = await loginWithCredentials(email, password);
    setIsLoading(false);

    if (!result.success) {
      setErrorMsg(result.error || "E-mail ou senha incorretos.");
    }
  };

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden overflow-y-auto bg-[#07101d] font-sans text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(69,196,246,0.20),transparent_30%),radial-gradient(circle_at_82%_84%,rgba(26,62,138,0.26),transparent_36%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
      <div className="pointer-events-none absolute -left-32 top-1/3 h-[520px] w-[520px] rounded-full bg-sky-500/10 blur-[120px]" />

      <main className="relative z-10 mx-auto grid min-h-dvh w-full max-w-[1440px] box-border grid-cols-1 items-center gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.72fr)] lg:gap-16 lg:px-12 xl:gap-24 xl:px-20">
        <motion.section
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="hidden min-w-0 flex-col justify-center lg:flex"
          aria-label="Identidade SAE"
        >
          <div className="flex items-end gap-6">
            <img
              src="/brand/sae-symbol-clean.png"
              alt="Símbolo SAE"
              referrerPolicy="no-referrer"
              className="h-36 w-36 shrink-0 object-contain xl:h-44 xl:w-44 drop-shadow-[0_15px_30px_rgba(0,145,218,0.25)]"
            />
            <span className="pb-5 text-[5.25rem] font-black leading-none tracking-[-0.075em] text-white xl:text-[6.5rem]">
              SAE
            </span>
          </div>

          <div className="mt-7 max-w-2xl">
            <div className="mb-6 h-px w-full bg-gradient-to-r from-sky-400/70 via-sky-400/15 to-transparent" />
            <p className="text-xs font-black uppercase tracking-[0.32em] text-sky-300">
              Sistema Gerencial
            </p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-slate-50 xl:text-5xl">
              Informação integrada para decisões mais seguras.
            </h1>
            <p className="mt-5 max-w-xl text-base font-medium leading-7 text-slate-400">
              Planejamento, regulação e acompanhamento operacional da
              Superintendência de Abastecimento de Água e Esgoto.
            </p>
          </div>

          <div className="mt-9 flex flex-wrap gap-3 text-xs font-bold text-slate-300">
            {["Planejamento", "Regulação", "Fiscalização"].map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2.5 backdrop-blur-sm"
              >
                <CheckCircle2 size={14} className="text-emerald-400" />
                {label}
              </span>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: "easeOut" }}
          className="mx-auto min-w-0 max-w-full"
          style={{ width: "min(510px, calc(100vw - 2.5rem))" }}
          aria-label="Acesso ao sistema"
        >
          <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
            <img
              src="/brand/sae-symbol-clean.png"
              alt="Símbolo SAE"
              referrerPolicy="no-referrer"
              className="h-14 w-14 shrink-0 object-contain"
            />
            <div>
              <p className="text-2xl font-black tracking-[-0.04em] text-white">SAE</p>
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-sky-300">
                Sistema Gerencial
              </p>
            </div>
          </div>

          <div className="w-full max-w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#0d1829]/90 shadow-[0_35px_100px_-30px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
            <div className="border-b border-white/[0.075] px-5 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-8">
              <div className="flex items-center gap-4">
                <img
                  src="/brand/sae-symbol-clean.png"
                  alt="Símbolo SAE"
                  referrerPolicy="no-referrer"
                  className="h-14 w-14 shrink-0 object-contain"
                />
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.26em] text-sky-300">
                    <ShieldCheck size={12} />
                    Acesso seguro
                  </div>
                  <h2 className="text-2xl font-black tracking-[-0.035em] text-white">
                    Entrar no sistema
                  </h2>
                  <p className="mt-1 text-xs font-medium leading-5 text-slate-400">
                    Use suas credenciais para acessar o painel completo.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-6 sm:px-8 sm:py-7">
              <form onSubmit={handleLogin} className="space-y-4">
                <AnimatePresence mode="wait">
                  {errorMsg && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      role="alert"
                      aria-live="polite"
                      className="flex items-start gap-2.5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3.5 text-xs font-bold leading-relaxed text-rose-100"
                    >
                      <ShieldAlert className="mt-0.5 shrink-0 text-rose-300" size={16} />
                      <span>{errorMsg}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-bold text-slate-200"
                  >
                    E-mail ou usuário
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      required
                      value={email}
                      disabled={isLoading}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="exemplo@adasa.gov.br"
                      className="w-full rounded-xl border border-white/10 bg-[#1a2940] py-3.5 pl-11 pr-4 text-sm font-semibold text-white outline-none transition-all placeholder:text-slate-500 focus:border-sky-400/70 focus:bg-[#1d2e48] focus:ring-4 focus:ring-sky-400/10 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-bold text-slate-200"
                  >
                    Senha de acesso
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      maxLength={12}
                      value={password}
                      disabled={isLoading}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••"
                      className="w-full rounded-xl border border-white/10 bg-[#1a2940] py-3.5 pl-11 pr-12 font-mono text-sm font-extrabold tracking-[0.28em] text-white outline-none transition-all placeholder:text-slate-500 focus:border-sky-400/70 focus:bg-[#1d2e48] focus:ring-4 focus:ring-sky-400/10 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      aria-pressed={showPassword}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0091DA] to-[#1A3E8A] px-5 py-3.5 text-xs font-black uppercase tracking-[0.18em] text-white shadow-[0_16px_35px_-16px_rgba(0,145,218,0.8)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Autenticando...
                    </>
                  ) : (
                    <>
                      Entrar
                      <ArrowRight
                        size={15}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <p className="mt-5 flex items-center justify-center gap-2 text-center text-[10px] font-semibold text-slate-600">
            <Lock size={11} />
            Ambiente institucional com acesso controlado
          </p>
        </motion.section>
      </main>
    </div>
  );
}
