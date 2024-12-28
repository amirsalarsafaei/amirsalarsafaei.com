--: Blog(image_url?, published_at?)
--: PublishedBlog(image_url?)

--! published_blogs_paginated_by_earlier: PublishedBlog
select
	*
from
	blogs_blogs
where published_at < :published_earlier_than and published = true
order by published_at desc
limit :limit;

--! blogs_paginated_by_earlier : Blog
select
	*
from
	blogs_blogs
where created_at < :created_earlier_than 
order by created_at desc
limit :limit;

--! create_blog (image_url?) : Blog
insert into 
blogs_blogs(title, content, image_url)
values(:title, :content, :image_url)
returning *;

--! update_blog_details (image_url?) : Blog
update blogs_blogs
set title = :title, content = :content, image_url = :image_url
where id = :id
returning *;

--! publish_blog: PublishedBlog
update blogs_blogs
set published = true, published_at = now()
where id = :id
returning *;

--! get_blog_by_id : Blog 
select *
from blogs_blogs
where id = :id;
