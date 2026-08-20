alter table public.profiles
  drop constraint if exists profiles_legal_status_check;

alter table public.profiles
  add constraint profiles_legal_status_check
  check (
    legal_status in (
      'entreprise_individuelle',
      'sarl',
      'eurl',
      'sa',
      'sas',
      'sasu',
      'snc',
      'scs',
      'gie',
      'asbl'
    )
  );
