import { describe, expect, it } from "vitest";
import { artworkPublicUrl, publicDimensions, publicationReady, slugifyArtwork } from "./public-artwork";

describe("Artwork website publishing", () => {
  it("creates stable URL-safe slugs without punctuation or accents", () => {
    expect(slugifyArtwork("Dos Cimas de Montaña")).toBe("dos-cimas-de-montana");
    expect(artworkPublicUrl("sisyphus-one")).toBe("/artwork/sisyphus-one/");
  });

  it("formats public dimensions height by width by depth", () => {
    expect(publicDimensions({ height: 46.5, width: 35, depth: 2, dimension_unit: "in" }))
      .toBe("46 1/2 × 35 × 2 in");
  });

  it("blocks publishing until the minimum public page is complete", () => {
    const publication = {
      public_title: "Sisyphus One",
      slug: "sisyphus-one"
    } as never;
    expect(publicationReady(publication, 1)).toEqual([]);
    expect(publicationReady({ ...publication, slug: null }, 0)).toEqual([
      "URL slug",
      "at least one public image"
    ]);
  });
});
