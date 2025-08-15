import dynamic from 'next/dynamic';
import styles from './page.module.scss';

const ThreeDCanvas = dynamic(
	() => import('./components/AboutMe3DCanvas'),
	{ ssr: false }
);

export default function AboutMe() {
	return (
		<div className={styles.aboutContainer}>
			<div className={styles.terminal}>
				<div className={styles.terminalHeader}>
					<div className={styles.buttons}>
						<span className={styles.close}></span>
						<span className={styles.minimize}></span>
						<span className={styles.maximize}></span>
					</div>
					<div className={styles.termTitle}>about_me.sh</div>
				</div>

				<div className={styles.terminalBody}>
					<div className={styles.line}>
						<span className={styles.prompt}>visitor@amirsalar:~$</span> whoami
					</div>
					<div className={styles.content}>
						<pre>
							{`AmirSalar Safaei
Software Engineer & System Architect`}
						</pre>
					</div>

					<div className={styles.line}>
						<span className={styles.prompt}>visitor@amirsalar:~$</span> cat story.txt
					</div>
					<div className={styles.content}>
						<pre>
							{`// My Journey
// ==========

Hello! I'm a passionate software engineer currently pursuing my 
M.Sc. in Computer Science at University of British Columbia.

I love building distributed systems and writing type-safe & maintainable code.
Currently working at Divar, where I help millions of users 
buy and sell items efficiently.

When I'm not coding, you can find me:
-> Contributing to open source projects
-> Exploring new programming languages
-> Solving competitive programming problems
-> Reading about system design patterns

I believe in writing clean, maintainable code and building 
systems that scale. My journey started with Informatic Olympiad (competitive programming) and it continues with curiosity about 
how things work under the hood`}
						</pre>
					</div>

					<div className={styles.line}>
						<span className={styles.prompt}>visitor@amirsalar:~$</span> ls -la skills/
					</div>
					<div className={styles.content}>
						<pre>
							{`drwxr-xr-x  expert     golang/
drwxr-xr-x  expert     python/
drwxr-xr-x  expert     typescript/
drwxr-xr-x  proficient rust/
drwxr-xr-x  proficient java/
drwxr-xr-x  learning   cpp/
drwxr-xr-x  passion    distributed-systems/
drwxr-xr-x  passion    concurrent-programming/
drwxr-xr-x  passion    type-safety/
drwxr-xr-x  passion    open-source/`}
						</pre>
					</div>

					<div className={styles.line}>
						<span className={styles.prompt}>visitor@amirsalar:~$</span> cat current_focus.md
					</div>
					<div className={styles.content}>
						<pre>
							{`# Current Focus 🎯

## At Work (Divar)
- Building scalable backend services
- Improving system performance and reliability

## Personal Projects
- Contributing to open source projects
- Building developer tools and libraries

## Learning
- Advanced system design patterns
- Kubernetes and cloud-native technologies`}
						</pre>
					</div>

					<div className={styles.line}>
						<span className={styles.prompt}>visitor@amirsalar:~$</span> echo "Let's connect!"
					</div>
					<div className={styles.content}>
						<pre>
							{`Let's connect!

📧 Email: amirs.s.g.o@gmail.com
🐙 GitHub: github.com/amirsalarsafaei
💬 Telegram: @amirsalarsafaei
💼 LinkedIn: linkedin.com/in/amir-salar-safaei

Always open to interesting conversations and collaborations!`}
						</pre>
					</div>

					<div className={styles.line}>
						<span className={styles.prompt}>visitor@amirsalar:~$</span> <span className={styles.cursor}>█</span>
					</div>
				</div>
			</div>

			<ThreeDCanvas />
		</div>
	);
}
