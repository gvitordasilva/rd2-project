"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";

const schema = z.object({
  nome: z.string().min(3, "Nome obrigatório"),
  endereco: z.string().min(5, "Endereço obrigatório"),
  bairro: z.string().optional(),
  cidade: z.string().min(2, "Cidade obrigatória"),
  estado: z.string().length(2, "Estado deve ter 2 letras"),
  cep: z.string().min(8, "CEP obrigatório"),
  responsavel: z.string().min(3, "Responsável obrigatório"),
  cliente: z.string().min(3, "Cliente obrigatório"),
  dataInicio: z.string().min(1, "Data de início obrigatória"),
  dataPrevisaoFim: z.string().min(1, "Previsão de término obrigatória"),
  status: z.enum(["PLANEJAMENTO", "EM_ANDAMENTO", "PARALISADA", "CONCLUIDA"]),
  descricao: z.string().optional(),
  orcamentoPrevisto: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ObraFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<FormData> & { id?: string };
}

export function ObraFormDialog({ open, onClose, onSuccess, initialData }: ObraFormDialogProps) {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const isEditing = !!initialData?.id;

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: "PLANEJAMENTO",
      ...initialData,
    },
  });

  useEffect(() => {
    if (open) reset({ status: "PLANEJAMENTO", ...initialData });
  }, [open, initialData, reset]);

  const buscarCep = async (cep: string) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setValue("endereco", data.logradouro || "");
        setValue("bairro", data.bairro || "");
        setValue("cidade", data.localidade || "");
        setValue("estado", data.uf || "");
      }
    } catch {
      // silent
    } finally {
      setCepLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const body = {
        ...data,
        orcamentoPrevisto: data.orcamentoPrevisto ? Number(data.orcamentoPrevisto) : undefined,
      };
      if (isEditing) {
        await apiFetch(`/api/obras/${initialData!.id}`, { method: "PUT", body: JSON.stringify(body) });
        toast({ title: "Obra atualizada com sucesso!", variant: "success" });
      } else {
        await apiFetch("/api/obras", { method: "POST", body: JSON.stringify(body) });
        toast({ title: "Obra cadastrada com sucesso!", variant: "success" });
      }
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao salvar";
      toast({ title: "Erro", description: message, variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Obra" : "Cadastrar Nova Obra"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="nome">Nome da Obra *</Label>
              <Input id="nome" placeholder="Ex: Residencial Vila Verde" {...register("nome")} />
              {errors.nome && <p className="text-red-500 text-xs">{errors.nome.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cliente">Cliente / Contratante *</Label>
              <Input id="cliente" placeholder="Nome do cliente" {...register("cliente")} />
              {errors.cliente && <p className="text-red-500 text-xs">{errors.cliente.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="responsavel">Responsável Técnico *</Label>
              <Input id="responsavel" placeholder="Nome do engenheiro" {...register("responsavel")} />
              {errors.responsavel && <p className="text-red-500 text-xs">{errors.responsavel.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cep">CEP *</Label>
              <div className="relative">
                <Input
                  id="cep"
                  placeholder="00000-000"
                  {...register("cep")}
                  onBlur={(e) => buscarCep(e.target.value)}
                />
                {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />}
              </div>
              {errors.cep && <p className="text-red-500 text-xs">{errors.cep.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="estado">Estado *</Label>
              <Input id="estado" placeholder="SP" maxLength={2} className="uppercase" {...register("estado")} />
              {errors.estado && <p className="text-red-500 text-xs">{errors.estado.message}</p>}
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="endereco">Endereço *</Label>
              <Input id="endereco" placeholder="Rua, número" {...register("endereco")} />
              {errors.endereco && <p className="text-red-500 text-xs">{errors.endereco.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bairro">Bairro</Label>
              <Input id="bairro" placeholder="Bairro" {...register("bairro")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cidade">Cidade *</Label>
              <Input id="cidade" placeholder="Cidade" {...register("cidade")} />
              {errors.cidade && <p className="text-red-500 text-xs">{errors.cidade.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dataInicio">Data de Início *</Label>
              <Input id="dataInicio" type="date" {...register("dataInicio")} />
              {errors.dataInicio && <p className="text-red-500 text-xs">{errors.dataInicio.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dataPrevisaoFim">Previsão de Término *</Label>
              <Input id="dataPrevisaoFim" type="date" {...register("dataPrevisaoFim")} />
              {errors.dataPrevisaoFim && <p className="text-red-500 text-xs">{errors.dataPrevisaoFim.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v as FormData["status"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANEJAMENTO">Planejamento</SelectItem>
                  <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                  <SelectItem value="PARALISADA">Paralisada</SelectItem>
                  <SelectItem value="CONCLUIDA">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="orcamentoPrevisto">Orçamento Previsto (R$)</Label>
              <Input id="orcamentoPrevisto" type="number" placeholder="0,00" step="0.01" {...register("orcamentoPrevisto")} />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="descricao">Descrição</Label>
              <textarea
                id="descricao"
                rows={3}
                placeholder="Descreva a obra..."
                {...register("descricao")}
                className="flex w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? "Salvar alterações" : "Cadastrar Obra"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
