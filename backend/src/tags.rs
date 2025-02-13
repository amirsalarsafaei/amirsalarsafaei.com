use crate::toproto;
use crate::{
    cornucopia::queries::tags::{
        create_tag, delete_blog_tags, delete_tag, get_all_tags, get_blog_tags, insert_blog_tags,
    },
    toproto::ToProto,
};
use deadpool_postgres::Pool;
use log;
use salar_interface::blogs::{
    tags_server::Tags, CreateTagRequest, DeleteTagRequest, ListTagsRequest, ListTagsResponse,
    SetBlogTagsRequest, SetBlogTagsResponse, Tag,
};
use uuid::Uuid;

pub struct TagServicer {
    pool: Pool,
    auth_token: String,
}

impl TagServicer {
    pub fn new(pool: Pool, auth_token: String) -> Self {
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

        let mut connection = self
            .pool
            .get()
            .await
            .map_err(|_| tonic::Status::internal("Could not connect to storage"))?;

        let tx = connection
            .transaction()
            .await
            .map_err(|_| tonic::Status::internal("Could not start storage interaction"))?;

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

        delete_blog_tags()
            .bind(&tx, &blog_id_uuid, &tag_ids_uuid)
            .await
            .map_err(|e| {
                log::error!("could not delete blog tags from database: {}", e);
                tonic::Status::internal("could not delete blog tags")
            })?;

        insert_blog_tags()
            .bind(&tx, &blog_id_uuid, &tag_ids_uuid)
            .await
            .map_err(|e| {
                log::error!("could not insert new tags into database: {}", e);
                tonic::Status::internal("could not insert new tags")
            })?;

        tx.commit().await.map_err(|e| {
                log::error!("could not commit transaction: {}", e);
                tonic::Status::internal("could not finalize changes")
        })?;

        match get_blog_tags().bind(&connection, &blog_id_uuid).all().await {
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
        let connection = self
            .pool
            .get()
            .await
            .map_err(|_| tonic::Status::internal("Could not connect to storage"))?;

        match get_all_tags().bind(&connection).all().await {
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

        let connection = self
            .pool
            .get()
            .await
            .map_err(|_| tonic::Status::internal("Could not connect to storage"))?;

        match create_tag()
            .bind(&connection, &inner_request.name)
            .one()
            .await
        {
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

        let connection = self
            .pool
            .get()
            .await
            .map_err(|_| tonic::Status::internal("Could not connect to storage"))?;

        let id_uuid = Uuid::parse_str(&inner_request.id)
            .map_err(|_| tonic::Status::invalid_argument("invalid id. could not parse uuid"))?;

        match delete_tag().bind(&connection, &id_uuid).opt().await {
            Ok(Some(_id)) => Ok(tonic::Response::new(())),
            Ok(None) => Err(tonic::Status::not_found("the tag not found")),
            Err(err) => {
                log::error!("could not delete tag from database: {}", err);
                Err(tonic::Status::internal("could not delete tag from storage"))
            }
        }
    }
}
