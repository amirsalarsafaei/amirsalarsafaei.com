use crate::db;
use crate::toproto::{self, ToProto};
use log;
use salar_interface::blogs::{
    tags_server::Tags, CreateTagRequest, DeleteTagRequest, ListTagsRequest, ListTagsResponse,
    SetBlogTagsRequest, SetBlogTagsResponse, Tag,
};
use sqlx::PgPool;
use uuid::Uuid;

pub struct TagServicer {
    pool: PgPool,
    auth_token: String,
}

impl TagServicer {
    pub fn new(pool: PgPool, auth_token: String) -> Self {
        Self { pool, auth_token }
    }
}

impl TagServicer {
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
impl Tags for TagServicer {
    async fn set_blog_tags(
        &self,
        request: tonic::Request<SetBlogTagsRequest>,
    ) -> Result<tonic::Response<SetBlogTagsResponse>, tonic::Status> {
        let (metadata, _, inner_request) = request.into_parts();
        self.check_auth_token(&metadata)?;

        let blog_id_uuid = Uuid::parse_str(&inner_request.blog_id)
            .map_err(|_| tonic::Status::invalid_argument("invalid blog_id"))?;

        let tag_ids_uuid: Vec<Uuid> = inner_request
            .tag_names
            .iter()
            .map(|item| {
                Uuid::parse_str(item).map_err(|_| {
                    tonic::Status::invalid_argument(format!("invalid tag id: {}", item))
                })
            })
            .collect::<Result<_, _>>()?;

        db::tags::delete_blog_tags(&self.pool, &blog_id_uuid, &tag_ids_uuid)
            .await
            .map_err(|e| {
                log::error!("could not delete blog tags from database: {}", e);
                tonic::Status::internal("could not delete blog tags")
            })?;

        db::tags::insert_blog_tags(&self.pool, &blog_id_uuid, &tag_ids_uuid)
            .await
            .map_err(|e| {
                log::error!("could not insert new tags into database: {}", e);
                tonic::Status::internal("could not insert new tags")
            })?;

        match db::tags::tags_for_blog(&self.pool, &blog_id_uuid).await {
            Ok(tags) => Ok(tonic::Response::new(SetBlogTagsResponse {
                tags: toproto::list_to_proto(&tags),
            })),
            Err(err) => {
                log::error!(
                    "could not get blog tags after setting from database: {}",
                    err
                );
                Err(tonic::Status::internal("could not get blog tags"))
            }
        }
    }

    async fn list_tags(
        &self,
        _request: tonic::Request<ListTagsRequest>,
    ) -> Result<tonic::Response<ListTagsResponse>, tonic::Status> {
        match db::tags::all_tags(&self.pool).await {
            Ok(tags) => Ok(tonic::Response::new(ListTagsResponse {
                tags: toproto::list_to_proto(&tags),
            })),
            Err(err) => {
                log::error!("could not get all tags from database: {}", err);
                Err(tonic::Status::internal("could not get tags from storage"))
            }
        }
    }

    async fn create_tag(
        &self,
        request: tonic::Request<CreateTagRequest>,
    ) -> Result<tonic::Response<Tag>, tonic::Status> {
        let (metadata, _, inner_request) = request.into_parts();
        self.check_auth_token(&metadata)?;

        match db::tags::create_tag(&self.pool, &inner_request.name).await {
            Ok(tag) => Ok(tonic::Response::new(tag.as_proto())),
            Err(err) => {
                log::error!("could not create tag in database: {}", err);
                Err(tonic::Status::internal("could not create tag in storage"))
            }
        }
    }

    async fn delete_tag(
        &self,
        request: tonic::Request<DeleteTagRequest>,
    ) -> Result<tonic::Response<()>, tonic::Status> {
        let (metadata, _, inner_request) = request.into_parts();
        self.check_auth_token(&metadata)?;

        let id_uuid = Uuid::parse_str(&inner_request.id)
            .map_err(|_| tonic::Status::invalid_argument("invalid id. could not parse uuid"))?;

        match db::tags::delete_tag(&self.pool, &id_uuid).await {
            Ok(Some(_id)) => Ok(tonic::Response::new(())),
            Ok(None) => Err(tonic::Status::not_found("the tag not found")),
            Err(err) => {
                log::error!("could not delete tag from database: {}", err);
                Err(tonic::Status::internal("could not delete tag from storage"))
            }
        }
    }
}
