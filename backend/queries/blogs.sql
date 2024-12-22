--! published_blogs_paginated_by_earlier
select
	*
from
	blogs_blogs
where published_at < :published_earlier_than and published = true
order by published_at desc
limit :limit;

--! blogs_paginated_by_earlier : (published_at?)
select
	*
from
	blogs_blogs
where created_at < :created_earlier_than 
order by created_at desc
limit :limit;

--! create_blog : (published_at?)
insert into 
blogs_blogs(title, content)
values(:title, :content)
returning *;

--! update_blog_details : (published_at?)
update blogs_blogs
set title = :title, content = :content
where id = :id
returning *;

--! publish_blog
update blogs_blogs
set published = true, published_at = now()
where id = :id
returning *;

--! get_blog_by_id : (published_at?)
select *
from blogs_blogs
where id = :id;
