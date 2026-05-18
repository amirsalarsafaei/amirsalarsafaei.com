use salar_interface::blogs::Blog as BlogPb;
use salar_interface::blogs::{Tag as TagPb, blog::State};

use prost::Message;
use prost_types::Timestamp;
use time::OffsetDateTime;

use crate::db::blogs::BlogWithTags;
use crate::db::tags::TagRow;

pub trait ToProto<T> {
    fn as_proto(&self) -> T;
}

pub fn list_to_proto<T, P>(items: &[T]) -> Vec<P>
where
    T: ToProto<P>,
    P: Message,
{
    items.iter().map(|a| a.as_proto()).collect()
}

fn datetime_to_timestamp(datetime: &OffsetDateTime) -> Timestamp {
    Timestamp {
        nanos: datetime.nanosecond() as i32,
        seconds: datetime.unix_timestamp(),
    }
}

impl ToProto<BlogPb> for BlogWithTags {
    fn as_proto(&self) -> BlogPb {
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
            published_at: self.published_at.as_ref().map(datetime_to_timestamp),
            created_at: Some(datetime_to_timestamp(&self.created_at)),
        }
    }
}

impl ToProto<TagPb> for TagRow {
    fn as_proto(&self) -> TagPb {
        TagPb {
            id: self.id.to_string(),
            name: self.name.clone(),
        }
    }
}
