--: Blog(image_url?, published_at?)
--: PublishedBlog(image_url?)


--! published_blogs_paginated_by_earlier: PublishedBlog
select
	*
from
	blogs_blogs_with_tags_view
where published_at < :published_earlier_than and published = true
order by published_at desc
limit :limit;

--! blogs_paginated_by_earlier : Blog
select
	*
from
	blogs_blogs_with_tags_view
where created_at < :created_earlier_than 
order by created_at desc
limit :limit;

--! create_blog (image_url?) 
insert into 
blogs_blogs(title, content, image_url)
values(:title, :content, :image_url)
returning id;

--! update_blog_details (image_url?) 
update blogs_blogs
set title = :title, content = :content, image_url = :image_url
where id = :id
returning id;

--! publish_blog 
update blogs_blogs
set published = true, published_at = now()
where id = :id
returning id;

--! get_blog_by_id : Blog 
select *
from blogs_blogs_with_tags_view
where id = :id;
