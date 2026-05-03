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

const schema = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional(),
  ordem: z.coerce.number().int().min(0),
  status: z.enum(["PENDENTE", "EM_ANDAMENTO", "CONCLUIDA", "PARALISADA"]),
  percentual: z.coerce.number().min(0).max(100),
  dataInicioPrev: z.string().optional(),
  dataFimPrev: z.string().optional(),
  dataInicioReal: z.string().optional(),
  dataFimReal: z.string().optional(),
  valorPrevisto: z.coerce.number().positive().optional().or(z.literal("")),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface EtapaFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  obraId: string;
  initialData?: Partial<FormData> & { id?: string };
  nextOrdem?: number;
}

export function EtapaFormDialog({ open, onClose, onSuccess, obraId, initialData, nextOrdem = 0 }: EtapaFormDialogProps) {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEditing = !!initialData?.id;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: {
      status: "PENDENTE",
      percentual: 0,
      ordem: nextOrdem,
      ...initialData,
    },
  });

  const statusValue = watch("status");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const body = { ...data, valorPrevisto: data.valorPrevisto ? Number(data.valorPrevisto) : undefined };
      if (isEditing) {
        await apiFetch(`/api/obras/${obraId}/etapas/${initialData!.id}`, { method: "PUT", body });
        toast({ title: "Etapa atualizada!", variant: "success" });
      } else {
        await apiFetch(`/api/obras/${obraId}/etapas`, { method: "POST", body });
        toast({ title: "Etapa criada!", variant: "success" });
      }
      reset();
      onSuccess();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message, variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const statusLabels: Record<string, string> = {
    PENDENTE: "Pendente",
    EM_ANDAMENTO: "Em Andamento",
    CONCLUIDA: "Concluída",
    PARALISADA: "Paralisada",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Etapa" : "Nova Etapa"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome da Etapa *</Label>
              <Input placeholder="Ex: Fundação, Estrutura, Acabamento" {...register("nome")} />
              {errors.nome && <p className="text-red-500 text-xs">Nome obrigatório</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Status *</Label>
              <Select value={statusValue} onValueChange={(v) => setValue("status", v as FormData["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Avanço Físico (%)</Label>
              <Input type="number" min={0} max={100} placeholder="0" {...register("percentual")} />
            </div>
            <div className="space-y-1.5">
              <Label>Ordem</Label>
              <Input type="number" min={0} placeholder="0" {...register("ordem")} />
            </div>
            <div className="space-y-1.5">
              <Label>Valor Previsto (R$)</Label>
              <Input type="number" step="0.01" placeholder="0,00" {...register("valorPrevisto")} />
            </div>
            <div className="space-y-1.5">
              <Label>Início Previsto</Label>
              <Input type="date" {...register("dataInicioPrev")} />
            </div>
            <div className="space-y-1.5">
              <Label>Fim Previsto</Label>
              <Input type="date" {...register("dataFimPrev")} />
            </div>
            <div className="space-y-1.5">
              <Label>Início Real</Label>
              <Input type="date" {...register("dataInicioReal")} />
            </div>
            <div className="space-y-1.5">
              <Label>Fim Real</Label>
              <Input type="date" {...register("dataFimReal")} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Observações</Label>
              <Input placeholder="Notas sobre esta etapa..." {...register("observacoes")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {isEditing ? "Salvar" : "Criar Etapa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
