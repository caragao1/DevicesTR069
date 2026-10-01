// Roda `prisma migrate deploy` antes do build — exceto nos deploys de Preview
// do Vercel. Lá o DIRECT_URL (só usado por migrações) não existe, e o
// DATABASE_URL do Preview aponta para o mesmo banco da produção: migrar a
// partir de um branch ainda não mergeado alteraria o banco de produção.
import { spawnSync } from "node:child_process";

if (process.env.VERCEL_ENV === "preview") {
  console.log("Deploy de Preview: pulando `prisma migrate deploy` (as migrações rodam no deploy de produção).");
  process.exit(0);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit" });
process.exit(result.status ?? 1);
