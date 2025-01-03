use salar_interface::blogs::Blog as BlogPb;
use salar_interface::blogs::{blog::State, Tag as TagPb};

use prost_types::Timestamp;
use time::OffsetDateTime;

use crate::cornucopia::queries::blogs::{Blog, PublishedBlog};
use crate::cornucopia::queries::tags::Tag;
use crate::cornucopia::types::public::BlogsTags;
use prost::Message;

pub trait ToProto<T> {
    fn to_proto(&self) -> T;
}

pub fn list_to_proto<T, P>(items: &Vec<T>) -> Vec<P>
where
    T: ToProto<P>,
    P: Message,
{
    items.iter().map(|a| a.to_proto()).collect()
}

fn datetime_to_timestamp(datetime: &OffsetDateTime) -> Timestamp {
    Timestamp {
        nanos: datetime.nanosecond() as i32,
        seconds: datetime.unix_timestamp(),
    }
}

impl ToProto<BlogPb> for Blog {
    fn to_proto(&self) -> BlogPb {
        BlogPb {
            id: self.id.to_string(),
            content: self.content.clone(),
            title: self.title.clone(),
            image_url: self.image_url.clone(),
            state: if self.published {
                State::Published
            } else {
                State::Draft
            } as i32,
            tags: list_to_proto(&self.tags),
            published_at: match self.published_at {
                Some(p_at) => Some(datetime_to_timestamp(&p_at)),
                None => None,
            },
            created_at: Some(datetime_to_timestamp(&self.created_at)),
        }
    }
}

impl ToProto<BlogPb> for PublishedBlog {
    fn to_proto(&self) -> BlogPb {
        BlogPb {
            id: self.id.to_string(),
            image_url: self.image_url.clone(),
            content: self.content.clone(),
            title: self.title.clone(),
            state: State::Published as i32,
            tags: list_to_proto(&self.tags),
            published_at: Some(datetime_to_timestamp(&self.published_at)),
            created_at: Some(datetime_to_timestamp(&self.created_at)),
        }
    }
}

impl ToProto<TagPb> for BlogsTags {
    fn to_proto(&self) -> TagPb {
        TagPb {
            id: self.id.to_string(),
            name: self.name.clone(),
        }
    }
}

impl ToProto<TagPb> for Tag {
    fn to_proto(&self) -> TagPb {
        TagPb {
            id: self.id.to_string(),
            name: self.name.clone(),
        }
    }
}
