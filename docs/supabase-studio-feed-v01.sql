-- Rob White Studio Platform — Studio Feed v0.1
-- Apply after docs/supabase-schema.sql and docs/supabase-journal-v01.sql.
-- This migration creates no seed or historical activity rows.

create table if not exists public.studio_activities (
  id uuid primary key default gen_random_uuid(),
  activity_type text not null,
  title text not null,
  description text,
  object_type text not null,
  object_id uuid,
  object_label text,
  destination text,
  thumbnail_asset_id uuid references public.file_assets(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references public.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists studio_activities_created_at_idx
  on public.studio_activities(created_at desc);
create index if not exists studio_activities_type_created_idx
  on public.studio_activities(activity_type, created_at desc);
create index if not exists studio_activities_object_idx
  on public.studio_activities(object_type, object_id);
create index if not exists studio_activities_created_by_idx
  on public.studio_activities(created_by, created_at desc);
create index if not exists studio_activities_metadata_idx
  on public.studio_activities using gin(metadata);

alter table public.studio_activities enable row level security;

revoke all on public.studio_activities from anon;
grant select on public.studio_activities to authenticated;

drop policy if exists "Users can read their own Studio activity" on public.studio_activities;
create policy "Users can read their own Studio activity"
on public.studio_activities for select
to authenticated
using (created_by = auth.uid());

create or replace function public.record_journal_studio_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  activity_kind text;
  activity_title text;
  activity_description text;
  activity_metadata jsonb;
begin
  if tg_op = 'INSERT' then
    activity_kind := 'journal_created';
    activity_title := 'Journal entry created';
    activity_description := 'Captured a new ' || replace(new.entry_type, '_', ' ') || ' entry.';
    activity_metadata := jsonb_build_object(
      'entry_type', new.entry_type,
      'visibility', new.visibility,
      'tags', to_jsonb(new.tags)
    );
  else
    activity_kind := 'journal_updated';
    activity_title := 'Journal entry updated';
    activity_description := 'Updated this Journal entry.';

    if old.follow_up_needed and not new.follow_up_needed and new.follow_up_completed_at is not null then
      activity_kind := 'follow_up_completed';
      activity_title := 'Follow-up completed';
      activity_description := 'Marked the Journal follow-up complete.';
    elsif not old.follow_up_needed and new.follow_up_needed then
      activity_description := 'Marked this entry for follow-up.';
    elsif old.visibility is distinct from new.visibility then
      activity_description := 'Changed visibility to ' || initcap(new.visibility::text) || '.';
    elsif old.is_pinned is distinct from new.is_pinned then
      activity_description := case when new.is_pinned then 'Pinned this Journal entry.' else 'Unpinned this Journal entry.' end;
    elsif old.title is distinct from new.title then
      activity_description := 'Changed the Journal entry title.';
    elsif old.body is distinct from new.body then
      activity_description := 'Updated the entry notes.';
    elsif old.tags is distinct from new.tags then
      activity_description := 'Updated the entry tags.';
    end if;

    activity_metadata := jsonb_build_object(
      'entry_type', new.entry_type,
      'visibility', new.visibility,
      'follow_up_needed', new.follow_up_needed,
      'is_pinned', new.is_pinned
    );
  end if;

  insert into public.studio_activities (
    activity_type, title, description, object_type, object_id, object_label,
    destination, created_by, metadata
  ) values (
    activity_kind, activity_title, activity_description, 'journal_entry', new.id,
    new.title, '/studio/journal/entry?id=' || new.id::text, auth.uid(), activity_metadata
  );
  return new;
end;
$$;

drop trigger if exists record_journal_studio_activity on public.journal_entries;
create trigger record_journal_studio_activity
after insert or update on public.journal_entries
for each row execute function public.record_journal_studio_activity();

create or replace function public.record_journal_photo_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  journal_title text;
  actor_id uuid;
  recent_activity_id uuid;
  photo_count integer;
begin
  if new.journal_entry_id is null then
    return new;
  end if;

  select title into journal_title
  from public.journal_entries
  where id = new.journal_entry_id;

  actor_id := coalesce(new.uploaded_by, auth.uid());

  select id, coalesce((metadata ->> 'photo_count')::integer, 1)
  into recent_activity_id, photo_count
  from public.studio_activities
  where activity_type = 'photo_added'
    and object_type = 'journal_entry'
    and object_id = new.journal_entry_id
    and created_by is not distinct from actor_id
    and created_at > now() - interval '2 minutes'
  order by created_at desc
  limit 1;

  if recent_activity_id is not null then
    photo_count := photo_count + 1;
    update public.studio_activities
    set
      title = 'Photos added',
      description = 'Added ' || photo_count::text || ' photographs.',
      metadata = metadata || jsonb_build_object('photo_count', photo_count)
    where id = recent_activity_id;
    return new;
  end if;

  insert into public.studio_activities (
    activity_type, title, description, object_type, object_id, object_label,
    destination, thumbnail_asset_id, created_by, metadata
  ) values (
    'photo_added',
    'Photo added',
    coalesce(nullif(new.caption, ''), 'Added a photograph to this Journal entry.'),
    'journal_entry',
    new.journal_entry_id,
    coalesce(journal_title, 'Journal entry'),
    '/studio/journal/entry?id=' || new.journal_entry_id::text,
    new.id,
    actor_id,
    jsonb_build_object('file_name', new.file_name, 'mime_type', new.mime_type, 'photo_count', 1)
  );
  return new;
end;
$$;

drop trigger if exists record_journal_photo_activity on public.file_assets;
create trigger record_journal_photo_activity
after insert on public.file_assets
for each row
when (new.journal_entry_id is not null)
execute function public.record_journal_photo_activity();

create or replace function public.remove_deleted_object_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.studio_activities
  where object_type = 'journal_entry' and object_id = old.id;
  return old;
end;
$$;

drop trigger if exists remove_deleted_journal_activity on public.journal_entries;
create trigger remove_deleted_journal_activity
before delete on public.journal_entries
for each row execute function public.remove_deleted_object_activity();
