import type { ArtworkCatalog } from "../lib/catalogs";
import { requireStudioUser, setupStudioSignOut, showStudioError } from "./supabase-client";

const form = document.querySelector<HTMLFormElement>("[data-catalog-form]");
const submit = form?.querySelector<HTMLButtonElement>("[data-submit]");
const mode = form?.dataset.mode || "new";

function textValue(data: FormData, name: string): string | null {
  return String(data.get(name) || "").trim() || null;
}

function fill(catalog: ArtworkCatalog): void {
  if (!form) return;
  Object.entries(catalog).forEach(([name, raw]) => {
    const field = form.elements.namedItem(name);
    if (field instanceof HTMLInputElement && field.type === "checkbox") field.checked = Boolean(raw);
    else if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) field.value = raw == null ? "" : String(raw);
  });
}

async function init(): Promise<void> {
  setupStudioSignOut();
  if (!form || !submit) return;
  try {
    const { client, user } = await requireStudioUser();
    const id = new URLSearchParams(location.search).get("id");
    if (mode === "edit") {
      if (!id) throw new Error("No catalog was selected.");
      const { data, error } = await client.from("artwork_catalogs").select("*").eq("id", id).single();
      if (error) throw error;
      fill(data as ArtworkCatalog);
      document.querySelectorAll<HTMLAnchorElement>("[data-catalog-cancel]").forEach((link) => {
        link.href = `/studio/artwork/catalogs/entry?id=${encodeURIComponent(id)}`;
      });
    }
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      submit.disabled = true;
      submit.textContent = mode === "edit" ? "Updating…" : "Creating…";
      try {
        const data = new FormData(form);
        const record = {
          owner_id: user.id,
          internal_name: textValue(data, "internal_name"),
          public_title: textValue(data, "public_title"),
          subtitle: textValue(data, "subtitle"),
          recipient_name: textValue(data, "recipient_name"),
          intro_text: textValue(data, "intro_text"),
          display_date: textValue(data, "display_date"),
          notes_private: textValue(data, "notes_private"),
          layout_preset: textValue(data, "layout_preset") || "compact_grid",
          pricing_mode: textValue(data, "pricing_mode") || "snapshot",
          show_header: data.get("show_header") === "on"
        };
        if (!record.internal_name || !record.public_title) throw new Error("Internal name and public title are required.");
        let catalogId = id;
        if (id) {
          const { error } = await client.from("artwork_catalogs").update(record).eq("id", id);
          if (error) throw error;
        } else {
          const { data: created, error } = await client.from("artwork_catalogs").insert(record).select("id").single();
          if (error) throw error;
          catalogId = String(created.id);
        }
        location.assign(`/studio/artwork/catalogs/entry?id=${encodeURIComponent(catalogId || "")}`);
      } catch (error) {
        showStudioError(error);
        submit.disabled = false;
        submit.textContent = mode === "edit" ? "Update Catalog" : "Create Catalog";
      }
    });
  } catch (error) {
    if (!(error instanceof Error && error.message === "Authentication required")) showStudioError(error);
  }
}

void init();

