import cron from "node-cron";
import { verificarEGerarAlertas } from "./alertas";

let cronStarted = false;

export function startCronJobs() {
  if (cronStarted) return;
  cronStarted = true;

  // Executa todo dia às 7h
  cron.schedule("0 7 * * *", async () => {
    console.log("[CRON] Verificando alertas...", new Date().toISOString());
    try {
      await verificarEGerarAlertas();
      console.log("[CRON] Alertas verificados com sucesso");
    } catch (err) {
      console.error("[CRON] Erro ao verificar alertas:", err);
    }
  });

  console.log("[CRON] Jobs agendados iniciados");
}
