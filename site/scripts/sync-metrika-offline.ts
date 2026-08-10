import "dotenv/config";
import { syncMetrikaOfflineConversions } from "../src/lib/metrika-offline-sync";

async function main() {
  const result = await syncMetrikaOfflineConversions();
  console.info("Metrika offline sync finished", result);
}

main().catch((error) => {
  console.error(
    "Metrika offline sync failed",
    error instanceof Error ? error.message : "unknown_error",
  );
  process.exitCode = 1;
});
