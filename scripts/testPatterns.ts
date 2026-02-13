import { detectCouplePatterns } from "@/lib/patternDetection";

async function main() {
  const coupleId = process.argv[2];
  if (!coupleId) throw new Error("Pass coupleId: node scripts/testPatterns.ts <coupleId>");
  const res = await detectCouplePatterns({ coupleId, windowDays: 28 });
  console.dir(res, { depth: null });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
