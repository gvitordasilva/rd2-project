"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HardHat, Eye, EyeOff, Loader2, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  orgSlug: z.string().optional(),
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Erro ao entrar", description: json.message, variant: "error" });
        return;
      }

      setAuth(json.data.user, json.data.accessToken);
      toast({ title: "Bem-vindo!", description: `Olá, ${json.data.user.nome}`, variant: "success" });

      if (json.data.user.perfil === "SUPER_ADMIN") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch {
      toast({ title: "Erro de conexão", description: "Verifique sua internet", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-12">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-xl">
            <HardHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-xl">Obra</span>
            <span className="font-bold text-blue-400 text-xl"> Manager</span>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Gerencie suas obras<br />
            <span className="text-blue-400">com precisão</span>
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Controle financeiro, funcionários, maquinário e alertas em um único sistema profissional.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Multi-Tenant", value: "100%" },
              { label: "Controle Total", value: "∞" },
              { label: "Alertas Inteligentes", value: "24/7" },
              { label: "Relatórios", value: "PDF/Excel" },
            ].map((item) => (
              <div key={item.label} className="bg-white/5 rounded-lg p-4">
                <p className="text-blue-400 font-bold text-xl">{item.value}</p>
                <p className="text-slate-400 text-sm">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-500 text-sm">© 2024 Obra Manager. Todos os direitos reservados.</p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-xl">
              <HardHat className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-[var(--foreground)] text-xl">Obra Manager</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Entrar na plataforma</h1>
            <p className="text-[var(--muted-foreground)] mt-1">Informe suas credenciais para continuar</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="orgSlug">
                <span className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5" />
                  Código da organização
                </span>
              </Label>
              <Input
                id="orgSlug"
                type="text"
                placeholder="minha-empresa"
                autoComplete="organization"
                {...register("orgSlug")}
                className={errors.orgSlug ? "border-red-500" : ""}
              />
              <p className="text-xs text-[var(--muted-foreground)]">Deixe em branco para acesso administrativo</p>
              {errors.orgSlug && <p className="text-red-500 text-xs">{errors.orgSlug.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                {...register("email")}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Input
                  id="senha"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register("senha")}
                  className={errors.senha ? "border-red-500 pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.senha && <p className="text-red-500 text-xs">{errors.senha.message}</p>}
            </div>

            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-8 p-4 bg-[var(--secondary)] rounded-lg space-y-2">
            <p className="text-xs text-[var(--muted-foreground)] font-medium">Acesso de demonstração:</p>
            <div className="space-y-1">
              <p className="text-xs text-[var(--muted-foreground)]">
                <strong>Super Admin</strong> (sem org): <strong>superadmin@obramanager.com</strong> / <strong>super123</strong>
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Org: <strong>construtech</strong> | Admin: <strong>admin@construtech.com</strong> / <strong>admin123</strong>
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Org: <strong>buildpro</strong> | Admin: <strong>admin@buildpro.com</strong> / <strong>gerente123</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
