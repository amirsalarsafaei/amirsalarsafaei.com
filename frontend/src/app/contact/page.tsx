

import styles from './page.module.scss';

export default function Contact() {

	return (
		<div className={styles.terminal}>
			<div className={styles.terminalHeader}>
				<div className={styles.buttons}>
					<span className={styles.close}></span>
					<span className={styles.minimize}></span>
					<span className={styles.maximize}></span>
				</div>
				<div className={styles.termTitle}>contact.sh</div>
			</div>

			<div className={styles.terminalBody}>
				<div className={styles.line}>
					<span className={styles.prompt}>visitor@portfolio:~$</span> ls
				</div>
				<div className={styles.content}>
					<pre>contacts.txt    resume.txt    skills.txt</pre>
				</div>

				<div className={styles.line}>
					<span className={styles.prompt}>visitor@portfolio:~$</span> cat contacts.txt
				</div>

				<div className={styles.content}>
					<pre>
{`// Contact Information
// ===================

[GitHub]
-> https://github.com/amirsalarsafaei
   For open source projects and contributions
   Active daily, feel free to check my repositories

[Email Addresses]
-> Personal: amirs.s.g.o@gmail.com
-> Work: amirsalar.safaei@divar.ir
-> University: amirsalar.safaei48@sharif.edu

[Telegram]
-> @amirsalarsafaei
   Available for quick chats and collaboration
   Timezone: UTC+3:30 (Tehran)

[LinkedIn]
-> https://ir.linkedin.com/in/amir-salar-safaei-0492a411a
   Connect for professional networking

// Note
// ====
Available for collaboration and interesting projects.
Preferred contact method: Email or Telegram
Response time: Usually within 24 hours`}
					</pre>
				</div>

				<div className={styles.line}>
					<span className={styles.prompt}>visitor@portfolio:~$</span> cat skills.txt
				</div>
				<div className={styles.content}>
					<pre>
{`// Technical Skills
// ===============

[Programming Languages]
-> Expert: Golang, Python, Typescript
-> Proficient: Rust
-> Familiar: C++ 

[Areas of Interest]
-> Distributed Systems
-> Type Safe Programming
-> Open APIs
-> System Design
-> High-Performance Computing
-> Web Development
-> Competitive Programming`}
					</pre>
				</div>

				<div className={styles.line}>
					<span className={styles.prompt}>visitor@portfolio:~$</span> cat resume.txt
				</div>
				<div className={styles.content}>
					<pre>
{`// Professional Experience
// =====================

[Work Experience]
-> Software Engineer @ Divar
   2023 - Present
-> Software Engineer @ CafeBazaar
   2022 - 2023 

[Education]
-> Sharif University of Technology
   B.Sc. in Computer Science 
   2019 - 2025


For detailed resume, visit:
https://amirsalarsafaei.com/resume`}
					</pre>
				</div>

				<div className={styles.line}>
					<span className={styles.prompt}>visitor@portfolio:~$</span> <span className={styles.cursor}>█</span>
				</div>
			</div>
		</div>
	);
}
