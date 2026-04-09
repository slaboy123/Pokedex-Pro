import { FormEvent, useState } from 'react';

interface RegisterPageProps {
  onRegister: (email: string, password: string, nickname: string) => Promise<boolean>;
  onGoToLogin: () => void;
  loading: boolean;
  error: string | null;
}

export const RegisterPage = ({
  onRegister,
  onGoToLogin,
  loading,
  error,
}: RegisterPageProps): JSX.Element => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!email.includes('@')) {
      setLocalError('Digite um email valido.');
      return;
    }

    if (nickname.trim().length < 3) {
      setLocalError('O nickname precisa ter ao menos 3 caracteres.');
      return;
    }

    if (password.length < 6) {
      setLocalError('A senha precisa ter ao menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('As senhas nao coincidem.');
      return;
    }

    setLocalError(null);
    await onRegister(email.trim(), password, nickname.trim());
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(120,18,30,0.3),transparent_40%),radial-gradient(circle_at_85%_85%,rgba(65,10,18,0.2),transparent_42%),linear-gradient(180deg,#050303_0%,#0b0708_52%,#050303_100%)]" />

      <section className="relative w-full max-w-md rounded-3xl border border-rose-300/20 bg-[#0d0708]/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:p-8">
        <p className="text-xs uppercase tracking-[0.35em] text-rose-300/80">Pokedex Pro</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-100">Criar Conta</h1>
        <p className="mt-2 text-sm text-slate-300">Registre seu perfil para salvar progresso e jogar multiplayer.</p>

        <form className="mt-6 space-y-4" onSubmit={(event) => void submit(event)}>
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Nickname</span>
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              type="text"
              autoComplete="nickname"
              placeholder="Seu nome de treinador"
              className="w-full rounded-2xl border border-rose-300/20 bg-[#090506] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-rose-300/60 focus:shadow-[0_0_0_2px_rgba(251,113,133,0.2)]"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              placeholder="treinador@pokedexpro.com"
              className="w-full rounded-2xl border border-rose-300/20 bg-[#090506] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-rose-300/60 focus:shadow-[0_0_0_2px_rgba(251,113,133,0.2)]"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Senha</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder="Minimo 6 caracteres"
              className="w-full rounded-2xl border border-rose-300/20 bg-[#090506] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-rose-300/60 focus:shadow-[0_0_0_2px_rgba(251,113,133,0.2)]"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Confirmar senha</span>
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder="Repita sua senha"
              className="w-full rounded-2xl border border-rose-300/20 bg-[#090506] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-rose-300/60 focus:shadow-[0_0_0_2px_rgba(251,113,133,0.2)]"
            />
          </label>

          {localError ? <p className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-sm text-rose-200">{localError}</p> : null}
          {error ? <p className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-sm text-rose-200">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-rose-300 to-rose-400 px-4 py-3 text-sm font-extrabold uppercase tracking-[0.15em] text-[#21070b] transition hover:brightness-105 disabled:opacity-70"
          >
            {loading ? 'Criando...' : 'Registrar'}
          </button>
        </form>

        <button
          type="button"
          onClick={onGoToLogin}
          className="mt-4 w-full text-sm font-semibold text-rose-200 underline-offset-4 transition hover:text-rose-100 hover:underline"
        >
          Ja tenho conta
        </button>
      </section>
    </main>
  );
};
