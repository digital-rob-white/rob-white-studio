import type { SupabaseClient } from "@supabase/supabase-js";

type RpcClient = Pick<SupabaseClient, "rpc">;

export async function duplicateArtworkCatalog(client: RpcClient, sourceCatalogId: string): Promise<string> {
  if (!sourceCatalogId) throw new Error("No catalog was selected.");

  const { data, error } = await client.rpc("duplicate_artwork_catalog", {
    source_catalog_id: sourceCatalogId
  });

  if (error) throw error;
  if (typeof data !== "string" || !data) throw new Error("The duplicate catalog could not be opened.");
  return data;
}
