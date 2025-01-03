--: Tag()

--! get_all_tags: Tag
select
	*
from
	blogs_tags;

--! create_tag: Tag
insert into
blogs_tags(name)
values(:name)
returning *;

--! delete_tag
delete from
blogs_tags
where id=:id
returning id;

--! insert_blog_tags
insert into blogs_blog_tags(blog_id, tag_id)
select :blog_id, id
from blogs_tags
where id = any(:tag_ids) on conflict (blog_id, tag_id) do nothing;


--! delete_blog_tags
delete from
blogs_blog_tags
where blog_id = :blog_id and tag_id != any(:tag_ids);

--! get_blog_tags: Tag
select bt.*
from blogs_blog_tags bbt
join blogs_tags bt on bbt.tag_id = bt.id
where blog_id = :blog_id;
