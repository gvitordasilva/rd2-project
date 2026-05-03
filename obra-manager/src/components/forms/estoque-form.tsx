"use client";
import { useForm, type Resolver } from "react-hook-form";
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
import { useState } from "react";

const CATEGORIAS = ["Cimento e Argamassa", "Aço e Ferragens", "Madeira e Compensado", "Tijolos e Blocos", "Tubos e Conexões", "Elétrica", "Hidráulica", "Acabamento", "Ferramentas", "EPI", "Outros"];
const UNIDADES = ["un", "kg", "t", "m", "m²", "m³", "L", "saco", "cx", "pç", "rolo", "barra"];

const itemSchema = z.object({
  nome: z.string().min(2),
  unidade: z.string().min(1),
  categoria: z.string().optional(),
  quantidadeAtual: z.coerce.number().min(0).default(0),
  quantidadeMinima: z.coerce.number().min(0).optional().or(z.literal("")),
  valorUnitario: z.coerce.number().positive().optional().or(z.literal("")),
});

const movSchema = z.object({
  tipo: z.enum(["ENTRADA", "SAIDA", "AJUSTE"]),
  quantidade: z.coerce.number().positive(),
  valorUnitario: z.coerce.number().positive().optional().or(z.literal("")),
  motivo: z.string().optional(),
  fornecedor: z.string().optional(),
  notaFiscal: z.string().optional(),
  responsavel: z.string().optional(),
});

type ItemFormData = z.infer<typeof itemSchema>;
type MovFormData = z.infer<typeof movSchema>;

interface ItemEstoqueFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  obraId: string;
  initialData?: Partial<ItemFormData> & { id?: string };
}

interface MovimentacaoFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  itemId: string;
  itemNome: string;
  unidade: string;
  saldoAtual: number;
}

export function ItemEstoqueFormDialog({ open, onClose, onSuccess, obraId, initialData }: ItemEstoqueFormProps) {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEditing = !!initialData?.id;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema) as Resolver<ItemFormData>,
    defaultValues: { quantidadeAtual: 0, ...initialData },
  });

  const onSubmit = async (data: ItemFormData) => {
    setLoading(true);
    try {
      const body = {
        ...data,
        quantidadeMinima: data.quantidadeMinima ? Number(data.quantidadeMinima) : undefined,
        valorUnitario: data.valorUnitario ? Number(data.valorUnitario) : undefined,
      };
      if (isEditing) {
        await apiFetch(`/api/estoque/${initialData!.id}`, { method: "PUT", body });
        toast({ title: "Item atualizado!", variant: "success" });
      } else {
        await apiFetch(`/api/obras/${obraId}/estoque`, { method: "POST", body });
        toast({ title: "Item cadastrado!", variant: "success" });
      }
      reset();
      onSuccess();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message, variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Item" : "Cadastrar Material"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome do Material *</Label>
              <Input placeholder="Ex: Cimento CP-II, Vergalhão 12mm" {...register("nome")} />
              {errors.nome && <p className="text-red-500 text-xs">Nome obrigatório</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Unidade *</Label>
              <Select value={watch("unidade")} onValueChange={(v) => setValue("unidade", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.unidade && <p className="text-red-500 text-xs">Unidade obrigatória</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={watch("categoria") || ""} onValueChange={(v) => setValue("categoria", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!isEditing && (
              <div className="space-y-1.5">
                <Label>Qtd. Inicial</Label>
                <Input type="number" step="0.001" min="0" placeholder="0" {...register("quantidadeAtual")} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Qtd. Mínima (alerta)</Label>
              <Input type="number" step="0.001" min="0" placeholder="0" {...register("quantidadeMinima")} />
            </div>
            <div className="space-y-1.5">
              <Label>Valor Unitário (R$)</Label>
              <Input type="number" step="0.01" placeholder="0,00" {...register("valorUnitario")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {isEditing ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MovimentacaoFormDialog({ open, onClose, onSuccess, itemId, itemNome, unidade, saldoAtual }: MovimentacaoFormProps) {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<MovFormData>({
    resolver: zodResolver(movSchema) as Resolver<MovFormData>,
    defaultValues: { tipo: "ENTRADA" },
  });

  const tipoValue = watch("tipo");

  const onSubmit = async (data: MovFormData) => {
    setLoading(true);
    try {
      const body = { ...data, valorUnitario: data.valorUnitario ? Number(data.valorUnitario) : undefined };
      await apiFetch(`/api/estoque/${itemId}/movimentacoes`, { method: "POST", body });
      const labels: Record<string, string> = { ENTRADA: "Entrada registrada!", SAIDA: "Saída registrada!", AJUSTE: "Ajuste realizado!" };
      toast({ title: labels[data.tipo], variant: "success" });
      reset();
      onSuccess();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message, variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Movimentação — {itemNome}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[var(--muted-foreground)] -mt-2">
          Saldo atual: <span className="font-semibold text-[var(--foreground)]">{saldoAtual} {unidade}</span>
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select value={tipoValue} onValueChange={(v) => setValue("tipo", v as MovFormData["tipo"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENTRADA">Entrada</SelectItem>
                  <SelectItem value="SAIDA">Saída</SelectItem>
                  <SelectItem value="AJUSTE">Ajuste de Inventário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantidade ({unidade}) *</Label>
              <Input type="number" step="0.001" min="0.001" placeholder="0" {...register("quantidade")} />
              {errors.quantidade && <p className="text-red-500 text-xs">Quantidade obrigatória</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Valor Unitário (R$)</Label>
              <Input type="number" step="0.01" placeholder="0,00" {...register("valorUnitario")} />
            </div>
            {tipoValue === "ENTRADA" && (
              <>
                <div className="space-y-1.5">
                  <Label>Fornecedor</Label>
                  <Input placeholder="Nome do fornecedor" {...register("fornecedor")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Nota Fiscal</Label>
                  <Input placeholder="NF-e 000.000" {...register("notaFiscal")} />
                </div>
              </>
            )}
            <div className="col-span-2 space-y-1.5">
              <Label>Motivo / Observação</Label>
              <Input
                placeholder={tipoValue === "ENTRADA" ? "Compra, doação..." : tipoValue === "SAIDA" ? "Uso na laje, desperdício..." : "Inventário físico..."}
                {...register("motivo")}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Responsável</Label>
              <Input placeholder="Nome do responsável" {...register("responsavel")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button
              type="submit"
              disabled={loading}
              className={tipoValue === "ENTRADA" ? "bg-emerald-600 hover:bg-emerald-700" : tipoValue === "SAIDA" ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {tipoValue === "ENTRADA" ? "Registrar Entrada" : tipoValue === "SAIDA" ? "Registrar Saída" : "Aplicar Ajuste"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
