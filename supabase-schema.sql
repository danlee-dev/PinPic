-- Photos table
create table if not exists photos (
  id uuid default gen_random_uuid() primary key,
  image_url text not null,
  nickname text not null,
  club text,
  school text not null check (school in ('yonsei', 'korea')),
  aspect_ratio float not null default 1.25,
  created_at timestamptz default now()
);

-- Votes table (one vote per visitor per photo, tracked by anonymous fingerprint)
create table if not exists votes (
  id uuid default gen_random_uuid() primary key,
  photo_id uuid references photos(id) on delete cascade not null,
  voter_id text not null,
  created_at timestamptz default now(),
  unique(photo_id, voter_id)
);

-- View: photos with vote count
create or replace view photos_with_votes as
select
  p.*,
  coalesce(v.vote_count, 0)::int as votes
from photos p
left join (
  select photo_id, count(*) as vote_count
  from votes
  group by photo_id
) v on v.photo_id = p.id
order by p.created_at desc;

-- RLS policies
alter table photos enable row level security;
alter table votes enable row level security;

-- Anyone can read photos
create policy "Photos are viewable by everyone"
  on photos for select
  using (true);

-- Anyone can read votes
create policy "Votes are viewable by everyone"
  on votes for select
  using (true);

-- Anyone can insert votes
create policy "Anyone can vote"
  on votes for insert
  with check (true);

-- Index for faster vote counting
create index if not exists idx_votes_photo_id on votes(photo_id);
create index if not exists idx_votes_voter_id on votes(voter_id);
