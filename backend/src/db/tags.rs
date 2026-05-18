use sqlx::PgPool;
use uuid::Uuid;

#[derive(sqlx::FromRow, Debug, Clone)]
pub struct TagRow {
    pub id: Uuid,
    pub name: String,
}

pub async fn all_tags(pool: &PgPool) -> Result<Vec<TagRow>, sqlx::Error> {
    sqlx::query_as::<_, TagRow>("SELECT id, name FROM blogs_tags")
        .fetch_all(pool)
        .await
}

pub async fn create_tag(pool: &PgPool, name: &str) -> Result<TagRow, sqlx::Error> {
    sqlx::query_as::<_, TagRow>(
        "INSERT INTO blogs_tags(name) VALUES($1) RETURNING id, name",
    )
    .bind(name)
    .fetch_one(pool)
    .await
}

pub async fn delete_tag(pool: &PgPool, id: &Uuid) -> Result<Option<Uuid>, sqlx::Error> {
    let row: Option<(Uuid,)> =
        sqlx::query_as("DELETE FROM blogs_tags WHERE id = $1 RETURNING id")
            .bind(id)
            .fetch_optional(pool)
            .await?;

    Ok(row.map(|r| r.0))
}

pub async fn insert_blog_tags(
    pool: &PgPool,
    blog_id: &Uuid,
    tag_ids: &[Uuid],
) -> Result<u64, sqlx::Error> {
    let result = sqlx::query(
        "INSERT INTO blogs_blog_tags(blog_id, tag_id)
         SELECT $1, id FROM blogs_tags WHERE id = ANY($2)
         ON CONFLICT (blog_id, tag_id) DO NOTHING",
    )
    .bind(blog_id)
    .bind(tag_ids)
    .execute(pool)
    .await?;

    Ok(result.rows_affected())
}

pub async fn delete_blog_tags(
    pool: &PgPool,
    blog_id: &Uuid,
    keep_tag_ids: &[Uuid],
) -> Result<u64, sqlx::Error> {
    let result = sqlx::query(
        "DELETE FROM blogs_blog_tags WHERE blog_id = $1 AND tag_id != ALL($2)",
    )
    .bind(blog_id)
    .bind(keep_tag_ids)
    .execute(pool)
    .await?;

    Ok(result.rows_affected())
}

pub async fn tags_for_blog(pool: &PgPool, blog_id: &Uuid) -> Result<Vec<TagRow>, sqlx::Error> {
    sqlx::query_as::<_, TagRow>(
        "SELECT bt.id, bt.name
         FROM blogs_blog_tags bbt
         JOIN blogs_tags bt ON bbt.tag_id = bt.id
         WHERE bbt.blog_id = $1",
    )
    .bind(blog_id)
    .fetch_all(pool)
    .await
}
