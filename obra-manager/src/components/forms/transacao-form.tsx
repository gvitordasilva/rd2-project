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
import { TooltipIcon } from "@/components/ui/tooltip";

const CATEGORIAS_FALLBACK: Record<string, string[]> = {
  ENTRADA: ["Aporte de Capital", "Recebimento de Cliente", "Financiamento Bancário", "Venda de Material", "Outros Recebimentos"],
  SAIDA: ["Material de Construção", "Mão de Obra", "Aluguel de Equipamento", "Serviços Terceirizados", "Impostos e Taxas", "Alimentação", "Transporte e Combustível", "Ferramentas e EPI", "Administrativo", "Outros"],
};

const schema = z.object({
  tipo: z.enum(["ENTRADA", "SAIDA"]),
  valor: z.string().min(1),
  data: z.string().min(1),
  categoria: z.string().min(1),
  descricao: z.string().min(3),
  fornecedor: z.string().optional(),
  formaPagamento: z.string().optional(),
  status: z.enum(["PENDENTE", "PAGO", "CANCELADO"]),
  obraId: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

interface TransacaoFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tipoDefault?: "ENTRADA" | "SAIDA";
  initialData?: Partial<FormData> & { id?: string };
}

export function TransacaoFormDialog({ open, onClose, onSuccess, tipoDefault, initialData }: TransacaoFormDialogProps) {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingObras, setLoadingObras] = useState(false);
  const [obras, setObras] = useState<{ id: string; nome: string }[]>([]);
  const isEditing = !!initialData?.id;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: tipoDefault || "SAIDA", status: "PENDENTE", ...initialData },
  });

  const tipoValue = watch("tipo");
  const [categorias, setCategorias] = useState<string[]>(CATEGORIAS_FALLBACK[tipoValue ?? "SAIDA"] ?? []);

  useEffect(() => {
    if (!tipoValue) return;
    apiFetch<{ data: string[] }>(`/api/categorias?tipo=${tipoValue}`)
      .then((res) => setCategorias(res.data))
      .catch(() => setCategorias(CATEGORIAS_FALLBACK[tipoValue] ?? []));
  }, [tipoValue]);

  useEffect(() => {
    if (open) {
      reset({ tipo: tipoDefault || "SAIDA", status: "PENDENTE", ...initialData });
      setLoadingObras(true);
      apiFetch<{ data: { data: { id: string; nome: string }[] } }>("/api/obras", { params: { pageSize: 100 } })
        .then((res) => setObras(res.data.data))
        .catch(() => {})
        .finally(() => setLoadingObras(false));
    }
  }, [open, tipoDefault]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const body = { ...data, valor: Number(data.valor) };
      if (isEditing) {
        await apiFetch(`/api/financeiro/${initialData!.id}`, { method: "PUT", body });
        toast({ title: "Transação atualizada!", variant: "success" });
      } else {
        await apiFetch("/api/financeiro", { method: "POST", body });
        toast({ title: "Transação registrada!", variant: "success" });
      }
      onSuccess();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message, variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Transação" : tipoValue === "ENTRADA" ? "Registrar Entrada" : "Registrar Saída"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select value={tipoValue} onValueChange={(v) => { setValue("tipo", v as "ENTRADA" | "SAIDA"); setValue("categoria", ""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENTRADA">Entrada</SelectItem>
                  <SelectItem value="SAIDA">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v as FormData["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="PAGO">Pago</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Valor (R$) *</Label>
              <Input type="number" step="0.01" placeholder="0,00" {...register("valor")} />
            </div>
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Input type="date" {...register("data")} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Categoria *</Label>
              <Select value={watch("categoria")} onValueChange={(v) => setValue("categoria", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar categoria" /></SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.categoria && <p className="text-red-500 text-xs">Categoria obrigatória</p>}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Descrição *</Label>
              <Input placeholder="Descreva a transação..." {...register("descricao")} />
              {errors.descricao && <p className="text-red-500 text-xs">Descrição obrigatória</p>}
            </div>
            {tipoValue === "SAIDA" && (
              <div className="col-span-2 space-y-1.5">
                <Label>Fornecedor</Label>
                <Input placeholder="Nome do fornecedor" {...register("fornecedor")} />
              </div>
            )}
            <div className="col-span-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label>Forma de Pagamento</Label>
                <TooltipIcon text="Ex.: PIX, boleto, transferência, dinheiro, cheque. Usado para controle interno e relatórios." />
              </div>
              <Input placeholder="PIX, boleto, dinheiro..." {...register("formaPagamento")} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Obra *</Label>
              <Select value={watch("obraId")} onValueChange={(v) => setValue("obraId", v)} disabled={loadingObras}>
                <SelectTrigger>
                  {loadingObras ? <span className="text-[var(--muted-foreground)] text-sm">Carregando obras...</span> : <SelectValue placeholder="Selecionar obra" />}
                </SelectTrigger>
                <SelectContent>
                  {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.obraId && <p className="text-red-500 text-xs">Obra obrigatória</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading} className={tipoValue === "ENTRADA" ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? "Salvar" : tipoValue === "ENTRADA" ? "Registrar Entrada" : "Registrar Saída"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
