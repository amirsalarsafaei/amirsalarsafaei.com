use crate::cornucopia::queries::blogs::{
    blogs_paginated_by_earlier, create_blog, get_blog_by_id, publish_blog,
    published_blogs_paginated_by_earlier, update_blog_details,
};
use base64::{engine::general_purpose::URL_SAFE, Engine};
use deadpool_postgres::Pool;
use log;
use prost::Message;
use time::OffsetDateTime;
use tonic;
use uuid::Uuid;

use prost_types::Timestamp;
use salar_interface::blogs::blogs_server::Blogs;
use salar_interface::blogs::{
    blog::State, Blog, CreateBlogRequest, CreateBlogResponse, GetBlogRequest, GetBlogResponse,
    ListBlogsPaginationToken, ListBlogsRequest, ListBlogsResponse,
    ListPublishedBlogsPaginationToken, ListPublishedBlogsRequest, ListPublishedBlogsResponse,
    PublishBlogRequest, PublishBlogResponse, UpdateBlogRequest, UpdateBlogResponse,
};

pub struct BlogServicer {
    pool: Pool,
    auth_token: String,
}

impl BlogServicer {
    pub fn new(pool: Pool, auth_token: String) -> Self {
        Self { pool, auth_token }
    }
}

impl BlogServicer {
    fn create_list_published_blogs_pagination_token(&self, last_published_at: Timestamp) -> String {
        URL_SAFE.encode(
            ListPublishedBlogsPaginationToken {
                last_published_at: Some(last_published_at),
            }
            .encode_to_vec(),
        )
    }

    fn create_list_blogs_pagination_token(&self, last_created_at: Timestamp) -> String {
        URL_SAFE.encode(
            ListBlogsPaginationToken {
                last_created_at: Some(last_created_at),
            }
            .encode_to_vec(),
        )
    }

    fn datetime_to_timestamp(&self, datetime: OffsetDateTime) -> Timestamp {
        Timestamp {
            nanos: datetime.nanosecond() as i32,
            seconds: datetime.unix_timestamp(),
        }
    }

    fn parse_list_published_blogs_pagination_token(
        &self,
        token: &str,
    ) -> Result<OffsetDateTime, tonic::Status> {
        let decoded = URL_SAFE
            .decode(token)
            .map_err(|_| tonic::Status::invalid_argument("Invalid pagination token"))?;

        let pagination_token = ListPublishedBlogsPaginationToken::decode(decoded.as_slice())
            .map_err(|_| tonic::Status::invalid_argument("Invalid pagination token"))?;

        pagination_token
            .last_published_at
            .map(|ts| {
                OffsetDateTime::from_unix_timestamp(ts.seconds)
                    .map_err(|_| tonic::Status::invalid_argument("Invalid timestamp value"))
            })
            .transpose()?
            .ok_or_else(|| tonic::Status::invalid_argument("Missing timestamp in token"))
    }

    fn parse_list_blogs_pagination_token(
        &self,
        token: &str,
    ) -> Result<OffsetDateTime, tonic::Status> {
        let decoded = URL_SAFE
            .decode(token)
            .map_err(|_| tonic::Status::invalid_argument("Invalid pagination token"))?;

        let pagination_token = ListBlogsPaginationToken::decode(decoded.as_slice())
            .map_err(|_| tonic::Status::invalid_argument("Invalid pagination token"))?;

        pagination_token
            .last_created_at
            .map(|ts| {
                OffsetDateTime::from_unix_timestamp(ts.seconds)
                    .map_err(|_| tonic::Status::invalid_argument("Invalid timestamp value"))
            })
            .transpose()?
            .ok_or_else(|| tonic::Status::invalid_argument("Missing timestamp in token"))
    }

    fn get_next_list_published_page_token(&self, blogs: &[Blog]) -> String {
        let last_timestamp = blogs.last().and_then(|b| b.published_at.clone());

        match last_timestamp {
            Some(ts) => self.create_list_published_blogs_pagination_token(ts),
            None => "".to_string(),
        }
    }

    fn get_next_list_page_token(&self, blogs: &[Blog]) -> String {
        let last_timestamp = blogs.last().and_then(|b| b.created_at.clone());

        match last_timestamp {
            Some(ts) => self.create_list_blogs_pagination_token(ts),
            None => "".to_string(),
        }
    }

    fn check_auth_token(&self, md: &tonic::metadata::MetadataMap) -> Result<(), tonic::Status> {
        match md.get("authorization") {
            Some(user_auth_key) => {
                if &self.auth_token == user_auth_key {
                    Ok(())
                } else {
                    Err(tonic::Status::unauthenticated("invalid credentials"))
                }
            }
            None => Err(tonic::Status::unauthenticated("authorizatoin not provided")),
        }
    }
}

#[tonic::async_trait]
impl Blogs for BlogServicer {
    async fn list_published_blogs(
        &self,
        request: tonic::Request<ListPublishedBlogsRequest>,
    ) -> Result<tonic::Response<ListPublishedBlogsResponse>, tonic::Status> {
        let last_published_at = if request.get_ref().page_token.is_empty() {
            OffsetDateTime::now_utc()
        } else {
            self.parse_list_published_blogs_pagination_token(
                &request.get_ref().page_token.as_str(),
            )?
        };

        let page_size = match request.get_ref().page_size {
            0 => 20,
            x => x,
        } as i64;

        let connection = self
            .pool
            .get()
            .await
            .map_err(|_| tonic::Status::internal("Could not connect to storage"))?;

        match published_blogs_paginated_by_earlier()
            .bind(&connection, &last_published_at, &page_size)
            .all()
            .await
        {
            Ok(blogs) => {
                let blogs_pb: Vec<Blog> = blogs
                    .iter()
                    .map(|blog| Blog {
                        id: blog.id.to_string(),
                        image_url: blog.image_url.clone(),
                        content: blog.content.clone(),
                        title: blog.title.clone(),
                        state: State::Published as i32,
                        tags: vec![],
                        published_at: Some(self.datetime_to_timestamp(blog.published_at)),
                        created_at: Some(self.datetime_to_timestamp(blog.created_at)),
                    })
                    .collect();

                Ok(tonic::Response::new(ListPublishedBlogsResponse {
                    next_page_token: self.get_next_list_published_page_token(&blogs_pb),
                    blogs: blogs_pb,
                }))
            }
            Err(err) => {
                log::error!("could not get list of blogs from database: {}", err);
                Err(tonic::Status::internal(
                    "Could not get list of blogs from storage",
                ))
            }
        }
    }

    async fn get_blog(
        &self,
        request: tonic::Request<GetBlogRequest>,
    ) -> Result<tonic::Response<GetBlogResponse>, tonic::Status> {
        let connection = self
            .pool
            .get()
            .await
            .map_err(|_| tonic::Status::internal("Could not connect to storage"))?;

        let uuid_str = Uuid::try_parse(&request.get_ref().id)
            .map_err(|_| tonic::Status::invalid_argument("invalid uuid was provided"))?;

        match get_blog_by_id().bind(&connection, &uuid_str).opt().await {
            Ok(Some(blog)) => Ok(tonic::Response::new(GetBlogResponse {
                blog: Some(Blog {
                    id: blog.id.to_string(),
                    content: blog.content.clone(),
                    title: blog.title.clone(),
                    image_url: blog.image_url.clone(),
                    state: if blog.published {
                        State::Published
                    } else {
                        State::Draft
                    } as i32,
                    tags: vec![],
                    published_at: match blog.published_at {
                        Some(p_at) => Some(self.datetime_to_timestamp(p_at)),
                        None => None,
                    },
                    created_at: Some(self.datetime_to_timestamp(blog.created_at)),
                }),
            })),
            Ok(None) => Err(tonic::Status::not_found("The blog not found")),
            Err(err) => {
                log::error!("could not get blog from database: {}", err);
                Err(tonic::Status::internal("Could not get blog from storage"))
            }
        }
    }

    async fn create_blog(
        &self,
        request: tonic::Request<CreateBlogRequest>,
    ) -> Result<tonic::Response<CreateBlogResponse>, tonic::Status> {
        self.check_auth_token(request.metadata())?;

        let connection = self
            .pool
            .get()
            .await
            .map_err(|_| tonic::Status::internal("Could not connect to storage"))?;

        match create_blog()
            .bind(
                &connection,
                &request.get_ref().title,
                &request.get_ref().content,
                &request.get_ref().image_url,
            )
            .one()
            .await
        {
            Ok(blog) => Ok(tonic::Response::new(CreateBlogResponse {
                blog: Some(Blog {
                    id: blog.id.to_string(),
                    content: blog.content.clone(),
                    title: blog.title.clone(),
                    image_url: blog.image_url.clone(),
                    state: if blog.published {
                        State::Published
                    } else {
                        State::Draft
                    } as i32,
                    tags: vec![],
                    published_at: match blog.published_at {
                        Some(p_at) => Some(self.datetime_to_timestamp(p_at)),
                        None => None,
                    },
                    created_at: Some(self.datetime_to_timestamp(blog.created_at)),
                }),
            })),
            Err(err) => {
                log::error!("could not create blog in database: {}", err);
                Err(tonic::Status::internal("Could not add blog to storage"))
            }
        }
    }

    async fn update_blog(
        &self,
        request: tonic::Request<UpdateBlogRequest>,
    ) -> Result<tonic::Response<UpdateBlogResponse>, tonic::Status> {
        self.check_auth_token(request.metadata())?;

        let connection = self
            .pool
            .get()
            .await
            .map_err(|_| tonic::Status::internal("Could not connect to storage"))?;

        let uuid_str = Uuid::try_parse(&request.get_ref().id)
            .map_err(|_| tonic::Status::invalid_argument("invalid uuid was provided"))?;

        match update_blog_details()
            .bind(
                &connection,
                &request.get_ref().title,
                &request.get_ref().content,
                &request.get_ref().image_url.clone(),
                &uuid_str,
            )
            .opt()
            .await
        {
            Ok(Some(blog)) => Ok(tonic::Response::new(UpdateBlogResponse {
                blog: Some(Blog {
                    id: blog.id.to_string(),
                    content: blog.content.clone(),
                    title: blog.title.clone(),
                    image_url: blog.image_url.clone(),
                    state: if blog.published {
                        State::Published
                    } else {
                        State::Draft
                    } as i32,
                    tags: vec![],
                    published_at: match blog.published_at {
                        Some(p_at) => Some(self.datetime_to_timestamp(p_at)),
                        None => None,
                    },
                    created_at: Some(self.datetime_to_timestamp(blog.created_at)),
                }),
            })),
            Ok(None) => Err(tonic::Status::not_found("Blog not found")),
            Err(err) => {
                log::error!("could not update blog in database: {}", err);
                Err(tonic::Status::internal("Could not update blog in storage"))
            }
        }
    }

    async fn publish_blog(
        &self,
        request: tonic::Request<PublishBlogRequest>,
    ) -> Result<tonic::Response<PublishBlogResponse>, tonic::Status> {
        self.check_auth_token(request.metadata())?;

        let connection = self
            .pool
            .get()
            .await
            .map_err(|_| tonic::Status::internal("Could not connect to storage"))?;

        let uuid_str = Uuid::try_parse(&request.get_ref().id)
            .map_err(|_| tonic::Status::invalid_argument("invalid uuid was provided"))?;

        match publish_blog().bind(&connection, &uuid_str).opt().await {
            Ok(Some(blog)) => Ok(tonic::Response::new(PublishBlogResponse {
                blog: Some(Blog {
                    id: blog.id.to_string(),
                    content: blog.content.clone(),
                    title: blog.title.clone(),
                    image_url: blog.image_url.clone(),
                    state: if blog.published {
                        State::Published
                    } else {
                        State::Draft
                    } as i32,
                    tags: vec![],
                    published_at: Some(self.datetime_to_timestamp(blog.published_at)),
                    created_at: Some(self.datetime_to_timestamp(blog.created_at)),
                }),
            })),
            Ok(None) => Err(tonic::Status::not_found("Blog not found")),
            Err(err) => {
                log::error!("could not publish blog in database: {}", err);
                Err(tonic::Status::internal("Could not publish blog in storage"))
            }
        }
    }

    async fn list_blogs(
        &self,
        request: tonic::Request<ListBlogsRequest>,
    ) -> Result<tonic::Response<ListBlogsResponse>, tonic::Status> {
        self.check_auth_token(request.metadata())?;

        let last_created_at = if request.get_ref().page_token.is_empty() {
            OffsetDateTime::now_utc()
        } else {
            self.parse_list_blogs_pagination_token(&request.get_ref().page_token.as_str())?
        };

        let page_size = match request.get_ref().page_size {
            0 => 20,
            x => x,
        } as i64;

        let connection = self
            .pool
            .get()
            .await
            .map_err(|_| tonic::Status::internal("Could not connect to storage"))?;

        match blogs_paginated_by_earlier()
            .bind(&connection, &last_created_at, &page_size)
            .all()
            .await
        {
            Ok(blogs) => {
                let blogs_pb: Vec<Blog> = blogs
                    .iter()
                    .map(|blog| Blog {
                        id: blog.id.to_string(),
                        content: blog.content.clone(),
                        title: blog.title.clone(),
                        image_url: blog.image_url.clone(),
                        state: if blog.published {
                            State::Published
                        } else {
                            State::Draft
                        } as i32,
                        tags: vec![],
                        published_at: match blog.published_at {
                            Some(p_at) => Some(self.datetime_to_timestamp(p_at)),
                            None => None,
                        },
                        created_at: Some(self.datetime_to_timestamp(blog.created_at)),
                    })
                    .collect();

                Ok(tonic::Response::new(ListBlogsResponse {
                    next_page_token: self.get_next_list_page_token(&blogs_pb),
                    blogs: blogs_pb,
                }))
            }
            Err(err) => {
                log::error!("could not get list of blogs from database: {}", err);
                Err(tonic::Status::internal(
                    "Could not get list of blogs from storage",
                ))
            }
        }
    }
}
