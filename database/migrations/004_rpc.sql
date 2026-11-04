-- ============================================================
-- SeatWise — Migration 004: transactional seating-plan persistence
-- PostgREST cannot run multi-table transactions; these RPC functions
-- guarantee a seating plan and its assignments are written atomically.
-- ============================================================

-- Save a NEW seating plan with its assignments atomically.
-- plan jsonb: {kind, examination_id?, batch_id?, room_id?, timetable_entry_id?,
--              plan_date?, period?, status, validation_status, validation_report,
--              solver_name?, solve_seconds?, created_by?}
-- assignments jsonb: [{student_id, room_id, row, col, seat_label}]
create or replace function public.save_seating_plan(p_plan jsonb, p_assignments jsonb)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_plan_id uuid;
  v_seat_id uuid;
  v_assignment jsonb;
  v_room_id uuid;
  v_row int;
  v_col int;
  v_label text;
begin
  -- Sanity: assignments must not exceed one per seat or per student; the
  -- unique constraints below are the hard guarantee, this check gives a
  -- clearer error message.
  if (select count(*) from (select student_id from jsonb_array_elements(p_assignments) a group by 1 having count(*) > 1) d) > 0 then
    raise exception 'duplicate student in assignments';
  end if;
  if (select count(*) from (
        select a->>'room_id' as room_id, (a->>'row')::int as row, (a->>'col')::int as col
        from jsonb_array_elements(p_assignments) a group by 1, 2, 3 having count(*) > 1) d) > 0 then
    raise exception 'duplicate seat in assignments';
  end if;

  insert into public.seating_plans (
    kind, examination_id, batch_id, room_id, timetable_entry_id, plan_date, period,
    status, validation_status, validation_report, solver_name, solve_seconds, generated_at, created_by
  ) values (
    (p_plan->>'kind')::plan_kind,
    (p_plan->>'examination_id')::uuid,
    (p_plan->>'batch_id')::uuid,
    (p_plan->>'room_id')::uuid,
    (p_plan->>'timetable_entry_id')::uuid,
    (p_plan->>'plan_date')::date,
    (p_plan->>'period')::int,
    coalesce((p_plan->>'status')::plan_status, 'draft'),
    coalesce((p_plan->>'validation_status')::validation_status, 'pending'),
    coalesce(p_plan->'validation_report', '{}'::jsonb),
    p_plan->>'solver_name',
    (p_plan->>'solve_seconds')::numeric,
    now(),
    (p_plan->>'created_by')::uuid
  )
  returning id into v_plan_id;

  for v_assignment in select * from jsonb_array_elements(p_assignments) loop
    v_room_id := (v_assignment->>'room_id')::uuid;
    v_row := (v_assignment->>'row')::int;
    v_col := (v_assignment->>'col')::int;
    v_label := coalesce(v_assignment->>'seat_label', '');

    select id into v_seat_id from public.room_seats
    where room_id = v_room_id and row = v_row and col = v_col
    limit 1;

    insert into public.seat_assignments (seating_plan_id, student_id, room_id, seat_id, row, col, seat_label)
    values (v_plan_id, (v_assignment->>'student_id')::uuid, v_room_id, v_seat_id, v_row, v_col, v_label);
  end loop;

  return v_plan_id;
end;
$$;

-- Replace the assignments of an EXISTING draft plan atomically (manual adjustments).
create or replace function public.replace_seating_plan_assignments(
  p_plan_id uuid,
  p_assignments jsonb
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if (select status from public.seating_plans where id = p_plan_id) = 'published' then
    raise exception 'cannot modify a published seating plan';
  end if;

  delete from public.seat_assignments where seating_plan_id = p_plan_id;

  insert into public.seat_assignments (seating_plan_id, student_id, room_id, seat_id, row, col, seat_label)
  select
    p_plan_id,
    (a->>'student_id')::uuid,
    (a->>'room_id')::uuid,
    rs.id,
    (a->>'row')::int,
    (a->>'col')::int,
    coalesce(a->>'seat_label', '')
  from jsonb_array_elements(p_assignments) a
  left join public.room_seats rs
    on rs.room_id = (a->>'room_id')::uuid
   and rs.row = (a->>'row')::int
   and rs.col = (a->>'col')::int;
end;
$$;

-- Ensure a room's seat grid exists in room_seats (rebuild keeps blocked flags
-- by coordinate when dimensions are unchanged).
create or replace function public.ensure_room_seats(p_room_id uuid, p_rows int, p_cols int)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_old_rows int;
  v_old_cols int;
begin
  select rows, columns into v_old_rows, v_old_cols from public.rooms where id = p_room_id;

  if v_old_rows = p_rows and v_old_cols = p_cols then
    -- Fill any missing cells (keeps existing blocked flags).
    insert into public.room_seats (room_id, row, col, seat_label, is_blocked)
    select p_room_id, r, c,
           chr(65 + (r % 26)) || (c + 1)::text,
           false
    from generate_series(0, p_rows - 1) r
    cross join generate_series(0, p_cols - 1) c
    on conflict (room_id, row, col) do nothing;
    return;
  end if;

  -- Dimensions changed: rebuild the grid from scratch.
  delete from public.room_seats where room_id = p_room_id;
  insert into public.room_seats (room_id, row, col, seat_label, is_blocked)
  select p_room_id, r, c,
         chr(65 + (r % 26)) || (c + 1)::text,
         false
  from generate_series(0, p_rows - 1) r
  cross join generate_series(0, p_cols - 1) c;
end;
$$;
