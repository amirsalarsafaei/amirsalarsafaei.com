// This file was generated with `cornucopia`. Do not modify.

#[allow(clippy::all, clippy::pedantic)] #[allow(unused_variables)]
#[allow(unused_imports)] #[allow(dead_code)] pub mod types { }#[allow(clippy::all, clippy::pedantic)] #[allow(unused_variables)]
#[allow(unused_imports)] #[allow(dead_code)] pub mod queries
{ pub mod blogs
{ use futures::{{StreamExt, TryStreamExt}};use futures; use cornucopia_async::GenericClient;#[derive(Clone,Copy, Debug)] pub struct PublishedBlogsPaginatedByEarlierParams<> { pub published_earlier_than: time::OffsetDateTime,pub limit: i64,}#[derive(Clone,Copy, Debug)] pub struct BlogsPaginatedByEarlierParams<> { pub created_earlier_than: time::OffsetDateTime,pub limit: i64,}#[derive( Debug)] pub struct CreateBlogParams<T1: cornucopia_async::StringSql,T2: cornucopia_async::StringSql,> { pub title: T1,pub content: T2,}#[derive( Debug)] pub struct UpdateBlogDetailsParams<T1: cornucopia_async::StringSql,T2: cornucopia_async::StringSql,> { pub title: T1,pub content: T2,pub id: uuid::Uuid,}#[derive( Debug, Clone, PartialEq,)] pub struct PublishedBlogsPaginatedByEarlier
{ pub id : uuid::Uuid,pub title : String,pub content : String,pub published : bool,pub created_at : time::OffsetDateTime,pub published_at : time::OffsetDateTime,}pub struct PublishedBlogsPaginatedByEarlierBorrowed<'a> { pub id : uuid::Uuid,pub title : &'a str,pub content : &'a str,pub published : bool,pub created_at : time::OffsetDateTime,pub published_at : time::OffsetDateTime,}
impl<'a> From<PublishedBlogsPaginatedByEarlierBorrowed<'a>> for PublishedBlogsPaginatedByEarlier
{
    fn from(PublishedBlogsPaginatedByEarlierBorrowed { id,title,content,published,created_at,published_at,}: PublishedBlogsPaginatedByEarlierBorrowed<'a>) ->
    Self { Self { id,title: title.into(),content: content.into(),published,created_at,published_at,} }
}pub struct PublishedBlogsPaginatedByEarlierQuery<'a, C: GenericClient, T, const N: usize>
{
    client: &'a  C, params:
    [&'a (dyn postgres_types::ToSql + Sync); N], stmt: &'a mut
    cornucopia_async::private::Stmt, extractor: fn(&tokio_postgres::Row) -> PublishedBlogsPaginatedByEarlierBorrowed,
    mapper: fn(PublishedBlogsPaginatedByEarlierBorrowed) -> T,
} impl<'a, C, T:'a, const N: usize> PublishedBlogsPaginatedByEarlierQuery<'a, C, T, N> where C:
GenericClient
{
    pub fn map<R>(self, mapper: fn(PublishedBlogsPaginatedByEarlierBorrowed) -> R) ->
    PublishedBlogsPaginatedByEarlierQuery<'a,C,R,N>
    {
        PublishedBlogsPaginatedByEarlierQuery
        {
            client: self.client, params: self.params, stmt: self.stmt,
            extractor: self.extractor, mapper,
        }
    } pub async fn one(self) -> Result<T, tokio_postgres::Error>
    {
        let stmt = self.stmt.prepare(self.client).await?; let row =
        self.client.query_one(stmt, &self.params).await?;
        Ok((self.mapper)((self.extractor)(&row)))
    } pub async fn all(self) -> Result<Vec<T>, tokio_postgres::Error>
    { self.iter().await?.try_collect().await } pub async fn opt(self) ->
    Result<Option<T>, tokio_postgres::Error>
    {
        let stmt = self.stmt.prepare(self.client).await?;
        Ok(self.client.query_opt(stmt, &self.params) .await?
        .map(|row| (self.mapper)((self.extractor)(&row))))
    } pub async fn iter(self,) -> Result<impl futures::Stream<Item = Result<T,
    tokio_postgres::Error>> + 'a, tokio_postgres::Error>
    {
        let stmt = self.stmt.prepare(self.client).await?; let it =
        self.client.query_raw(stmt,
        cornucopia_async::private::slice_iter(&self.params)) .await?
        .map(move |res|
        res.map(|row| (self.mapper)((self.extractor)(&row)))) .into_stream();
        Ok(it)
    }
}#[derive( Debug, Clone, PartialEq,)] pub struct BlogsPaginatedByEarlier
{ pub id : uuid::Uuid,pub title : String,pub content : String,pub published : bool,pub created_at : time::OffsetDateTime,pub published_at : Option<time::OffsetDateTime>,}pub struct BlogsPaginatedByEarlierBorrowed<'a> { pub id : uuid::Uuid,pub title : &'a str,pub content : &'a str,pub published : bool,pub created_at : time::OffsetDateTime,pub published_at : Option<time::OffsetDateTime>,}
impl<'a> From<BlogsPaginatedByEarlierBorrowed<'a>> for BlogsPaginatedByEarlier
{
    fn from(BlogsPaginatedByEarlierBorrowed { id,title,content,published,created_at,published_at,}: BlogsPaginatedByEarlierBorrowed<'a>) ->
    Self { Self { id,title: title.into(),content: content.into(),published,created_at,published_at,} }
}pub struct BlogsPaginatedByEarlierQuery<'a, C: GenericClient, T, const N: usize>
{
    client: &'a  C, params:
    [&'a (dyn postgres_types::ToSql + Sync); N], stmt: &'a mut
    cornucopia_async::private::Stmt, extractor: fn(&tokio_postgres::Row) -> BlogsPaginatedByEarlierBorrowed,
    mapper: fn(BlogsPaginatedByEarlierBorrowed) -> T,
} impl<'a, C, T:'a, const N: usize> BlogsPaginatedByEarlierQuery<'a, C, T, N> where C:
GenericClient
{
    pub fn map<R>(self, mapper: fn(BlogsPaginatedByEarlierBorrowed) -> R) ->
    BlogsPaginatedByEarlierQuery<'a,C,R,N>
    {
        BlogsPaginatedByEarlierQuery
        {
            client: self.client, params: self.params, stmt: self.stmt,
            extractor: self.extractor, mapper,
        }
    } pub async fn one(self) -> Result<T, tokio_postgres::Error>
    {
        let stmt = self.stmt.prepare(self.client).await?; let row =
        self.client.query_one(stmt, &self.params).await?;
        Ok((self.mapper)((self.extractor)(&row)))
    } pub async fn all(self) -> Result<Vec<T>, tokio_postgres::Error>
    { self.iter().await?.try_collect().await } pub async fn opt(self) ->
    Result<Option<T>, tokio_postgres::Error>
    {
        let stmt = self.stmt.prepare(self.client).await?;
        Ok(self.client.query_opt(stmt, &self.params) .await?
        .map(|row| (self.mapper)((self.extractor)(&row))))
    } pub async fn iter(self,) -> Result<impl futures::Stream<Item = Result<T,
    tokio_postgres::Error>> + 'a, tokio_postgres::Error>
    {
        let stmt = self.stmt.prepare(self.client).await?; let it =
        self.client.query_raw(stmt,
        cornucopia_async::private::slice_iter(&self.params)) .await?
        .map(move |res|
        res.map(|row| (self.mapper)((self.extractor)(&row)))) .into_stream();
        Ok(it)
    }
}#[derive( Debug, Clone, PartialEq,)] pub struct CreateBlog
{ pub id : uuid::Uuid,pub title : String,pub content : String,pub published : bool,pub created_at : time::OffsetDateTime,pub published_at : Option<time::OffsetDateTime>,}pub struct CreateBlogBorrowed<'a> { pub id : uuid::Uuid,pub title : &'a str,pub content : &'a str,pub published : bool,pub created_at : time::OffsetDateTime,pub published_at : Option<time::OffsetDateTime>,}
impl<'a> From<CreateBlogBorrowed<'a>> for CreateBlog
{
    fn from(CreateBlogBorrowed { id,title,content,published,created_at,published_at,}: CreateBlogBorrowed<'a>) ->
    Self { Self { id,title: title.into(),content: content.into(),published,created_at,published_at,} }
}pub struct CreateBlogQuery<'a, C: GenericClient, T, const N: usize>
{
    client: &'a  C, params:
    [&'a (dyn postgres_types::ToSql + Sync); N], stmt: &'a mut
    cornucopia_async::private::Stmt, extractor: fn(&tokio_postgres::Row) -> CreateBlogBorrowed,
    mapper: fn(CreateBlogBorrowed) -> T,
} impl<'a, C, T:'a, const N: usize> CreateBlogQuery<'a, C, T, N> where C:
GenericClient
{
    pub fn map<R>(self, mapper: fn(CreateBlogBorrowed) -> R) ->
    CreateBlogQuery<'a,C,R,N>
    {
        CreateBlogQuery
        {
            client: self.client, params: self.params, stmt: self.stmt,
            extractor: self.extractor, mapper,
        }
    } pub async fn one(self) -> Result<T, tokio_postgres::Error>
    {
        let stmt = self.stmt.prepare(self.client).await?; let row =
        self.client.query_one(stmt, &self.params).await?;
        Ok((self.mapper)((self.extractor)(&row)))
    } pub async fn all(self) -> Result<Vec<T>, tokio_postgres::Error>
    { self.iter().await?.try_collect().await } pub async fn opt(self) ->
    Result<Option<T>, tokio_postgres::Error>
    {
        let stmt = self.stmt.prepare(self.client).await?;
        Ok(self.client.query_opt(stmt, &self.params) .await?
        .map(|row| (self.mapper)((self.extractor)(&row))))
    } pub async fn iter(self,) -> Result<impl futures::Stream<Item = Result<T,
    tokio_postgres::Error>> + 'a, tokio_postgres::Error>
    {
        let stmt = self.stmt.prepare(self.client).await?; let it =
        self.client.query_raw(stmt,
        cornucopia_async::private::slice_iter(&self.params)) .await?
        .map(move |res|
        res.map(|row| (self.mapper)((self.extractor)(&row)))) .into_stream();
        Ok(it)
    }
}#[derive( Debug, Clone, PartialEq,)] pub struct UpdateBlogDetails
{ pub id : uuid::Uuid,pub title : String,pub content : String,pub published : bool,pub created_at : time::OffsetDateTime,pub published_at : Option<time::OffsetDateTime>,}pub struct UpdateBlogDetailsBorrowed<'a> { pub id : uuid::Uuid,pub title : &'a str,pub content : &'a str,pub published : bool,pub created_at : time::OffsetDateTime,pub published_at : Option<time::OffsetDateTime>,}
impl<'a> From<UpdateBlogDetailsBorrowed<'a>> for UpdateBlogDetails
{
    fn from(UpdateBlogDetailsBorrowed { id,title,content,published,created_at,published_at,}: UpdateBlogDetailsBorrowed<'a>) ->
    Self { Self { id,title: title.into(),content: content.into(),published,created_at,published_at,} }
}pub struct UpdateBlogDetailsQuery<'a, C: GenericClient, T, const N: usize>
{
    client: &'a  C, params:
    [&'a (dyn postgres_types::ToSql + Sync); N], stmt: &'a mut
    cornucopia_async::private::Stmt, extractor: fn(&tokio_postgres::Row) -> UpdateBlogDetailsBorrowed,
    mapper: fn(UpdateBlogDetailsBorrowed) -> T,
} impl<'a, C, T:'a, const N: usize> UpdateBlogDetailsQuery<'a, C, T, N> where C:
GenericClient
{
    pub fn map<R>(self, mapper: fn(UpdateBlogDetailsBorrowed) -> R) ->
    UpdateBlogDetailsQuery<'a,C,R,N>
    {
        UpdateBlogDetailsQuery
        {
            client: self.client, params: self.params, stmt: self.stmt,
            extractor: self.extractor, mapper,
        }
    } pub async fn one(self) -> Result<T, tokio_postgres::Error>
    {
        let stmt = self.stmt.prepare(self.client).await?; let row =
        self.client.query_one(stmt, &self.params).await?;
        Ok((self.mapper)((self.extractor)(&row)))
    } pub async fn all(self) -> Result<Vec<T>, tokio_postgres::Error>
    { self.iter().await?.try_collect().await } pub async fn opt(self) ->
    Result<Option<T>, tokio_postgres::Error>
    {
        let stmt = self.stmt.prepare(self.client).await?;
        Ok(self.client.query_opt(stmt, &self.params) .await?
        .map(|row| (self.mapper)((self.extractor)(&row))))
    } pub async fn iter(self,) -> Result<impl futures::Stream<Item = Result<T,
    tokio_postgres::Error>> + 'a, tokio_postgres::Error>
    {
        let stmt = self.stmt.prepare(self.client).await?; let it =
        self.client.query_raw(stmt,
        cornucopia_async::private::slice_iter(&self.params)) .await?
        .map(move |res|
        res.map(|row| (self.mapper)((self.extractor)(&row)))) .into_stream();
        Ok(it)
    }
}#[derive( Debug, Clone, PartialEq,)] pub struct PublishBlog
{ pub id : uuid::Uuid,pub title : String,pub content : String,pub published : bool,pub created_at : time::OffsetDateTime,pub published_at : time::OffsetDateTime,}pub struct PublishBlogBorrowed<'a> { pub id : uuid::Uuid,pub title : &'a str,pub content : &'a str,pub published : bool,pub created_at : time::OffsetDateTime,pub published_at : time::OffsetDateTime,}
impl<'a> From<PublishBlogBorrowed<'a>> for PublishBlog
{
    fn from(PublishBlogBorrowed { id,title,content,published,created_at,published_at,}: PublishBlogBorrowed<'a>) ->
    Self { Self { id,title: title.into(),content: content.into(),published,created_at,published_at,} }
}pub struct PublishBlogQuery<'a, C: GenericClient, T, const N: usize>
{
    client: &'a  C, params:
    [&'a (dyn postgres_types::ToSql + Sync); N], stmt: &'a mut
    cornucopia_async::private::Stmt, extractor: fn(&tokio_postgres::Row) -> PublishBlogBorrowed,
    mapper: fn(PublishBlogBorrowed) -> T,
} impl<'a, C, T:'a, const N: usize> PublishBlogQuery<'a, C, T, N> where C:
GenericClient
{
    pub fn map<R>(self, mapper: fn(PublishBlogBorrowed) -> R) ->
    PublishBlogQuery<'a,C,R,N>
    {
        PublishBlogQuery
        {
            client: self.client, params: self.params, stmt: self.stmt,
            extractor: self.extractor, mapper,
        }
    } pub async fn one(self) -> Result<T, tokio_postgres::Error>
    {
        let stmt = self.stmt.prepare(self.client).await?; let row =
        self.client.query_one(stmt, &self.params).await?;
        Ok((self.mapper)((self.extractor)(&row)))
    } pub async fn all(self) -> Result<Vec<T>, tokio_postgres::Error>
    { self.iter().await?.try_collect().await } pub async fn opt(self) ->
    Result<Option<T>, tokio_postgres::Error>
    {
        let stmt = self.stmt.prepare(self.client).await?;
        Ok(self.client.query_opt(stmt, &self.params) .await?
        .map(|row| (self.mapper)((self.extractor)(&row))))
    } pub async fn iter(self,) -> Result<impl futures::Stream<Item = Result<T,
    tokio_postgres::Error>> + 'a, tokio_postgres::Error>
    {
        let stmt = self.stmt.prepare(self.client).await?; let it =
        self.client.query_raw(stmt,
        cornucopia_async::private::slice_iter(&self.params)) .await?
        .map(move |res|
        res.map(|row| (self.mapper)((self.extractor)(&row)))) .into_stream();
        Ok(it)
    }
}#[derive( Debug, Clone, PartialEq,)] pub struct GetBlogById
{ pub id : uuid::Uuid,pub title : String,pub content : String,pub published : bool,pub created_at : time::OffsetDateTime,pub published_at : Option<time::OffsetDateTime>,}pub struct GetBlogByIdBorrowed<'a> { pub id : uuid::Uuid,pub title : &'a str,pub content : &'a str,pub published : bool,pub created_at : time::OffsetDateTime,pub published_at : Option<time::OffsetDateTime>,}
impl<'a> From<GetBlogByIdBorrowed<'a>> for GetBlogById
{
    fn from(GetBlogByIdBorrowed { id,title,content,published,created_at,published_at,}: GetBlogByIdBorrowed<'a>) ->
    Self { Self { id,title: title.into(),content: content.into(),published,created_at,published_at,} }
}pub struct GetBlogByIdQuery<'a, C: GenericClient, T, const N: usize>
{
    client: &'a  C, params:
    [&'a (dyn postgres_types::ToSql + Sync); N], stmt: &'a mut
    cornucopia_async::private::Stmt, extractor: fn(&tokio_postgres::Row) -> GetBlogByIdBorrowed,
    mapper: fn(GetBlogByIdBorrowed) -> T,
} impl<'a, C, T:'a, const N: usize> GetBlogByIdQuery<'a, C, T, N> where C:
GenericClient
{
    pub fn map<R>(self, mapper: fn(GetBlogByIdBorrowed) -> R) ->
    GetBlogByIdQuery<'a,C,R,N>
    {
        GetBlogByIdQuery
        {
            client: self.client, params: self.params, stmt: self.stmt,
            extractor: self.extractor, mapper,
        }
    } pub async fn one(self) -> Result<T, tokio_postgres::Error>
    {
        let stmt = self.stmt.prepare(self.client).await?; let row =
        self.client.query_one(stmt, &self.params).await?;
        Ok((self.mapper)((self.extractor)(&row)))
    } pub async fn all(self) -> Result<Vec<T>, tokio_postgres::Error>
    { self.iter().await?.try_collect().await } pub async fn opt(self) ->
    Result<Option<T>, tokio_postgres::Error>
    {
        let stmt = self.stmt.prepare(self.client).await?;
        Ok(self.client.query_opt(stmt, &self.params) .await?
        .map(|row| (self.mapper)((self.extractor)(&row))))
    } pub async fn iter(self,) -> Result<impl futures::Stream<Item = Result<T,
    tokio_postgres::Error>> + 'a, tokio_postgres::Error>
    {
        let stmt = self.stmt.prepare(self.client).await?; let it =
        self.client.query_raw(stmt,
        cornucopia_async::private::slice_iter(&self.params)) .await?
        .map(move |res|
        res.map(|row| (self.mapper)((self.extractor)(&row)))) .into_stream();
        Ok(it)
    }
}pub fn published_blogs_paginated_by_earlier() -> PublishedBlogsPaginatedByEarlierStmt
{ PublishedBlogsPaginatedByEarlierStmt(cornucopia_async::private::Stmt::new("select
	*
from
	blogs_blogs
where published_at < $1 and published = true
order by published_at desc
limit $2")) } pub struct
PublishedBlogsPaginatedByEarlierStmt(cornucopia_async::private::Stmt); impl PublishedBlogsPaginatedByEarlierStmt
{ pub fn bind<'a, C:
GenericClient,>(&'a mut self, client: &'a  C,
published_earlier_than: &'a time::OffsetDateTime,limit: &'a i64,) -> PublishedBlogsPaginatedByEarlierQuery<'a,C,
PublishedBlogsPaginatedByEarlier, 2>
{
    PublishedBlogsPaginatedByEarlierQuery
    {
        client, params: [published_earlier_than,limit,], stmt: &mut self.0, extractor:
        |row| { PublishedBlogsPaginatedByEarlierBorrowed { id: row.get(0),title: row.get(1),content: row.get(2),published: row.get(3),created_at: row.get(4),published_at: row.get(5),} }, mapper: |it| { <PublishedBlogsPaginatedByEarlier>::from(it) },
    }
} }impl <'a, C: GenericClient,> cornucopia_async::Params<'a,
PublishedBlogsPaginatedByEarlierParams<>, PublishedBlogsPaginatedByEarlierQuery<'a, C,
PublishedBlogsPaginatedByEarlier, 2>, C> for PublishedBlogsPaginatedByEarlierStmt
{
    fn
    params(&'a mut self, client: &'a  C, params: &'a
    PublishedBlogsPaginatedByEarlierParams<>) -> PublishedBlogsPaginatedByEarlierQuery<'a, C,
    PublishedBlogsPaginatedByEarlier, 2>
    { self.bind(client, &params.published_earlier_than,&params.limit,) }
}pub fn blogs_paginated_by_earlier() -> BlogsPaginatedByEarlierStmt
{ BlogsPaginatedByEarlierStmt(cornucopia_async::private::Stmt::new("select
	*
from
	blogs_blogs
where created_at < $1 
order by created_at desc
limit $2")) } pub struct
BlogsPaginatedByEarlierStmt(cornucopia_async::private::Stmt); impl BlogsPaginatedByEarlierStmt
{ pub fn bind<'a, C:
GenericClient,>(&'a mut self, client: &'a  C,
created_earlier_than: &'a time::OffsetDateTime,limit: &'a i64,) -> BlogsPaginatedByEarlierQuery<'a,C,
BlogsPaginatedByEarlier, 2>
{
    BlogsPaginatedByEarlierQuery
    {
        client, params: [created_earlier_than,limit,], stmt: &mut self.0, extractor:
        |row| { BlogsPaginatedByEarlierBorrowed { id: row.get(0),title: row.get(1),content: row.get(2),published: row.get(3),created_at: row.get(4),published_at: row.get(5),} }, mapper: |it| { <BlogsPaginatedByEarlier>::from(it) },
    }
} }impl <'a, C: GenericClient,> cornucopia_async::Params<'a,
BlogsPaginatedByEarlierParams<>, BlogsPaginatedByEarlierQuery<'a, C,
BlogsPaginatedByEarlier, 2>, C> for BlogsPaginatedByEarlierStmt
{
    fn
    params(&'a mut self, client: &'a  C, params: &'a
    BlogsPaginatedByEarlierParams<>) -> BlogsPaginatedByEarlierQuery<'a, C,
    BlogsPaginatedByEarlier, 2>
    { self.bind(client, &params.created_earlier_than,&params.limit,) }
}pub fn create_blog() -> CreateBlogStmt
{ CreateBlogStmt(cornucopia_async::private::Stmt::new("insert into 
blogs_blogs(title, content)
values($1, $2)
returning *")) } pub struct
CreateBlogStmt(cornucopia_async::private::Stmt); impl CreateBlogStmt
{ pub fn bind<'a, C:
GenericClient,T1:
cornucopia_async::StringSql,T2:
cornucopia_async::StringSql,>(&'a mut self, client: &'a  C,
title: &'a T1,content: &'a T2,) -> CreateBlogQuery<'a,C,
CreateBlog, 2>
{
    CreateBlogQuery
    {
        client, params: [title,content,], stmt: &mut self.0, extractor:
        |row| { CreateBlogBorrowed { id: row.get(0),title: row.get(1),content: row.get(2),published: row.get(3),created_at: row.get(4),published_at: row.get(5),} }, mapper: |it| { <CreateBlog>::from(it) },
    }
} }impl <'a, C: GenericClient,T1: cornucopia_async::StringSql,T2: cornucopia_async::StringSql,> cornucopia_async::Params<'a,
CreateBlogParams<T1,T2,>, CreateBlogQuery<'a, C,
CreateBlog, 2>, C> for CreateBlogStmt
{
    fn
    params(&'a mut self, client: &'a  C, params: &'a
    CreateBlogParams<T1,T2,>) -> CreateBlogQuery<'a, C,
    CreateBlog, 2>
    { self.bind(client, &params.title,&params.content,) }
}pub fn update_blog_details() -> UpdateBlogDetailsStmt
{ UpdateBlogDetailsStmt(cornucopia_async::private::Stmt::new("update blogs_blogs
set title = $1, content = $2
where id = $3
returning *")) } pub struct
UpdateBlogDetailsStmt(cornucopia_async::private::Stmt); impl UpdateBlogDetailsStmt
{ pub fn bind<'a, C:
GenericClient,T1:
cornucopia_async::StringSql,T2:
cornucopia_async::StringSql,>(&'a mut self, client: &'a  C,
title: &'a T1,content: &'a T2,id: &'a uuid::Uuid,) -> UpdateBlogDetailsQuery<'a,C,
UpdateBlogDetails, 3>
{
    UpdateBlogDetailsQuery
    {
        client, params: [title,content,id,], stmt: &mut self.0, extractor:
        |row| { UpdateBlogDetailsBorrowed { id: row.get(0),title: row.get(1),content: row.get(2),published: row.get(3),created_at: row.get(4),published_at: row.get(5),} }, mapper: |it| { <UpdateBlogDetails>::from(it) },
    }
} }impl <'a, C: GenericClient,T1: cornucopia_async::StringSql,T2: cornucopia_async::StringSql,> cornucopia_async::Params<'a,
UpdateBlogDetailsParams<T1,T2,>, UpdateBlogDetailsQuery<'a, C,
UpdateBlogDetails, 3>, C> for UpdateBlogDetailsStmt
{
    fn
    params(&'a mut self, client: &'a  C, params: &'a
    UpdateBlogDetailsParams<T1,T2,>) -> UpdateBlogDetailsQuery<'a, C,
    UpdateBlogDetails, 3>
    { self.bind(client, &params.title,&params.content,&params.id,) }
}pub fn publish_blog() -> PublishBlogStmt
{ PublishBlogStmt(cornucopia_async::private::Stmt::new("update blogs_blogs
set published = true, published_at = now()
where id = $1
returning *")) } pub struct
PublishBlogStmt(cornucopia_async::private::Stmt); impl PublishBlogStmt
{ pub fn bind<'a, C:
GenericClient,>(&'a mut self, client: &'a  C,
id: &'a uuid::Uuid,) -> PublishBlogQuery<'a,C,
PublishBlog, 1>
{
    PublishBlogQuery
    {
        client, params: [id,], stmt: &mut self.0, extractor:
        |row| { PublishBlogBorrowed { id: row.get(0),title: row.get(1),content: row.get(2),published: row.get(3),created_at: row.get(4),published_at: row.get(5),} }, mapper: |it| { <PublishBlog>::from(it) },
    }
} }pub fn get_blog_by_id() -> GetBlogByIdStmt
{ GetBlogByIdStmt(cornucopia_async::private::Stmt::new("select *
from blogs_blogs
where id = $1")) } pub struct
GetBlogByIdStmt(cornucopia_async::private::Stmt); impl GetBlogByIdStmt
{ pub fn bind<'a, C:
GenericClient,>(&'a mut self, client: &'a  C,
id: &'a uuid::Uuid,) -> GetBlogByIdQuery<'a,C,
GetBlogById, 1>
{
    GetBlogByIdQuery
    {
        client, params: [id,], stmt: &mut self.0, extractor:
        |row| { GetBlogByIdBorrowed { id: row.get(0),title: row.get(1),content: row.get(2),published: row.get(3),created_at: row.get(4),published_at: row.get(5),} }, mapper: |it| { <GetBlogById>::from(it) },
    }
} }}}