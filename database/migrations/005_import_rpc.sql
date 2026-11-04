-- ============================================================
-- SeatWise — Migration 005: atomic timetable import RPC
-- Replaces all timetable entries for the affected batches and inserts
-- the parsed entries in one transaction; also upserts catalogue data.
-- ============================================================

create or replace function public.import_timetable_data(
  p_batches jsonb,      -- [{program, semester, section, class_teacher}]
  p_subjects jsonb,     -- [{name, abbreviation, codes: []}]
  p_faculty jsonb,      -- [{full_name}]
  p_rooms jsonb,        -- [{name, room_type, seating_capacity}]
  p_entries jsonb       -- [{program, semester, section, day, period_start, period_end,
                        --    slot_type, subject_label, subject_code, room_name, is_multi_period}]
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_batch_count int := 0;
  v_subject_count int := 0;
  v_faculty_count int := 0;
  v_room_count int := 0;
  v_entry_count int := 0;
  v_program_id uuid;
  v_batch_id uuid;
  v_subject_id uuid;
  v_subject_label text;
  v_subject_abbrev text;
  v_code text;
  v_room_id uuid;
  v_entry jsonb;
  v_batch_row jsonb;
  v_subject_row jsonb;
  v_slot_type slot_type;
begin
  -- ---------- Programs & batches ----------
  for v_batch_row in select * from jsonb_array_elements(p_batches) loop
    insert into public.programs (code, name)
    values (v_batch_row->>'program', v_batch_row->>'program')
    on conflict (code) do update set updated_at = now()
    returning id into v_program_id;

    insert into public.batches (program_id, semester, section, class_teacher)
    values (
      v_program_id,
      (v_batch_row->>'semester')::int,
      v_batch_row->>'section',
      nullif(v_batch_row->>'class_teacher', '')
    )
    on conflict (program_id, semester, section)
    do update set class_teacher = excluded.class_teacher, updated_at = now()
    returning id into v_batch_id;

    v_batch_count := v_batch_count + 1;
  end loop;

  -- ---------- Subjects & their section codes ----------
  for v_subject_row in select * from jsonb_array_elements(p_subjects) loop
    v_subject_label := v_subject_row->>'name';
    v_subject_abbrev := coalesce(nullif(v_subject_row->>'abbreviation', ''), left(v_subject_label, 12));

    insert into public.subjects (name, abbreviation)
    values (v_subject_label, v_subject_abbrev)
    on conflict (name, abbreviation) do update set updated_at = now()
    returning id into v_subject_id;

    for v_code in select jsonb_array_elements_text(coalesce(v_subject_row->'codes', '[]'::jsonb)) loop
      insert into public.subject_codes (subject_id, code)
      values (v_subject_id, v_code)
      on conflict (code) do update set subject_id = excluded.subject_id;
    end loop;
    v_subject_count := v_subject_count + 1;
  end loop;

  -- ---------- Faculty ----------
  insert into public.faculty (full_name, faculty_code)
  select f->>'full_name', 'FAC-' || md5(f->>'full_name')
  from jsonb_array_elements(p_faculty) f
  on conflict (faculty_code) do update set full_name = excluded.full_name;
  get diagnostics v_faculty_count = row_count;

  -- ---------- Rooms (catalogue only; NOT exam approved) ----------
  insert into public.rooms (code, name, room_type)
  select r->>'name', r->>'name',
    case when r->>'room_type' = 'lab' then 'lab'::room_type else 'classroom'::room_type end
  from jsonb_array_elements(p_rooms) r
  on conflict (code) do update set room_type = excluded.room_type, updated_at = now();
  get diagnostics v_room_count = row_count;

  -- ---------- Timetable entries (replace for affected batches) ----------
  delete from public.timetable_entries t
  using public.batches b, public.programs p
  where t.batch_id = b.id and b.program_id = p.id
    and (p.code, b.semester, b.section) in (
      select e->>'program', (e->>'semester')::int, e->>'section'
      from jsonb_array_elements(p_entries) e
    );

  for v_entry in select * from jsonb_array_elements(p_entries) loop
    select b.id into v_batch_id
    from public.batches b join public.programs p on p.id = b.program_id
    where p.code = v_entry->>'program'
      and b.semester = (v_entry->>'semester')::int
      and b.section = v_entry->>'section'
    limit 1;
    if v_batch_id is null then
      continue; -- batch missing; should not happen (parser validates)
    end if;

    v_slot_type := (v_entry->>'slot_type')::slot_type;

    insert into public.timetable_entries (
      batch_id, day, period_start, period_end, slot_type,
      subject_label, subject_code, subject_id, faculty_id, faculty_name,
      room_id, room_name, is_multi_period, source
    )
    values (
      v_batch_id,
      v_entry->>'day',
      (v_entry->>'period_start')::int,
      (v_entry->>'period_end')::int,
      v_slot_type,
      coalesce(v_entry->>'subject_label', ''),
      nullif(v_entry->>'subject_code', ''),
      (select sc.subject_id from public.subject_codes sc
        where sc.code = nullif(v_entry->>'subject_code', '') limit 1),
      (select f.id from public.faculty f
        where f.full_name = nullif(v_entry->>'faculty_name', '') limit 1),
      nullif(v_entry->>'faculty_name', ''),
      (select id from public.rooms where code = v_entry->>'room_name' limit 1),
      nullif(v_entry->>'room_name', ''),
      coalesce((v_entry->>'is_multi_period')::boolean, false),
      'timetable_import'
    )
    on conflict (batch_id, day, period_start) do update set
      period_end = excluded.period_end,
      slot_type = excluded.slot_type,
      subject_label = excluded.subject_label,
      subject_code = excluded.subject_code,
      subject_id = excluded.subject_id,
      room_id = excluded.room_id,
      room_name = excluded.room_name,
      is_multi_period = excluded.is_multi_period,
      updated_at = now();

    v_entry_count := v_entry_count + 1;
  end loop;

  return jsonb_build_object(
    'batches', v_batch_count,
    'subjects', v_subject_count,
    'faculty', v_faculty_count,
    'rooms', v_room_count,
    'entries', v_entry_count
  );
end;
$$;
