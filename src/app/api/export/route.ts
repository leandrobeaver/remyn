import { exportAll } from "@/lib/queries";

export const dynamic = "force-dynamic";

export function GET(): Response {
  const dump = exportAll();
  return new Response(JSON.stringify(dump, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="remyn-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
