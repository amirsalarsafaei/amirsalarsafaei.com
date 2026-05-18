use std::collections::HashMap;

use sqlx::{PgPool, Row};
use time::OffsetDateTime;
use uuid::Uuid;

use super::tags::TagRow;

/// Compile-time verified blog row struct (matches `blogs_blogs` table columns).
#[derive(sqlx::FromRow, Debug, Clone)]
pub struct BlogRow {
    pub id: Uuid,
    pub title: String,
    pub content: String,
    pub published: Option<bool>,
    pub created_at: OffsetDateTime,
    pub published_at: Option<OffsetDateTime>,
    pub image_url: Option<String>,
}

/// Blog enriched with its associated tags.
pub struct BlogWithTags {
    pub id: Uuid,
    pub title: String,
    pub content: String,
    pub published: bool,
    pub created_at: OffsetDateTime,
    pub published_at: Option<OffsetDateTime>,
    pub image_url: Option<String>,
    pub tags: Vec<TagRow>,
}

impl BlogRow {
    pub fn with_tags(self, tags: Vec<TagRow>) -> BlogWithTags {
        BlogWithTags {
            id: self.id,
            title: self.title,
            content: self.content,
            published: self.published.unwrap_or(false),
            created_at: self.created_at,
            published_at: self.published_at,
            image_url: self.image_url,
            tags,
        }
    }
}

// ------ Published blogs ------------------------------------------------

pub async fn published_blogs_paginated(
    pool: &PgPool,
    published_earlier_than: OffsetDateTime,
    limit: i64,
) -> Result<Vec<BlogWithTags>, sqlx::Error> {
    let rows: Vec<BlogRow> = sqlx::query_as!(
        BlogRow,
        r#"SELECT id, title, content, published, created_at, published_at, image_url
            FROM blogs_blogs
           WHERE published_at < $1 AND published = true
           ORDER BY published_at DESC
              LIMIT $2"#,
        published_earlier_than,
        limit,
    )
    .fetch_all(pool)
    .await?;
    enrich_blogs_with_tags(pool, rows).await
}

// ------ All blogs (drafts + published) --------------------------------

pub async fn blogs_paginated(
    pool: &PgPool,
    created_earlier_than: OffsetDateTime,
    limit: i64,
) -> Result<Vec<BlogWithTags>, sqlx::Error> {
    let rows: Vec<BlogRow> = sqlx::query_as!(
        BlogRow,
        r#"SELECT id, title, content, published, created_at, published_at, image_url
            FROM blogs_blogs
           WHERE created_at < $1
           ORDER BY created_at DESC
              LIMIT $2"#,
        created_earlier_than,
        limit,
    )
    .fetch_all(pool)
    .await?;
    enrich_blogs_with_tags(pool, rows).await
}

// ------ Create --------------------------------------------------------

pub async fn create_blog(
    pool: &PgPool,
    title: &str,
    content: &str,
    image_url: &Option<String>,
) -> Result<Uuid, sqlx::Error> {
    let row = sqlx::query!(
        r#"INSERT INTO blogs_blogs(title, content, image_url)
           VALUES($1, $2, $3)
           RETURNING id"#,
        title,
        content,
        image_url.as_ref().map(|s| s.as_str()),
    )
    .fetch_one(pool)
    .await?;
    Ok(row.id)
}

// ------ Update --------------------------------------------------------

pub async fn update_blog_details(
    pool: &PgPool,
    title: &str,
    content: &str,
    image_url: &Option<String>,
    id: &Uuid,
) -> Result<Option<Uuid>, sqlx::Error> {
    let row = sqlx::query!(
        r#"UPDATE blogs_blogs
           SET title = $1, content = $2, image_url = $3
           WHERE id = $4
           RETURNING id"#,
        title,
        content,
        image_url.as_ref().map(|s| s.as_str()),
        id,
    )
    .fetch_optional(pool)
    .await?;
    Ok(row.map(|r| r.id))
}

pub async fn publish_blog(pool: &PgPool, id: &Uuid) -> Result<Option<Uuid>, sqlx::Error> {
    let row = sqlx::query!(
        r#"UPDATE blogs_blogs
           SET published = true, published_at = now()
           WHERE id = $1
           RETURNING id"#,
        id,
    )
    .fetch_optional(pool)
    .await?;
    Ok(row.map(|r| r.id))
}

// ------ Get by id -----------------------------------------------------

pub async fn get_blog_by_id(pool: &PgPool, id: &Uuid) -> Result<Option<BlogWithTags>, sqlx::Error> {
    let row: Option<BlogRow> = sqlx::query_as!(
        BlogRow,
        r#"SELECT id, title, content, published, created_at, published_at, image_url
            FROM blogs_blogs
           WHERE id = $1"#,
        id,
    )
    .fetch_optional(pool)
    .await?;

    match row {
        Some(blog) => {
            let tags = super::tags::tags_for_blog(pool, &blog.id).await?;
            Ok(Some(blog.with_tags(tags)))
        }
        None => Ok(None),
    }
}

// ------ Helpers -------------------------------------------------------

async fn enrich_blogs_with_tags(
    pool: &PgPool,
    rows: Vec<BlogRow>,
) -> Result<Vec<BlogWithTags>, sqlx::Error> {
    if rows.is_empty() {
        return Ok(Vec::new());
    }

    let blog_ids: Vec<Uuid> = rows.iter().map(|r| r.id).collect();
    let tag_map = all_tags_for_blogs(pool, &blog_ids).await?;

    Ok(rows
        .into_iter()
        .map(|row| {
            let tags = tag_map.get(&row.id).cloned().unwrap_or_default();
            row.with_tags(tags)
        })
        .collect())
}

/// Batch-fetch tags for multiple blogs in a single query (dynamic IN clause).
/// Dynamic → raw query via QueryBuilder.  No compile-time check.
async fn all_tags_for_blogs(
    pool: &PgPool,
    blog_ids: &[Uuid],
) -> Result<HashMap<Uuid, Vec<TagRow>>, sqlx::Error> {
    if blog_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let mut query = sqlx::QueryBuilder::new(
        "SELECT blog_id, tag_id, name FROM blogs_blog_tags
         JOIN blogs_tags ON blogs_tags.id = blogs_blog_tags.tag_id
         WHERE blog_id IN (",
    );

    let mut separated = query.separated(", ");
    for id in blog_ids {
        separated.push_bind(id);
    }
    separated.push(") ORDER BY blog_id");

    let raw_rows = query.build().fetch_all(pool).await?;

    // Map raw rows to typed tuples
    let rows: Vec<(Uuid, Uuid, String)> = raw_rows
        .into_iter()
        .map(|row| Ok((row.try_get(0)?, row.try_get(1)?, row.try_get(2)?)))
        .collect::<Result<Vec<_>, sqlx::Error>>()?;

    let mut result: HashMap<Uuid, Vec<TagRow>> = HashMap::new();
    for (blog_id, tag_id, name) in rows {
        result
            .entry(blog_id)
            .or_default()
            .push(TagRow { id: tag_id, name });
    }

    Ok(result)
}
