create table if not exists blogs_blogs (
	id uuid primary key default gen_random_uuid(),
	title varchar(256) not null,
	content text not null,
	published boolean default false,
	created_at timestamptz not null default now(),
	published_at timestamptz
);

alter table if exists blogs_blogs add column if not exists image_url varchar(4096);
