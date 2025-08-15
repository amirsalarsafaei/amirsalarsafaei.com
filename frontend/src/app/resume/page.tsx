
import styles from './page.module.scss';
import { InlineCode } from '@/components/InlineCode/InlineCode';
import { CodeBlock } from '@/components/CodeBlock/CodeBlock';

export default function Resume() {

  return (
    <div className={styles.terminal}>
      <div className={styles.terminalHeader}>
        <div className={styles.buttons}>
          <span className={styles.close}></span>
          <span className={styles.minimize}></span>
          <span className={styles.maximize}></span>
        </div>
        <div className={styles.termTitle}>cv.sh</div>
      </div>

      <div className={styles.terminalBody}>
        <div className={styles.line}>
          <span className={styles.prompt}>visitor@portfolio:~$</span> cat cv.md
        </div>

        <div className={styles.content}>
          <h1>AmirSalar Safaei Ghaderi</h1>
          <p className={styles.contact}>
            <InlineCode>amirsalarsafaeighaderi@gmail.com</InlineCode> §{' '}
            <a href="https://github.com/amirsalarsafaei" target="_blank" rel="noopener noreferrer">
              github.com/amirsalarsafaei
            </a>
          </p>

          <section>
            <h2>$ Education</h2>
            <CodeBlock language="markdown">
              {`Sharif University of Technology Tehran, Iran
Bachelors of science in Computer science
GPA: 17.9/20
2020 - 2025`}
            </CodeBlock>
          </section>

          <section>
            <h2>$ Research Interests</h2>
            <CodeBlock language="markdown">
              {`• Software Engineering
• Databases
• Distributed Systems
• Operating Systems`}
            </CodeBlock>
          </section>

          <section>
            <h2>$ Work Experience</h2>
            <CodeBlock language="markdown">
              {`[Divar] Mid-to-Senior Software Engineer (April 2023 - Current)
Iran's largest tech platform

• System owner of Open-Platform (Kenar Github Docs)
• Improved API gateway latency using Open Policy Agent (OPA)
  - Reduced latency from 200ms to <5ms at 99.9% quantile
  - Applied policy code generation
  - Contributed to OPA Envoy plugin
• Designed & implemented rate-limiting system in GRPC
• Developed custom OAuth server per RFC specs
• Created cross-datacenter business logic sync system
• Enhanced security against SSRF and Open-Redirect

[CafeBazaar] Software Engineer (July 2022 – April 2023)

• Built e-commerce platform with Django-Tenants
• Integrated Auto-TLS certificates via Caddy
• Optimized PostgreSQL schema creation`}
            </CodeBlock>
          </section>

          <section>
            <h2>$ Awards</h2>
            <CodeBlock language="markdown">
              {`• National University Entrance Exam: Rank 466/155k (2020)
• Iran National Olympiad in Informatics: Silver Medal (2019)
  - Focus: combinatorics, graph theory, automata theory, algorithms`}
            </CodeBlock>
          </section>

          <section>
            <h2>$ Teaching & Volunteering</h2>
            <CodeBlock language="markdown">
              {`[Teaching Assistant] Fall 2021 - Current
• Basic Programming (Fall 2021)
• Principal of Computer Systems (Fall 2022)
• Advanced Programming (Winter 2023)
• Probability Theory (Winter 2023)
• Operating Systems (Fall 2024)

[Other Activities]
• IOI Exam Grader (2021)
• IOI Tutor (Aug 2020 – Jul 2022)
  - Taught algorithms & graph theory
  - Topics: shortest paths, SCC, DSU, MST, LCA, 2-SAT`}
            </CodeBlock>
          </section>

          <section>
            <h2>$ Projects</h2>
            <CodeBlock language="markdown">
              {`[SQLC PGX Monitoring]
• Database query debugging & timing tool
• Built with Sqlc & pgx (Golang)

[Raspberry AI Assistant]
• Implemented Silero VAD & facial recognition
• Integrated Neo4j knowledge graph
• Used Gemini & Whisper for conversation

[3D Terminal Laptop]
• Interactive 3D laptop model with Three.js
• Functional terminal emulator
• Basic filesystem commands`}
            </CodeBlock>
          </section>

          <section>
            <h2>$ Competitions</h2>
            <CodeBlock language="markdown">
              {`• LLM Hackathon 2024 - First Place
  - Quantized Falcon model for low-end systems
  - Achieved 7GB memory usage without GPU

• AI Cup 2023 - Second Place
  - Multi-agent RISK-like game
  - Graph & heuristic algorithms

• Torob Data Challenge 2023 - First Place
  - Learning to Rank implementation
  - NDCG score: 0.83
  - Used: XGBoost, BM25, text processing

• Optimizer2022 - First Place
  - Multi-Manifold Clustering
  - Custom DBSCAN extension`}
            </CodeBlock>
          </section>

          <section>
            <h2>$ Skills</h2>
            <CodeBlock language="markdown">
              {`[Languages]
• Golang • Python • C++ • Java • JavaScript • Rust

[Tools & Frameworks]
• GRPC • Protobuf • Kubernetes • AWS S3 • Django
• Redis • RabbitMQ • Spark • ONNX • TensorFlow • PyTorch`}
            </CodeBlock>
          </section>

          <section>
            <h2>$ Hobbies</h2>
            <CodeBlock language="markdown">
              {`• Linux Enthusiast
  - NixOS on M2 MacBook via Asahi
  - Custom DE: Hyprland & Waybar
• Neovim Power User
  - Custom IDE configuration
• Dotfiles available at: github.com/amirsalarsafaei/dotfiles`}
            </CodeBlock>
          </section>
        </div>
      </div>
    </div>
  );
}
