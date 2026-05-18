CREATE TABLE IF NOT EXISTS blogs_blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(256) NOT NULL,
    content TEXT NOT NULL,
    published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    image_url VARCHAR(4096)
);

CREATE TABLE IF NOT EXISTS blogs_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(256) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS blogs_blog_tags (
    blog_id UUID NOT NULL REFERENCES blogs_blogs(id),
    tag_id UUID NOT NULL REFERENCES blogs_tags(id),
    CONSTRAINT blogs_blog_tags_uniq_tg UNIQUE (blog_id, tag_id)
);

CREATE INDEX IF NOT EXISTS blogs_blog_tags_blog_id_idx ON blogs_blog_tags(blog_id);
CREATE INDEX IF NOT EXISTS blogs_blog_tags_tag_id_idx ON blogs_blog_tags(tag_id);
