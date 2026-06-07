use salar_interface::profile::{
    GetProfileRequest, GetProfileResponse, Link, profile_server::Profile,
};

/// Single source of truth for the "about me" content shared by every client
/// (website + SSH terminal). The bio is Markdown so consumers can render it
/// however they like.
const PROFILE_NAME: &str = "AmirSalar Safaei";
const PROFILE_TITLE: &str = "Software Engineer & System Architect";

const PROFILE_BIO: &str = r#"Hello! I'm a passionate software engineer currently pursuing my
M.Sc. in Computer Science at the University of British Columbia.

I love building distributed systems and writing type-safe, maintainable code.
Currently working at **Divar**, where I help millions of users buy and sell
items efficiently.

## When I'm not coding

- Contributing to open source projects
- Exploring new programming languages
- Solving competitive programming problems
- Reading about system design patterns

I believe in writing clean, maintainable code and building systems that scale.
My journey started with the Informatics Olympiad (competitive programming) and
it continues with curiosity about how things work under the hood.

## Toolbox

> Rust · Go · TypeScript · Python · gRPC · PostgreSQL · Kubernetes · Distributed Systems"#;

#[derive(Default)]
pub struct ProfileServicer {}

impl ProfileServicer {
    pub fn new() -> Self {
        Self {}
    }
}

#[tonic::async_trait]
impl Profile for ProfileServicer {
    async fn get_profile(
        &self,
        _request: tonic::Request<GetProfileRequest>,
    ) -> Result<tonic::Response<GetProfileResponse>, tonic::Status> {
        Ok(tonic::Response::new(GetProfileResponse {
            name: PROFILE_NAME.to_string(),
            title: PROFILE_TITLE.to_string(),
            bio: PROFILE_BIO.to_string(),
            links: vec![
                Link {
                    label: "Website".to_string(),
                    url: "https://amirsalarsafaei.com".to_string(),
                },
                Link {
                    label: "SSH".to_string(),
                    url: "ssh ssh.amirsalarsafaei.com".to_string(),
                },
                Link {
                    label: "GitHub".to_string(),
                    url: "https://github.com/amirsalarsafaei".to_string(),
                },
            ],
        }))
    }
}
