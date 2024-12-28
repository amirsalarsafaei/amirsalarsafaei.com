// This file was generated with `cornucopia`. Do not modify.

#[allow(clippy::all, clippy::pedantic)]
#[allow(unused_variables)]
#[allow(unused_imports)]
#[allow(dead_code)]
pub mod types {}
#[allow(clippy::all, clippy::pedantic)]
#[allow(unused_variables)]
#[allow(unused_imports)]
#[allow(dead_code)]
pub mod queries {
    pub mod blogs {
        use cornucopia_async::GenericClient;
        use futures;
        use futures::{StreamExt, TryStreamExt};
        #[derive(Clone, Copy, Debug)]
        pub struct PublishedBlogsPaginatedByEarlierParams {
            pub published_earlier_than: time::OffsetDateTime,
            pub limit: i64,
        }
        #[derive(Clone, Copy, Debug)]
        pub struct BlogsPaginatedByEarlierParams {
            pub created_earlier_than: time::OffsetDateTime,
            pub limit: i64,
        }
        #[derive(Debug)]
        pub struct CreateBlogParams<
            T1: cornucopia_async::StringSql,
            T2: cornucopia_async::StringSql,
            T3: cornucopia_async::StringSql,
        > {
            pub title: T1,
            pub content: T2,
            pub image_url: Option<T3>,
        }
        #[derive(Debug)]
        pub struct UpdateBlogDetailsParams<
            T1: cornucopia_async::StringSql,
            T2: cornucopia_async::StringSql,
            T3: cornucopia_async::StringSql,
        > {
            pub title: T1,
            pub content: T2,
            pub image_url: Option<T3>,
            pub id: uuid::Uuid,
        }
        #[derive(Debug, Clone, PartialEq)]
        pub struct PublishedBlog {
            pub id: uuid::Uuid,
            pub title: String,
            pub content: String,
            pub published: bool,
            pub created_at: time::OffsetDateTime,
            pub published_at: time::OffsetDateTime,
            pub image_url: Option<String>,
        }
        pub struct PublishedBlogBorrowed<'a> {
            pub id: uuid::Uuid,
            pub title: &'a str,
            pub content: &'a str,
            pub published: bool,
            pub created_at: time::OffsetDateTime,
            pub published_at: time::OffsetDateTime,
            pub image_url: Option<&'a str>,
        }
        impl<'a> From<PublishedBlogBorrowed<'a>> for PublishedBlog {
            fn from(
                PublishedBlogBorrowed {
                    id,
                    title,
                    content,
                    published,
                    created_at,
                    published_at,
                    image_url,
                }: PublishedBlogBorrowed<'a>,
            ) -> Self {
                Self {
                    id,
                    title: title.into(),
                    content: content.into(),
                    published,
                    created_at,
                    published_at,
                    image_url: image_url.map(|v| v.into()),
                }
            }
        }
        pub struct PublishedBlogQuery<'a, C: GenericClient, T, const N: usize> {
            client: &'a C,
            params: [&'a (dyn postgres_types::ToSql + Sync); N],
            stmt: &'a mut cornucopia_async::private::Stmt,
            extractor: fn(&tokio_postgres::Row) -> PublishedBlogBorrowed,
            mapper: fn(PublishedBlogBorrowed) -> T,
        }
        impl<'a, C, T: 'a, const N: usize> PublishedBlogQuery<'a, C, T, N>
        where
            C: GenericClient,
        {
            pub fn map<R>(
                self,
                mapper: fn(PublishedBlogBorrowed) -> R,
            ) -> PublishedBlogQuery<'a, C, R, N> {
                PublishedBlogQuery {
                    client: self.client,
                    params: self.params,
                    stmt: self.stmt,
                    extractor: self.extractor,
                    mapper,
                }
            }
            pub async fn one(self) -> Result<T, tokio_postgres::Error> {
                let stmt = self.stmt.prepare(self.client).await?;
                let row = self.client.query_one(stmt, &self.params).await?;
                Ok((self.mapper)((self.extractor)(&row)))
            }
            pub async fn all(self) -> Result<Vec<T>, tokio_postgres::Error> {
                self.iter().await?.try_collect().await
            }
            pub async fn opt(self) -> Result<Option<T>, tokio_postgres::Error> {
                let stmt = self.stmt.prepare(self.client).await?;
                Ok(self
                    .client
                    .query_opt(stmt, &self.params)
                    .await?
                    .map(|row| (self.mapper)((self.extractor)(&row))))
            }
            pub async fn iter(
                self,
            ) -> Result<
                impl futures::Stream<Item = Result<T, tokio_postgres::Error>> + 'a,
                tokio_postgres::Error,
            > {
                let stmt = self.stmt.prepare(self.client).await?;
                let it = self
                    .client
                    .query_raw(stmt, cornucopia_async::private::slice_iter(&self.params))
                    .await?
                    .map(move |res| res.map(|row| (self.mapper)((self.extractor)(&row))))
                    .into_stream();
                Ok(it)
            }
        }
        #[derive(Debug, Clone, PartialEq)]
        pub struct Blog {
            pub id: uuid::Uuid,
            pub title: String,
            pub content: String,
            pub published: bool,
            pub created_at: time::OffsetDateTime,
            pub published_at: Option<time::OffsetDateTime>,
            pub image_url: Option<String>,
        }
        pub struct BlogBorrowed<'a> {
            pub id: uuid::Uuid,
            pub title: &'a str,
            pub content: &'a str,
            pub published: bool,
            pub created_at: time::OffsetDateTime,
            pub published_at: Option<time::OffsetDateTime>,
            pub image_url: Option<&'a str>,
        }
        impl<'a> From<BlogBorrowed<'a>> for Blog {
            fn from(
                BlogBorrowed {
                    id,
                    title,
                    content,
                    published,
                    created_at,
                    published_at,
                    image_url,
                }: BlogBorrowed<'a>,
            ) -> Self {
                Self {
                    id,
                    title: title.into(),
                    content: content.into(),
                    published,
                    created_at,
                    published_at,
                    image_url: image_url.map(|v| v.into()),
                }
            }
        }
        pub struct BlogQuery<'a, C: GenericClient, T, const N: usize> {
            client: &'a C,
            params: [&'a (dyn postgres_types::ToSql + Sync); N],
            stmt: &'a mut cornucopia_async::private::Stmt,
            extractor: fn(&tokio_postgres::Row) -> BlogBorrowed,
            mapper: fn(BlogBorrowed) -> T,
        }
        impl<'a, C, T: 'a, const N: usize> BlogQuery<'a, C, T, N>
        where
            C: GenericClient,
        {
            pub fn map<R>(self, mapper: fn(BlogBorrowed) -> R) -> BlogQuery<'a, C, R, N> {
                BlogQuery {
                    client: self.client,
                    params: self.params,
                    stmt: self.stmt,
                    extractor: self.extractor,
                    mapper,
                }
            }
            pub async fn one(self) -> Result<T, tokio_postgres::Error> {
                let stmt = self.stmt.prepare(self.client).await?;
                let row = self.client.query_one(stmt, &self.params).await?;
                Ok((self.mapper)((self.extractor)(&row)))
            }
            pub async fn all(self) -> Result<Vec<T>, tokio_postgres::Error> {
                self.iter().await?.try_collect().await
            }
            pub async fn opt(self) -> Result<Option<T>, tokio_postgres::Error> {
                let stmt = self.stmt.prepare(self.client).await?;
                Ok(self
                    .client
                    .query_opt(stmt, &self.params)
                    .await?
                    .map(|row| (self.mapper)((self.extractor)(&row))))
            }
            pub async fn iter(
                self,
            ) -> Result<
                impl futures::Stream<Item = Result<T, tokio_postgres::Error>> + 'a,
                tokio_postgres::Error,
            > {
                let stmt = self.stmt.prepare(self.client).await?;
                let it = self
                    .client
                    .query_raw(stmt, cornucopia_async::private::slice_iter(&self.params))
                    .await?
                    .map(move |res| res.map(|row| (self.mapper)((self.extractor)(&row))))
                    .into_stream();
                Ok(it)
            }
        }
        pub fn published_blogs_paginated_by_earlier() -> PublishedBlogsPaginatedByEarlierStmt {
            PublishedBlogsPaginatedByEarlierStmt(cornucopia_async::private::Stmt::new(
                "select
	*
from
	blogs_blogs
where published_at < $1 and published = true
order by published_at desc
limit $2",
            ))
        }
        pub struct PublishedBlogsPaginatedByEarlierStmt(cornucopia_async::private::Stmt);
        impl PublishedBlogsPaginatedByEarlierStmt {
            pub fn bind<'a, C: GenericClient>(
                &'a mut self,
                client: &'a C,
                published_earlier_than: &'a time::OffsetDateTime,
                limit: &'a i64,
            ) -> PublishedBlogQuery<'a, C, PublishedBlog, 2> {
                PublishedBlogQuery {
                    client,
                    params: [published_earlier_than, limit],
                    stmt: &mut self.0,
                    extractor: |row| PublishedBlogBorrowed {
                        id: row.get(0),
                        title: row.get(1),
                        content: row.get(2),
                        published: row.get(3),
                        created_at: row.get(4),
                        published_at: row.get(5),
                        image_url: row.get(6),
                    },
                    mapper: |it| <PublishedBlog>::from(it),
                }
            }
        }
        impl<'a, C: GenericClient>
            cornucopia_async::Params<
                'a,
                PublishedBlogsPaginatedByEarlierParams,
                PublishedBlogQuery<'a, C, PublishedBlog, 2>,
                C,
            > for PublishedBlogsPaginatedByEarlierStmt
        {
            fn params(
                &'a mut self,
                client: &'a C,
                params: &'a PublishedBlogsPaginatedByEarlierParams,
            ) -> PublishedBlogQuery<'a, C, PublishedBlog, 2> {
                self.bind(client, &params.published_earlier_than, &params.limit)
            }
        }
        pub fn blogs_paginated_by_earlier() -> BlogsPaginatedByEarlierStmt {
            BlogsPaginatedByEarlierStmt(cornucopia_async::private::Stmt::new(
                "select
	*
from
	blogs_blogs
where created_at < $1 
order by created_at desc
limit $2",
            ))
        }
        pub struct BlogsPaginatedByEarlierStmt(cornucopia_async::private::Stmt);
        impl BlogsPaginatedByEarlierStmt {
            pub fn bind<'a, C: GenericClient>(
                &'a mut self,
                client: &'a C,
                created_earlier_than: &'a time::OffsetDateTime,
                limit: &'a i64,
            ) -> BlogQuery<'a, C, Blog, 2> {
                BlogQuery {
                    client,
                    params: [created_earlier_than, limit],
                    stmt: &mut self.0,
                    extractor: |row| BlogBorrowed {
                        id: row.get(0),
                        title: row.get(1),
                        content: row.get(2),
                        published: row.get(3),
                        created_at: row.get(4),
                        published_at: row.get(5),
                        image_url: row.get(6),
                    },
                    mapper: |it| <Blog>::from(it),
                }
            }
        }
        impl<'a, C: GenericClient>
            cornucopia_async::Params<
                'a,
                BlogsPaginatedByEarlierParams,
                BlogQuery<'a, C, Blog, 2>,
                C,
            > for BlogsPaginatedByEarlierStmt
        {
            fn params(
                &'a mut self,
                client: &'a C,
                params: &'a BlogsPaginatedByEarlierParams,
            ) -> BlogQuery<'a, C, Blog, 2> {
                self.bind(client, &params.created_earlier_than, &params.limit)
            }
        }
        pub fn create_blog() -> CreateBlogStmt {
            CreateBlogStmt(cornucopia_async::private::Stmt::new(
                "insert into 
blogs_blogs(title, content, image_url)
values($1, $2, $3)
returning *",
            ))
        }
        pub struct CreateBlogStmt(cornucopia_async::private::Stmt);
        impl CreateBlogStmt {
            pub fn bind<
                'a,
                C: GenericClient,
                T1: cornucopia_async::StringSql,
                T2: cornucopia_async::StringSql,
                T3: cornucopia_async::StringSql,
            >(
                &'a mut self,
                client: &'a C,
                title: &'a T1,
                content: &'a T2,
                image_url: &'a Option<T3>,
            ) -> BlogQuery<'a, C, Blog, 3> {
                BlogQuery {
                    client,
                    params: [title, content, image_url],
                    stmt: &mut self.0,
                    extractor: |row| BlogBorrowed {
                        id: row.get(0),
                        title: row.get(1),
                        content: row.get(2),
                        published: row.get(3),
                        created_at: row.get(4),
                        published_at: row.get(5),
                        image_url: row.get(6),
                    },
                    mapper: |it| <Blog>::from(it),
                }
            }
        }
        impl<
                'a,
                C: GenericClient,
                T1: cornucopia_async::StringSql,
                T2: cornucopia_async::StringSql,
                T3: cornucopia_async::StringSql,
            >
            cornucopia_async::Params<'a, CreateBlogParams<T1, T2, T3>, BlogQuery<'a, C, Blog, 3>, C>
            for CreateBlogStmt
        {
            fn params(
                &'a mut self,
                client: &'a C,
                params: &'a CreateBlogParams<T1, T2, T3>,
            ) -> BlogQuery<'a, C, Blog, 3> {
                self.bind(client, &params.title, &params.content, &params.image_url)
            }
        }
        pub fn update_blog_details() -> UpdateBlogDetailsStmt {
            UpdateBlogDetailsStmt(cornucopia_async::private::Stmt::new(
                "update blogs_blogs
set title = $1, content = $2, image_url = $3
where id = $4
returning *",
            ))
        }
        pub struct UpdateBlogDetailsStmt(cornucopia_async::private::Stmt);
        impl UpdateBlogDetailsStmt {
            pub fn bind<
                'a,
                C: GenericClient,
                T1: cornucopia_async::StringSql,
                T2: cornucopia_async::StringSql,
                T3: cornucopia_async::StringSql,
            >(
                &'a mut self,
                client: &'a C,
                title: &'a T1,
                content: &'a T2,
                image_url: &'a Option<T3>,
                id: &'a uuid::Uuid,
            ) -> BlogQuery<'a, C, Blog, 4> {
                BlogQuery {
                    client,
                    params: [title, content, image_url, id],
                    stmt: &mut self.0,
                    extractor: |row| BlogBorrowed {
                        id: row.get(0),
                        title: row.get(1),
                        content: row.get(2),
                        published: row.get(3),
                        created_at: row.get(4),
                        published_at: row.get(5),
                        image_url: row.get(6),
                    },
                    mapper: |it| <Blog>::from(it),
                }
            }
        }
        impl<
                'a,
                C: GenericClient,
                T1: cornucopia_async::StringSql,
                T2: cornucopia_async::StringSql,
                T3: cornucopia_async::StringSql,
            >
            cornucopia_async::Params<
                'a,
                UpdateBlogDetailsParams<T1, T2, T3>,
                BlogQuery<'a, C, Blog, 4>,
                C,
            > for UpdateBlogDetailsStmt
        {
            fn params(
                &'a mut self,
                client: &'a C,
                params: &'a UpdateBlogDetailsParams<T1, T2, T3>,
            ) -> BlogQuery<'a, C, Blog, 4> {
                self.bind(
                    client,
                    &params.title,
                    &params.content,
                    &params.image_url,
                    &params.id,
                )
            }
        }
        pub fn publish_blog() -> PublishBlogStmt {
            PublishBlogStmt(cornucopia_async::private::Stmt::new(
                "update blogs_blogs
set published = true, published_at = now()
where id = $1
returning *",
            ))
        }
        pub struct PublishBlogStmt(cornucopia_async::private::Stmt);
        impl PublishBlogStmt {
            pub fn bind<'a, C: GenericClient>(
                &'a mut self,
                client: &'a C,
                id: &'a uuid::Uuid,
            ) -> PublishedBlogQuery<'a, C, PublishedBlog, 1> {
                PublishedBlogQuery {
                    client,
                    params: [id],
                    stmt: &mut self.0,
                    extractor: |row| PublishedBlogBorrowed {
                        id: row.get(0),
                        title: row.get(1),
                        content: row.get(2),
                        published: row.get(3),
                        created_at: row.get(4),
                        published_at: row.get(5),
                        image_url: row.get(6),
                    },
                    mapper: |it| <PublishedBlog>::from(it),
                }
            }
        }
        pub fn get_blog_by_id() -> GetBlogByIdStmt {
            GetBlogByIdStmt(cornucopia_async::private::Stmt::new(
                "select *
from blogs_blogs
where id = $1",
            ))
        }
        pub struct GetBlogByIdStmt(cornucopia_async::private::Stmt);
        impl GetBlogByIdStmt {
            pub fn bind<'a, C: GenericClient>(
                &'a mut self,
                client: &'a C,
                id: &'a uuid::Uuid,
            ) -> BlogQuery<'a, C, Blog, 1> {
                BlogQuery {
                    client,
                    params: [id],
                    stmt: &mut self.0,
                    extractor: |row| BlogBorrowed {
                        id: row.get(0),
                        title: row.get(1),
                        content: row.get(2),
                        published: row.get(3),
                        created_at: row.get(4),
                        published_at: row.get(5),
                        image_url: row.get(6),
                    },
                    mapper: |it| <Blog>::from(it),
                }
            }
        }
    }
}

