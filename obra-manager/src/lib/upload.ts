import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE) || 10485760;

const ALLOWED_TYPES = {
  image: ["image/jpeg", "image/png", "image/webp"],
  document: ["application/pdf", "image/jpeg", "image/png", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

export async function saveUploadedFile(
  file: File,
  subfolder: string,
  allowedCategory: keyof typeof ALLOWED_TYPES = "document"
): Promise<{ path: string; name: string; size: number; type: string }> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const allowed = ALLOWED_TYPES[allowedCategory];
  if (!allowed.includes(file.type)) {
    throw new Error(`Tipo de arquivo não permitido: ${file.type}`);
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const safeExt = ext.replace(/[^a-z0-9]/g, "");
  const filename = `${uuidv4()}.${safeExt}`;
  const dir = path.join(UPLOAD_DIR, subfolder);

  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  const filepath = path.join(dir, filename);
  const bytes = await file.arrayBuffer();
  await writeFile(filepath, Buffer.from(bytes));

  return {
    path: `/uploads/${subfolder}/${filename}`,
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

export function getAbsolutePath(relativePath: string): string {
  return path.join(process.cwd(), relativePath.replace(/^\//, ""));
}
