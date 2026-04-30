"use client";
import { useEffect, useState } from "react";
import { FileText, Upload, Download, Trash2, Search, Loader2, ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatFileSize, formatRelativeDate } from "@/lib/utils";

interface Documento {
  id: string;
  nome: string;
  tipo: string;
  path: string;
  tamanho: number;
  createdAt: string;
  obra: { nome: string };
  user: { nome: string };
}

export default function DocumentosPage() {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: { data: Documento[] } }>("/api/documentos", {
        params: { search: search || undefined },
      });
      setDocumentos(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search]);

  const getFileIcon = (tipo: string) => {
    if (tipo.includes("image")) return <ImageIcon className="w-8 h-8 text-blue-500" />;
    return <FileText className="w-8 h-8 text-slate-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
          <Input placeholder="Buscar documentos..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => <div key={i} className="h-36 rounded-lg bg-[var(--secondary)] animate-pulse" />)}
        </div>
      ) : documentos.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 mx-auto text-[var(--muted-foreground)] mb-4" />
          <p className="text-[var(--muted-foreground)]">Nenhum documento encontrado</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Os documentos são salvos ao cadastrar funcionários, maquinário e transações</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {documentos.map((doc) => (
            <Card key={doc.id} className="p-4 space-y-3 group hover:shadow-md transition-shadow">
              <div className="flex justify-center py-2">
                {getFileIcon(doc.tipo)}
              </div>
              <div>
                <p className="text-xs font-medium truncate" title={doc.nome}>{doc.nome}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{formatFileSize(doc.tamanho)}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{doc.obra?.nome}</p>
              </div>
              <div className="flex gap-1">
                <a href={doc.path} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button size="sm" variant="outline" className="w-full text-xs h-7">
                    <Download className="w-3 h-3" />
                  </Button>
                </a>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">{formatRelativeDate(doc.createdAt)}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
