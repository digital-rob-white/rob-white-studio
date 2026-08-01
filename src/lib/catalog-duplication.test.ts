import { describe, expect, it, vi } from "vitest";
import { duplicateArtworkCatalog } from "./catalog-duplication";

describe("duplicateArtworkCatalog", () => {
  it("duplicates through the atomic database function", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "copy-id", error: null });

    await expect(duplicateArtworkCatalog({ rpc } as never, "source-id")).resolves.toBe("copy-id");
    expect(rpc).toHaveBeenCalledWith("duplicate_artwork_catalog", { source_catalog_id: "source-id" });
  });

  it("surfaces database errors", async () => {
    const failure = new Error("Copy failed");
    const rpc = vi.fn().mockResolvedValue({ data: null, error: failure });

    await expect(duplicateArtworkCatalog({ rpc } as never, "source-id")).rejects.toBe(failure);
  });

  it("requires a source catalog", async () => {
    const rpc = vi.fn();

    await expect(duplicateArtworkCatalog({ rpc } as never, "")).rejects.toThrow("No catalog was selected.");
    expect(rpc).not.toHaveBeenCalled();
  });
});
