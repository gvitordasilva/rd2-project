"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";

const schema = z.object({
  nome: z.string().min(3),
  cpf: z.string().min(11),
  cargo: z.string().min(2),
  tipo: z.enum(["CLT", "PJ", "DIARIA", "EMPREITEIRO"]),
  valorPagamento: z.string().min(1),
  periodicidade: z.enum(["DIARIO", "SEMANAL", "QUINZENAL", "MENSAL"]),
  contato: z.string().optional(),
  dataAdmissao: z.string().min(1),
  status: z.enum(["ATIVO", "INATIVO", "AFASTADO"]),
  obraId: z.string().min(1, "Obra obrigatória"),
  dadosBancarios: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Obra { id: string; nome: string; }
interface Cargo { id: string; nome: string; }

interface FuncionarioFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<FormData> & { id?: string };
}

export function FuncionarioFormDialog({ open, onClose, onSuccess, initialData }: FuncionarioFormDialogProps) {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [obras, setObras] = useState<Obra[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [cargoInput, setCargoInput] = useState("");
  const [showCargoDropdown, setShowCargoDropdown] = useState(false);
  const isEditing = !!initialData?.id;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: "CLT", periodicidade: "MENSAL", status: "ATIVO", ...initialData },
  });

  const watchedCargo = watch("cargo");

  useEffect(() => {
    if (open) {
      reset({ tipo: "CLT", periodicidade: "MENSAL", status: "ATIVO", ...initialData });
      setCargoInput(initialData?.cargo || "");
      Promise.all([
        apiFetch<{ data: { data: Obra[] } }>("/api/obras", { params: { pageSize: 100 } }),
        apiFetch<{ data: Cargo[] }>("/api/cargos"),
      ])
        .then(([obrasRes, cargosRes]) => {
          setObras(obrasRes.data.data);
          setCargos(cargosRes.data);
        })
        .catch(() => {});
    }
  }, [open]);

  const filteredCargos = cargos.filter((c) =>
    c.nome.toLowerCase().includes(cargoInput.toLowerCase())
  );

  const selectCargo = (nome: string) => {
    setValue("cargo", nome);
    setCargoInput(nome);
    setShowCargoDropdown(false);
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const body = { ...data, valorPagamento: Number(data.valorPagamento) };
      if (isEditing) {
        await apiFetch(`/api/funcionarios/${initialData!.id}`, { method: "PUT", body });
        toast({ title: "Funcionário atualizado!", variant: "success" });
      } else {
        await apiFetch("/api/funcionarios", { method: "POST", body });
        toast({ title: "Funcionário cadastrado!", variant: "success" });
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
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Funcionário" : "Cadastrar Funcionário"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Nome completo" {...register("nome")} />
              {errors.nome && <p className="text-red-500 text-xs">Nome obrigatório</p>}
            </div>
            <div className="space-y-1.5">
              <Label>CPF *</Label>
              <Input placeholder="000.000.000-00" {...register("cpf")} />
            </div>

            {/* Cargo — combobox com cargos cadastrados */}
            <div className="space-y-1.5 relative">
              <div className="flex items-center justify-between">
                <Label>Cargo *</Label>
                {cargos.length === 0 && (
                  <a href="/cargos" target="_blank" className="text-xs text-[var(--primary)] hover:underline flex items-center gap-0.5">
                    <Plus className="w-3 h-3" /> Cadastrar cargos
                  </a>
                )}
              </div>
              <Input
                placeholder={cargos.length > 0 ? "Selecionar ou digitar cargo..." : "Digite o cargo..."}
                value={cargoInput}
                autoComplete="off"
                {...register("cargo")}
                onChange={(e) => {
                  setCargoInput(e.target.value);
                  setValue("cargo", e.target.value);
                  setShowCargoDropdown(true);
                }}
                onFocus={() => setShowCargoDropdown(true)}
                onBlur={() => setTimeout(() => setShowCargoDropdown(false), 150)}
              />
              {showCargoDropdown && filteredCargos.length > 0 && (
                <div className="absolute z-50 top-full mt-1 w-full bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden">
                  {filteredCargos.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--secondary)] transition-colors"
                      onMouseDown={() => selectCargo(c.nome)}
                    >
                      {c.nome}
                    </button>
                  ))}
                </div>
              )}
              {errors.cargo && <p className="text-red-500 text-xs">Cargo obrigatório</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select value={watch("tipo")} onValueChange={(v) => setValue("tipo", v as FormData["tipo"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLT">CLT</SelectItem>
                  <SelectItem value="PJ">PJ</SelectItem>
                  <SelectItem value="DIARIA">Diária</SelectItem>
                  <SelectItem value="EMPREITEIRO">Empreiteiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Periodicidade *</Label>
              <Select value={watch("periodicidade")} onValueChange={(v) => setValue("periodicidade", v as FormData["periodicidade"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIARIO">Diário</SelectItem>
                  <SelectItem value="SEMANAL">Semanal</SelectItem>
                  <SelectItem value="QUINZENAL">Quinzenal</SelectItem>
                  <SelectItem value="MENSAL">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Valor (R$) *</Label>
              <Input type="number" step="0.01" placeholder="0,00" {...register("valorPagamento")} />
            </div>
            <div className="space-y-1.5">
              <Label>Data de Admissão *</Label>
              <Input type="date" {...register("dataAdmissao")} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v as FormData["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATIVO">Ativo</SelectItem>
                  <SelectItem value="INATIVO">Inativo</SelectItem>
                  <SelectItem value="AFASTADO">Afastado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Contato</Label>
              <Input placeholder="(00) 00000-0000" {...register("contato")} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Obra *</Label>
              <Select value={watch("obraId")} onValueChange={(v) => setValue("obraId", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar obra" /></SelectTrigger>
                <SelectContent>
                  {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.obraId && <p className="text-red-500 text-xs">Obra obrigatória</p>}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Dados Bancários</Label>
              <Input placeholder="Banco, agência, conta..." {...register("dadosBancarios")} />
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
