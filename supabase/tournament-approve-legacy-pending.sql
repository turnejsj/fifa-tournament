-- Run once if you previously used admin approval and have rows stuck in `pending`.
update public.matches
set
  status = 'approved',
  approved_at = coalesce(approved_at, now()),
  reviewed_by = coalesce(reviewed_by, submitted_by)
where status = 'pending';
