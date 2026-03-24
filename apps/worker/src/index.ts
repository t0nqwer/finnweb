import { APP_NAME } from "@finnweb/shared/constants";

async function main() {
  console.log(`[${APP_NAME}] worker started`);
  setInterval(() => {
    console.log("[worker] heartbeat", new Date().toISOString());
  }, 5000);
}

main().catch((error) => {
  console.error("[worker] fatal error", error);
  process.exit(1);
});
