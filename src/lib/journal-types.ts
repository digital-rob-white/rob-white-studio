export type FileAsset = {
  id: string;
  bucket: string;
  path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  alt_text: string | null;
  caption: string | null;
  visibility: "public" | "internal";
  journal_entry_id: string | null;
  created_at: string;
};

export type JournalEntry = {
  id: string;
  title: string;
  body: string;
  entry_type: string;
  visibility: "internal" | "public" | "unlisted";
  tags: string[];
  materials_list: string[];
  location: string | null;
  follow_up_needed: boolean;
  follow_up_completed_at: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  project_id: string | null;
  project_reference: string | null;
  artwork_id: string | null;
  artwork_reference: string | null;
  client_id: string | null;
  client_reference: string | null;
  collector_id: string | null;
  collector_reference: string | null;
  file_assets?: FileAsset[];
};
