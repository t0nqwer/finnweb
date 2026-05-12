async function main() {
  console.log("Prisma seed is disabled. No database writes were performed.");
}

main().catch((error) => {
  console.error("Seed no-op failed:", error);
  process.exit(1);
});
