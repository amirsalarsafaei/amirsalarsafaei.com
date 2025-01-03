// This file was generated with `cornucopia`. Do not modify.

#[allow(clippy::all, clippy::pedantic)] #[allow(unused_variables)]
#[allow(unused_imports)] #[allow(dead_code)] pub mod types { pub mod public { #[derive( Debug,postgres_types::FromSql, Clone, PartialEq)]
#[postgres(name = "blogs_tags")] pub struct BlogsTags
{ pub id: uuid::Uuid,pub name: String,}#[derive(Debug)] pub struct BlogsTagsBorrowed<'a>
{ pub id: uuid::Uuid,pub name: &'a str,} impl<'a>
From<BlogsTagsBorrowed<'a>> for BlogsTags
{
    fn
    from(BlogsTagsBorrowed { id,name,}:
    BlogsTagsBorrowed<'a>,) -> Self { Self { id,name: name.into(),} }
}impl<'a> postgres_types::FromSql<'a> for BlogsTagsBorrowed<'a>
{
    fn from_sql(ty: &postgres_types::Type, out: &'a [u8]) ->
    Result<BlogsTagsBorrowed<'a>, Box<dyn std::error::Error + Sync +
    Send>>
    {
        let fields = match *ty.kind()
        {
            postgres_types::Kind::Composite(ref fields) => fields, _ =>
            unreachable!(),
        }; let mut out = out; let num_fields =
        postgres_types::private::read_be_i32(&mut out)?; if num_fields as
        usize != fields.len()
        {
            return
            std::result::Result::Err(std::convert::Into::into(format!("invalid field count: {} vs {}",
            num_fields, fields.len())));
        }
        let _oid = postgres_types::private::read_be_i32(&mut out)?; let
        id =
        postgres_types::private::read_value(fields[0].type_(), &mut
        out)?;let _oid = postgres_types::private::read_be_i32(&mut out)?; let
        name =
        postgres_types::private::read_value(fields[1].type_(), &mut
        out)?;Ok(BlogsTagsBorrowed { id,name,})
    } fn accepts(ty: &postgres_types::Type) -> bool
    { ty.name() == "blogs_tags" && ty.schema() == "public" }
}impl<'a> postgres_types::ToSql for BlogsTagsBorrowed<'a>
{
    fn
    to_sql(&self, ty: &postgres_types::Type, out: &mut
    postgres_types::private::BytesMut,) -> Result<postgres_types::IsNull,
    Box<dyn std::error::Error + Sync + Send>,>
    {
        let BlogsTagsBorrowed { id,name,} = self; let fields = match
        *ty.kind()
        {
            postgres_types::Kind::Composite(ref fields) => fields, _ =>
            unreachable!(),
        }; out.extend_from_slice(&(fields.len() as i32).to_be_bytes()); for
        field in fields
        {
            out.extend_from_slice(&field.type_().oid().to_be_bytes()); let
            base = out.len(); out.extend_from_slice(&[0; 4]); let r = match
            field.name()
            {
                "id" =>
                postgres_types::ToSql::to_sql(id,field.type_(), out),"name" =>
                postgres_types::ToSql::to_sql(name,field.type_(), out),_ => unreachable!()
            }; let count = match r?
            {
                postgres_types::IsNull::Yes => -1, postgres_types::IsNull::No
                =>
                {
                    let len = out.len() - base - 4; if len > i32::max_value() as
                    usize
                    { return Err(Into::into("value too large to transmit")); }
                    len as i32
                }
            }; out[base..base + 4].copy_from_slice(&count.to_be_bytes());
        } Ok(postgres_types::IsNull::No)
    } fn accepts(ty: &postgres_types::Type) -> bool
    {
        if ty.name() != "blogs_tags" { return false; } match *ty.kind()
        {
            postgres_types::Kind::Composite(ref fields) =>
            {
                if fields.len() != 2 { return false; }
                fields.iter().all(|f| match f.name()
                {
                    "id" => <uuid::Uuid as
                    postgres_types::ToSql>::accepts(f.type_()),"name" => <&'a str as
                    postgres_types::ToSql>::accepts(f.type_()),_ => false,
                })
            } _ => false,
        }
    } fn
    to_sql_checked(&self, ty: &postgres_types::Type, out: &mut
    postgres_types::private::BytesMut,) -> Result<postgres_types::IsNull,
    Box<dyn std::error::Error + Sync + Send>>
    { postgres_types::__to_sql_checked(self, ty, out) }
} }}#[allow(clippy::all, clippy::pedantic)] #[allow(unused_variables)]
#[allow(unused_imports)] #[allow(dead_code)] pub mod queries
{ pub mod blogs
{ use futures::{{StreamExt, TryStreamExt}};use futures; use cornucopia_async::GenericClient;#[derive(Clone,Copy, Debug)] pub struct PublishedBlogsPaginatedByEarlierParams<> { pub published_earlier_than: time::OffsetDateTime,pub limit: i64,}#[derive(Clone,Copy, Debug)] pub struct BlogsPaginatedByEarlierParams<> { pub created_earlier_than: time::OffsetDateTime,pub limit: i64,}#[derive( Debug)] pub struct CreateBlogParams<T1: cornucopia_async::StringSql,T2: cornucopia_async::StringSql,T3: cornucopia_async::StringSql,> { pub title: T1,pub content: T2,pub image_url: Option<T3>,}#[derive( Debug)] pub struct UpdateBlogDetailsParams<T1: cornucopia_async::StringSql,T2: cornucopia_async::StringSql,T3: cornucopia_async::StringSql,> { pub title: T1,pub content: T2,pub image_url: Option<T3>,pub id: uuid::Uuid,}#[derive( Debug, Clone, PartialEq,)] pub struct PublishedBlog
{ pub id : uuid::Uuid,pub title : String,pub content : String,pub published : bool,pub created_at : time::OffsetDateTime,pub published_at : time::OffsetDateTime,pub image_url : Option<String>,pub tags : Vec<super::super::types::public::BlogsTags>,}pub struct PublishedBlogBorrowed<'a> { pub id : uuid::Uuid,pub title : &'a str,pub content : &'a str,pub published : bool,pub created_at : time::OffsetDateTime,pub published_at : time::OffsetDateTime,pub image_url : Option<&'a str>,pub tags : cornucopia_async::ArrayIterator<'a, super::super::types::public::BlogsTagsBorrowed<'a>>,}
impl<'a> From<PublishedBlogBorrowed<'a>> for PublishedBlog
{
    fn from(PublishedBlogBorrowed { id,title,content,published,created_at,published_at,image_url,tags,}: PublishedBlogBorrowed<'a>) ->
    Self { Self { id,title: title.into(),content: content.into(),published,created_at,published_at,image_url: image_url.map(|v| v.into()),tags: tags.map(|v| v.into()).collect(),} }
}pub struct PublishedBlogQuery<'a, C: GenericClient, T, const N: usize>
{
    client: &'a  C, params:
    [&'a (dyn postgres_types::ToSql + Sync); N], stmt: &'a mut
    cornucopia_async::private::Stmt, extractor: fn(&tokio_postgres::Row) -> PublishedBlogBorrowed,
    mapper: fn(PublishedBlogBorrowed) -> T,
} impl<'a, C, T:'a, const N: usize> PublishedBlogQuery<'a, C, T, N> where C:
GenericClient
{
    pub fn map<R>(self, mapper: fn(PublishedBlogBorrowed) -> R) ->
    PublishedBlogQuery<'a,C,R,N>
    {
        PublishedBlogQuery
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
}#[derive( Debug, Clone, PartialEq,)] pub struct Blog
{ pub id : uuid::Uuid,pub title : String,pub content : String,pub published : bool,pub created_at : time::OffsetDateTime,pub published_at : Option<time::OffsetDateTime>,pub image_url : Option<String>,pub tags : Vec<super::super::types::public::BlogsTags>,}pub struct BlogBorrowed<'a> { pub id : uuid::Uuid,pub title : &'a str,pub content : &'a str,pub published : bool,pub created_at : time::OffsetDateTime,pub published_at : Option<time::OffsetDateTime>,pub image_url : Option<&'a str>,pub tags : cornucopia_async::ArrayIterator<'a, super::super::types::public::BlogsTagsBorrowed<'a>>,}
impl<'a> From<BlogBorrowed<'a>> for Blog
{
    fn from(BlogBorrowed { id,title,content,published,created_at,published_at,image_url,tags,}: BlogBorrowed<'a>) ->
    Self { Self { id,title: title.into(),content: content.into(),published,created_at,published_at,image_url: image_url.map(|v| v.into()),tags: tags.map(|v| v.into()).collect(),} }
}pub struct BlogQuery<'a, C: GenericClient, T, const N: usize>
{
    client: &'a  C, params:
    [&'a (dyn postgres_types::ToSql + Sync); N], stmt: &'a mut
    cornucopia_async::private::Stmt, extractor: fn(&tokio_postgres::Row) -> BlogBorrowed,
    mapper: fn(BlogBorrowed) -> T,
} impl<'a, C, T:'a, const N: usize> BlogQuery<'a, C, T, N> where C:
GenericClient
{
    pub fn map<R>(self, mapper: fn(BlogBorrowed) -> R) ->
    BlogQuery<'a,C,R,N>
    {
        BlogQuery
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
}pub struct UuidUuidQuery<'a, C: GenericClient, T, const N: usize>
{
    client: &'a  C, params:
    [&'a (dyn postgres_types::ToSql + Sync); N], stmt: &'a mut
    cornucopia_async::private::Stmt, extractor: fn(&tokio_postgres::Row) -> uuid::Uuid,
    mapper: fn(uuid::Uuid) -> T,
} impl<'a, C, T:'a, const N: usize> UuidUuidQuery<'a, C, T, N> where C:
GenericClient
{
    pub fn map<R>(self, mapper: fn(uuid::Uuid) -> R) ->
    UuidUuidQuery<'a,C,R,N>
    {
        UuidUuidQuery
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
	blogs_blogs_with_tags_view
where published_at < $1 and published = true
order by published_at desc
limit $2")) } pub struct
PublishedBlogsPaginatedByEarlierStmt(cornucopia_async::private::Stmt); impl PublishedBlogsPaginatedByEarlierStmt
{ pub fn bind<'a, C:
GenericClient,>(&'a mut self, client: &'a  C,
published_earlier_than: &'a time::OffsetDateTime,limit: &'a i64,) -> PublishedBlogQuery<'a,C,
PublishedBlog, 2>
{
    PublishedBlogQuery
    {
        client, params: [published_earlier_than,limit,], stmt: &mut self.0, extractor:
        |row| { PublishedBlogBorrowed { id: row.get(0),title: row.get(1),content: row.get(2),published: row.get(3),created_at: row.get(4),published_at: row.get(5),image_url: row.get(6),tags: row.get(7),} }, mapper: |it| { <PublishedBlog>::from(it) },
    }
} }impl <'a, C: GenericClient,> cornucopia_async::Params<'a,
PublishedBlogsPaginatedByEarlierParams<>, PublishedBlogQuery<'a, C,
PublishedBlog, 2>, C> for PublishedBlogsPaginatedByEarlierStmt
{
    fn
    params(&'a mut self, client: &'a  C, params: &'a
    PublishedBlogsPaginatedByEarlierParams<>) -> PublishedBlogQuery<'a, C,
    PublishedBlog, 2>
    { self.bind(client, &params.published_earlier_than,&params.limit,) }
}pub fn blogs_paginated_by_earlier() -> BlogsPaginatedByEarlierStmt
{ BlogsPaginatedByEarlierStmt(cornucopia_async::private::Stmt::new("select
	*
from
	blogs_blogs_with_tags_view
where created_at < $1 
order by created_at desc
limit $2")) } pub struct
BlogsPaginatedByEarlierStmt(cornucopia_async::private::Stmt); impl BlogsPaginatedByEarlierStmt
{ pub fn bind<'a, C:
GenericClient,>(&'a mut self, client: &'a  C,
created_earlier_than: &'a time::OffsetDateTime,limit: &'a i64,) -> BlogQuery<'a,C,
Blog, 2>
{
    BlogQuery
    {
        client, params: [created_earlier_than,limit,], stmt: &mut self.0, extractor:
        |row| { BlogBorrowed { id: row.get(0),title: row.get(1),content: row.get(2),published: row.get(3),created_at: row.get(4),published_at: row.get(5),image_url: row.get(6),tags: row.get(7),} }, mapper: |it| { <Blog>::from(it) },
    }
} }impl <'a, C: GenericClient,> cornucopia_async::Params<'a,
BlogsPaginatedByEarlierParams<>, BlogQuery<'a, C,
Blog, 2>, C> for BlogsPaginatedByEarlierStmt
{
    fn
    params(&'a mut self, client: &'a  C, params: &'a
    BlogsPaginatedByEarlierParams<>) -> BlogQuery<'a, C,
    Blog, 2>
    { self.bind(client, &params.created_earlier_than,&params.limit,) }
}pub fn create_blog() -> CreateBlogStmt
{ CreateBlogStmt(cornucopia_async::private::Stmt::new("insert into 
blogs_blogs(title, content, image_url)
values($1, $2, $3)
returning id")) } pub struct
CreateBlogStmt(cornucopia_async::private::Stmt); impl CreateBlogStmt
{ pub fn bind<'a, C:
GenericClient,T1:
cornucopia_async::StringSql,T2:
cornucopia_async::StringSql,T3:
cornucopia_async::StringSql,>(&'a mut self, client: &'a  C,
title: &'a T1,content: &'a T2,image_url: &'a Option<T3>,) -> UuidUuidQuery<'a,C,
uuid::Uuid, 3>
{
    UuidUuidQuery
    {
        client, params: [title,content,image_url,], stmt: &mut self.0, extractor:
        |row| { row.get(0) }, mapper: |it| { it },
    }
} }impl <'a, C: GenericClient,T1: cornucopia_async::StringSql,T2: cornucopia_async::StringSql,T3: cornucopia_async::StringSql,> cornucopia_async::Params<'a,
CreateBlogParams<T1,T2,T3,>, UuidUuidQuery<'a, C,
uuid::Uuid, 3>, C> for CreateBlogStmt
{
    fn
    params(&'a mut self, client: &'a  C, params: &'a
    CreateBlogParams<T1,T2,T3,>) -> UuidUuidQuery<'a, C,
    uuid::Uuid, 3>
    { self.bind(client, &params.title,&params.content,&params.image_url,) }
}pub fn update_blog_details() -> UpdateBlogDetailsStmt
{ UpdateBlogDetailsStmt(cornucopia_async::private::Stmt::new("update blogs_blogs
set title = $1, content = $2, image_url = $3
where id = $4
returning id")) } pub struct
UpdateBlogDetailsStmt(cornucopia_async::private::Stmt); impl UpdateBlogDetailsStmt
{ pub fn bind<'a, C:
GenericClient,T1:
cornucopia_async::StringSql,T2:
cornucopia_async::StringSql,T3:
cornucopia_async::StringSql,>(&'a mut self, client: &'a  C,
title: &'a T1,content: &'a T2,image_url: &'a Option<T3>,id: &'a uuid::Uuid,) -> UuidUuidQuery<'a,C,
uuid::Uuid, 4>
{
    UuidUuidQuery
    {
        client, params: [title,content,image_url,id,], stmt: &mut self.0, extractor:
        |row| { row.get(0) }, mapper: |it| { it },
    }
} }impl <'a, C: GenericClient,T1: cornucopia_async::StringSql,T2: cornucopia_async::StringSql,T3: cornucopia_async::StringSql,> cornucopia_async::Params<'a,
UpdateBlogDetailsParams<T1,T2,T3,>, UuidUuidQuery<'a, C,
uuid::Uuid, 4>, C> for UpdateBlogDetailsStmt
{
    fn
    params(&'a mut self, client: &'a  C, params: &'a
    UpdateBlogDetailsParams<T1,T2,T3,>) -> UuidUuidQuery<'a, C,
    uuid::Uuid, 4>
    { self.bind(client, &params.title,&params.content,&params.image_url,&params.id,) }
}pub fn publish_blog() -> PublishBlogStmt
{ PublishBlogStmt(cornucopia_async::private::Stmt::new("update blogs_blogs
set published = true, published_at = now()
where id = $1
returning id")) } pub struct
PublishBlogStmt(cornucopia_async::private::Stmt); impl PublishBlogStmt
{ pub fn bind<'a, C:
GenericClient,>(&'a mut self, client: &'a  C,
id: &'a uuid::Uuid,) -> UuidUuidQuery<'a,C,
uuid::Uuid, 1>
{
    UuidUuidQuery
    {
        client, params: [id,], stmt: &mut self.0, extractor:
        |row| { row.get(0) }, mapper: |it| { it },
    }
} }pub fn get_blog_by_id() -> GetBlogByIdStmt
{ GetBlogByIdStmt(cornucopia_async::private::Stmt::new("select *
from blogs_blogs_with_tags_view
where id = $1")) } pub struct
GetBlogByIdStmt(cornucopia_async::private::Stmt); impl GetBlogByIdStmt
{ pub fn bind<'a, C:
GenericClient,>(&'a mut self, client: &'a  C,
id: &'a uuid::Uuid,) -> BlogQuery<'a,C,
Blog, 1>
{
    BlogQuery
    {
        client, params: [id,], stmt: &mut self.0, extractor:
        |row| { BlogBorrowed { id: row.get(0),title: row.get(1),content: row.get(2),published: row.get(3),created_at: row.get(4),published_at: row.get(5),image_url: row.get(6),tags: row.get(7),} }, mapper: |it| { <Blog>::from(it) },
    }
} }}pub mod tags
{ use futures::{{StreamExt, TryStreamExt}};use futures; use cornucopia_async::GenericClient;#[derive( Debug)] pub struct InsertBlogTagsParams<T1: cornucopia_async::ArraySql<Item = uuid::Uuid>,> { pub blog_id: uuid::Uuid,pub tag_ids: T1,}#[derive( Debug)] pub struct DeleteBlogTagsParams<T1: cornucopia_async::ArraySql<Item = uuid::Uuid>,> { pub blog_id: uuid::Uuid,pub tag_ids: T1,}#[derive( Debug, Clone, PartialEq,)] pub struct Tag
{ pub id : uuid::Uuid,pub name : String,}pub struct TagBorrowed<'a> { pub id : uuid::Uuid,pub name : &'a str,}
impl<'a> From<TagBorrowed<'a>> for Tag
{
    fn from(TagBorrowed { id,name,}: TagBorrowed<'a>) ->
    Self { Self { id,name: name.into(),} }
}pub struct TagQuery<'a, C: GenericClient, T, const N: usize>
{
    client: &'a  C, params:
    [&'a (dyn postgres_types::ToSql + Sync); N], stmt: &'a mut
    cornucopia_async::private::Stmt, extractor: fn(&tokio_postgres::Row) -> TagBorrowed,
    mapper: fn(TagBorrowed) -> T,
} impl<'a, C, T:'a, const N: usize> TagQuery<'a, C, T, N> where C:
GenericClient
{
    pub fn map<R>(self, mapper: fn(TagBorrowed) -> R) ->
    TagQuery<'a,C,R,N>
    {
        TagQuery
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
}pub struct UuidUuidQuery<'a, C: GenericClient, T, const N: usize>
{
    client: &'a  C, params:
    [&'a (dyn postgres_types::ToSql + Sync); N], stmt: &'a mut
    cornucopia_async::private::Stmt, extractor: fn(&tokio_postgres::Row) -> uuid::Uuid,
    mapper: fn(uuid::Uuid) -> T,
} impl<'a, C, T:'a, const N: usize> UuidUuidQuery<'a, C, T, N> where C:
GenericClient
{
    pub fn map<R>(self, mapper: fn(uuid::Uuid) -> R) ->
    UuidUuidQuery<'a,C,R,N>
    {
        UuidUuidQuery
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
}pub fn get_all_tags() -> GetAllTagsStmt
{ GetAllTagsStmt(cornucopia_async::private::Stmt::new("select
	*
from
	blogs_tags")) } pub struct
GetAllTagsStmt(cornucopia_async::private::Stmt); impl GetAllTagsStmt
{ pub fn bind<'a, C:
GenericClient,>(&'a mut self, client: &'a  C,
) -> TagQuery<'a,C,
Tag, 0>
{
    TagQuery
    {
        client, params: [], stmt: &mut self.0, extractor:
        |row| { TagBorrowed { id: row.get(0),name: row.get(1),} }, mapper: |it| { <Tag>::from(it) },
    }
} }pub fn create_tag() -> CreateTagStmt
{ CreateTagStmt(cornucopia_async::private::Stmt::new("insert into
blogs_tags(name)
values($1)
returning *")) } pub struct
CreateTagStmt(cornucopia_async::private::Stmt); impl CreateTagStmt
{ pub fn bind<'a, C:
GenericClient,T1:
cornucopia_async::StringSql,>(&'a mut self, client: &'a  C,
name: &'a T1,) -> TagQuery<'a,C,
Tag, 1>
{
    TagQuery
    {
        client, params: [name,], stmt: &mut self.0, extractor:
        |row| { TagBorrowed { id: row.get(0),name: row.get(1),} }, mapper: |it| { <Tag>::from(it) },
    }
} }pub fn delete_tag() -> DeleteTagStmt
{ DeleteTagStmt(cornucopia_async::private::Stmt::new("delete from
blogs_tags
where id=$1
returning id")) } pub struct
DeleteTagStmt(cornucopia_async::private::Stmt); impl DeleteTagStmt
{ pub fn bind<'a, C:
GenericClient,>(&'a mut self, client: &'a  C,
id: &'a uuid::Uuid,) -> UuidUuidQuery<'a,C,
uuid::Uuid, 1>
{
    UuidUuidQuery
    {
        client, params: [id,], stmt: &mut self.0, extractor:
        |row| { row.get(0) }, mapper: |it| { it },
    }
} }pub fn insert_blog_tags() -> InsertBlogTagsStmt
{ InsertBlogTagsStmt(cornucopia_async::private::Stmt::new("insert into blogs_blog_tags(blog_id, tag_id)
select $1, id
from blogs_tags
where id = any($2) on conflict (blog_id, tag_id) do nothing")) } pub struct
InsertBlogTagsStmt(cornucopia_async::private::Stmt); impl InsertBlogTagsStmt
{ pub async fn bind<'a, C:
GenericClient,T1:
cornucopia_async::ArraySql<Item = uuid::Uuid>,>(&'a mut self, client: &'a  C,
blog_id: &'a uuid::Uuid,tag_ids: &'a T1,) -> Result<u64, tokio_postgres::Error>
{
    let stmt = self.0.prepare(client).await?;
    client.execute(stmt, &[blog_id,tag_ids,]).await
} }impl <'a, C: GenericClient + Send + Sync, T1: cornucopia_async::ArraySql<Item = uuid::Uuid>,>
cornucopia_async::Params<'a, InsertBlogTagsParams<T1,>, std::pin::Pin<Box<dyn futures::Future<Output = Result<u64,
tokio_postgres::Error>> + Send + 'a>>, C> for InsertBlogTagsStmt
{
    fn
    params(&'a mut self, client: &'a  C, params: &'a
    InsertBlogTagsParams<T1,>) -> std::pin::Pin<Box<dyn futures::Future<Output = Result<u64,
    tokio_postgres::Error>> + Send + 'a>>
    { Box::pin(self.bind(client, &params.blog_id,&params.tag_ids,)) }
}pub fn delete_blog_tags() -> DeleteBlogTagsStmt
{ DeleteBlogTagsStmt(cornucopia_async::private::Stmt::new("delete from
blogs_blog_tags
where blog_id = $1 and tag_id != any($2)")) } pub struct
DeleteBlogTagsStmt(cornucopia_async::private::Stmt); impl DeleteBlogTagsStmt
{ pub async fn bind<'a, C:
GenericClient,T1:
cornucopia_async::ArraySql<Item = uuid::Uuid>,>(&'a mut self, client: &'a  C,
blog_id: &'a uuid::Uuid,tag_ids: &'a T1,) -> Result<u64, tokio_postgres::Error>
{
    let stmt = self.0.prepare(client).await?;
    client.execute(stmt, &[blog_id,tag_ids,]).await
} }impl <'a, C: GenericClient + Send + Sync, T1: cornucopia_async::ArraySql<Item = uuid::Uuid>,>
cornucopia_async::Params<'a, DeleteBlogTagsParams<T1,>, std::pin::Pin<Box<dyn futures::Future<Output = Result<u64,
tokio_postgres::Error>> + Send + 'a>>, C> for DeleteBlogTagsStmt
{
    fn
    params(&'a mut self, client: &'a  C, params: &'a
    DeleteBlogTagsParams<T1,>) -> std::pin::Pin<Box<dyn futures::Future<Output = Result<u64,
    tokio_postgres::Error>> + Send + 'a>>
    { Box::pin(self.bind(client, &params.blog_id,&params.tag_ids,)) }
}pub fn get_blog_tags() -> GetBlogTagsStmt
{ GetBlogTagsStmt(cornucopia_async::private::Stmt::new("select bt.*
from blogs_blog_tags bbt
join blogs_tags bt on bbt.tag_id = bt.id
where blog_id = $1")) } pub struct
GetBlogTagsStmt(cornucopia_async::private::Stmt); impl GetBlogTagsStmt
{ pub fn bind<'a, C:
GenericClient,>(&'a mut self, client: &'a  C,
blog_id: &'a uuid::Uuid,) -> TagQuery<'a,C,
Tag, 1>
{
    TagQuery
    {
        client, params: [blog_id,], stmt: &mut self.0, extractor:
        |row| { TagBorrowed { id: row.get(0),name: row.get(1),} }, mapper: |it| { <Tag>::from(it) },
    }
} }}}