use salar_interface::profile::{
    GetProfileRequest, GetProfileResponse, Link, Resume, ResumeSection, Skill,
    profile_server::Profile, skill::Level,
};

/// Single source of truth for the "about me" content shared by every client
/// (website + SSH terminal). Bio / current focus / resume bodies are Markdown
/// (or preformatted text) so consumers can render them however they like.
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

const CURRENT_FOCUS: &str = r#"# Current Focus 🎯

## At Work (Divar)
- Building scalable backend services
- Improving system performance and reliability

## Personal Projects
- Contributing to open source projects
- Building developer tools and libraries

## Learning
- Advanced system design patterns
- Kubernetes and cloud-native technologies"#;

const RESUME_FULL_NAME: &str = "AmirSalar Safaei Ghaderi";
const RESUME_EMAIL: &str = "amirsalarsafaeighaderi@gmail.com";
const RESUME_GITHUB_URL: &str = "https://github.com/amirsalarsafaei";

#[derive(Default)]
pub struct ProfileServicer {}

impl ProfileServicer {
    pub fn new() -> Self {
        Self {}
    }
}

fn skill(name: &str, level: Level) -> Skill {
    Skill {
        name: name.to_string(),
        level: level as i32,
    }
}

fn section(heading: &str, body: &str) -> ResumeSection {
    ResumeSection {
        heading: heading.to_string(),
        body: body.to_string(),
    }
}

fn link(label: &str, url: &str) -> Link {
    Link {
        label: label.to_string(),
        url: url.to_string(),
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
            current_focus: CURRENT_FOCUS.to_string(),
            skills: vec![
                skill("golang", Level::Expert),
                skill("python", Level::Expert),
                skill("typescript", Level::Expert),
                skill("rust", Level::Proficient),
                skill("java", Level::Proficient),
                skill("cpp", Level::Learning),
                skill("distributed-systems", Level::Passion),
                skill("concurrent-programming", Level::Passion),
                skill("type-safety", Level::Passion),
                skill("open-source", Level::Passion),
            ],
            resume: Some(Resume {
                full_name: RESUME_FULL_NAME.to_string(),
                email: RESUME_EMAIL.to_string(),
                github_url: RESUME_GITHUB_URL.to_string(),
                sections: vec![
                    section(
                        "Education",
                        "Sharif University of Technology Tehran, Iran\n\
                         Bachelors of science in Computer science\n\
                         GPA: 17.9/20\n\
                         2020 - 2025",
                    ),
                    section(
                        "Research Interests",
                        "• Software Engineering\n\
                         • Databases\n\
                         • Distributed Systems\n\
                         • Operating Systems",
                    ),
                    section(
                        "Work Experience",
                        "[Divar] Mid-to-Senior Software Engineer (April 2023 - Current)\n\
                         Iran's largest tech platform\n\n\
                         • System owner of Open-Platform (Kenar Github Docs)\n\
                         • Improved API gateway latency using Open Policy Agent (OPA)\n  \
                           - Reduced latency from 200ms to <5ms at 99.9% quantile\n  \
                           - Applied policy code generation\n  \
                           - Contributed to OPA Envoy plugin\n\
                         • Designed & implemented rate-limiting system in GRPC\n\
                         • Developed custom OAuth server per RFC specs\n\
                         • Created cross-datacenter business logic sync system\n\
                         • Enhanced security against SSRF and Open-Redirect\n\n\
                         [CafeBazaar] Software Engineer (July 2022 – April 2023)\n\n\
                         • Built e-commerce platform with Django-Tenants\n\
                         • Integrated Auto-TLS certificates via Caddy\n\
                         • Optimized PostgreSQL schema creation",
                    ),
                    section(
                        "Awards",
                        "• National University Entrance Exam: Rank 466/155k (2020)\n\
                         • Iran National Olympiad in Informatics: Silver Medal (2019)\n  \
                           - Focus: combinatorics, graph theory, automata theory, algorithms",
                    ),
                    section(
                        "Teaching & Volunteering",
                        "[Teaching Assistant] Fall 2021 - Current\n\
                         • Basic Programming (Fall 2021)\n\
                         • Principal of Computer Systems (Fall 2022)\n\
                         • Advanced Programming (Winter 2023)\n\
                         • Probability Theory (Winter 2023)\n\
                         • Operating Systems (Fall 2024)\n\n\
                         [Other Activities]\n\
                         • IOI Exam Grader (2021)\n\
                         • IOI Tutor (Aug 2020 – Jul 2022)\n  \
                           - Taught algorithms & graph theory\n  \
                           - Topics: shortest paths, SCC, DSU, MST, LCA, 2-SAT",
                    ),
                    section(
                        "Projects",
                        "[SQLC PGX Monitoring]\n\
                         • Database query debugging & timing tool\n\
                         • Built with Sqlc & pgx (Golang)\n\n\
                         [Raspberry AI Assistant]\n\
                         • Implemented Silero VAD & facial recognition\n\
                         • Integrated Neo4j knowledge graph\n\
                         • Used Gemini & Whisper for conversation\n\n\
                         [3D Terminal Laptop]\n\
                         • Interactive 3D laptop model with Three.js\n\
                         • Functional terminal emulator\n\
                         • Basic filesystem commands",
                    ),
                    section(
                        "Competitions",
                        "• LLM Hackathon 2024 - First Place\n  \
                           - Quantized Falcon model for low-end systems\n  \
                           - Achieved 7GB memory usage without GPU\n\n\
                         • AI Cup 2023 - Second Place\n  \
                           - Multi-agent RISK-like game\n  \
                           - Graph & heuristic algorithms\n\n\
                         • Torob Data Challenge 2023 - First Place\n  \
                           - Learning to Rank implementation\n  \
                           - NDCG score: 0.83\n  \
                           - Used: XGBoost, BM25, text processing\n\n\
                         • Optimizer2022 - First Place\n  \
                           - Multi-Manifold Clustering\n  \
                           - Custom DBSCAN extension",
                    ),
                    section(
                        "Skills",
                        "[Languages]\n\
                         • Golang • Python • C++ • Java • JavaScript • Rust\n\n\
                         [Tools & Frameworks]\n\
                         • GRPC • Protobuf • Kubernetes • AWS S3 • Django\n\
                         • Redis • RabbitMQ • Spark • ONNX • TensorFlow • PyTorch",
                    ),
                    section(
                        "Hobbies",
                        "• Linux Enthusiast\n  \
                           - NixOS on M2 MacBook via Asahi\n  \
                           - Custom DE: Hyprland & Waybar\n\
                         • Neovim Power User\n  \
                           - Custom IDE configuration\n\
                         • Dotfiles available at: github.com/amirsalarsafaei/dotfiles",
                    ),
                ],
            }),
            links: vec![
                link("Website", "https://amirsalarsafaei.com"),
                link("GitHub", "https://github.com/amirsalarsafaei"),
                link("Email", "mailto:amirs.s.g.o@gmail.com"),
                link("Telegram", "https://t.me/amirsalarsafaei"),
                link("LinkedIn", "https://linkedin.com/in/amir-salar-safaei"),
                link("SSH", "ssh ssh.amirsalarsafaei.com"),
            ],
        }))
    }
}
