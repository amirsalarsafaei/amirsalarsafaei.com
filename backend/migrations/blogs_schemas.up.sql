create table if not exists blogs_blogs (
	id uuid primary key default gen_random_uuid(),
	title varchar(256) not null,
	content text not null,
	published boolean default false,
	created_at timestamptz not null default now(),
	published_at timestamptz
);

alter table if exists blogs_blogs add column if not exists image_url varchar(4096);

create table if not exists blogs_tags (
	id uuid primary key default gen_random_uuid(),
	name varchar(256) not null unique
);

create table if not exists blogs_blog_tags (
	blog_id uuid not null references blogs_blogs(id),
	tag_id uuid not null references blogs_tags(id),
    constraint blogs_blog_tags_uniq_tg unique (blog_id, tag_id)
);

create index if not exists blogs_blog_tags_blog_id_idx on blogs_blog_tags(blog_id);
create index if not exists blogs_blog_tags_tag_id_idx on blogs_blog_tags(tag_id);

create view blogs_blogs_with_tags_view as
    select 
        b.*,
        coalesce(
            array_agg(t.*) filter (where t.id is not null)::blogs_tags[],
            array[]::blogs_tags[]
        ) as tags
    from blogs_blogs b
    left join blogs_blog_tags bt on b.id = bt.blog_id
	left join blogs_tags t on bt.tag_id = t.id
	group by b.id
;
