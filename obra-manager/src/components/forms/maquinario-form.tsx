"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { TooltipIcon } from "@/components/ui/tooltip";

const schema = z.object({
  nome: z.string().min(2),
  tipo: z.string().min(2),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  status: z.enum(["PROPRIO", "LOCADO"]),
  locadoraNome: z.string().optional(),
  locadoraContato: z.string().optional(),
  dataVencimentoLocacao: z.string().optional(),
  valorLocacao: z.string().optional(),
  periodicidadeLocacao: z.enum(["DIARIO", "SEMANAL", "QUINZENAL", "MENSAL"]).optional(),
  observacoes: z.string().optional(),
  obraId: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

interface MaquinarioFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<FormData> & { id?: string };
}

export function MaquinarioFormDialog({ open, onClose, onSuccess, initialData }: MaquinarioFormDialogProps) {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingObras, setLoadingObras] = useState(false);
  const [obras, setObras] = useState<{ id: string; nome: string }[]>([]);
  const [contratoFile, setContratoFile] = useState<File | null>(null);
  const isEditing = !!initialData?.id;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "PROPRIO", ...initialData },
  });

  const statusValue = watch("status");

  useEffect(() => {
    if (open) {
      reset({ status: "PROPRIO", ...initialData });
      setLoadingObras(true);
      apiFetch<{ data: { data: { id: string; nome: string }[] } }>("/api/obras", { params: { pageSize: 100 } })
        .then((res) => setObras(res.data.data))
        .catch(() => {})
        .finally(() => setLoadingObras(false));
    }
  }, [open]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const endpoint = isEditing ? `/api/maquinarios/${initialData!.id}` : "/api/maquinarios";
      const method = isEditing ? "PUT" : "POST";

      if (contratoFile) {
        const formData = new FormData();
        Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== null) formData.append(k, String(v)); });
        formData.append("contrato", contratoFile);
        await apiFetch(endpoint, { method, body: formData });
      } else {
        const body = { ...data, valorLocacao: data.valorLocacao ? Number(data.valorLocacao) : undefined };
        await apiFetch(endpoint, { method, body });
      }
      toast({ title: isEditing ? "Equipamento atualizado!" : "Equipamento cadastrado!", variant: "success" });
      onSuccess();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message, variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Equipamento" : "Cadastrar Equipamento"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Nome do equipamento" {...register("nome")} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Input placeholder="Ex: Betoneira, Escavadeira" {...register("tipo")} />
            </div>
            <div className="space-y-1.5">
              <Label>Marca</Label>
              <Input placeholder="Caterpillar, CSM..." {...register("marca")} />
            </div>
            <div className="space-y-1.5">
              <Label>Modelo</Label>
              <Input placeholder="Ex: 320D" {...register("modelo")} />
            </div>
            <div className="space-y-1.5">
              <Label>Status *</Label>
              <Select value={statusValue} onValueChange={(v) => setValue("status", v as "PROPRIO" | "LOCADO")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROPRIO">Próprio</SelectItem>
                  <SelectItem value="LOCADO">Locado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {statusValue === "LOCADO" && (
              <>
                <div className="space-y-1.5">
                  <Label>Nome da Locadora</Label>
                  <Input placeholder="Empresa locadora" {...register("locadoraNome")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Contato da Locadora</Label>
                  <Input placeholder="(11) 9000-0000" {...register("locadoraContato")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Vencimento da Locação</Label>
                  <Input type="date" {...register("dataVencimentoLocacao")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Valor da Locação (R$)</Label>
                  <Input type="number" step="0.01" placeholder="0,00" {...register("valorLocacao")} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label>Periodicidade</Label>
                    <TooltipIcon text="Com que frequência o valor de locação é cobrado: Diária (por dia de uso), Semanal (por semana) ou Mensal (por mês corrido)." />
                  </div>
                  <Select value={watch("periodicidadeLocacao")} onValueChange={(v) => setValue("periodicidadeLocacao", v as FormData["periodicidadeLocacao"])}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DIARIO">Diária</SelectItem>
                      <SelectItem value="SEMANAL">Semanal</SelectItem>
                      <SelectItem value="MENSAL">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Contrato (PDF/Imagem)</Label>
                  <label className="flex items-center gap-2 border border-dashed border-[var(--border)] rounded-md p-3 cursor-pointer hover:bg-[var(--secondary)] transition-colors">
                    <Upload className="w-4 h-4 text-[var(--muted-foreground)]" />
                    <span className="text-sm text-[var(--muted-foreground)]">
                      {contratoFile ? contratoFile.name : "Clique para selecionar"}
                    </span>
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setContratoFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </>
            )}

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

            <div className="col-span-2 space-y-1.5">
              <Label>Observações</Label>
              <Input placeholder="Notas adicionais..." {...register("observacoes")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
