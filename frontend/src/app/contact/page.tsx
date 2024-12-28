

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
					<span className={styles.prompt}>visitor@portfolio:~$</span> cat contacts.txt
				</div>

				<div className={styles.content}>
					<div className={styles.content}>
						<pre>
							{`
   ____   U  ___ u  _   _     _____      _        ____   _____        __  __  U _____ u 
U /"___|   \\/"_ \\/ | \\ |"|   |_ " _| U  /"\\  u U /"___| |_ " _|     U|' \\/ '|u\\| ___"|/ 
\\| | u     | | | |<|  \\| |>    | |    \\/ _ \\/  \\| | u     | |       \\| |\\/| |/ |  _|"   
 | |/__.-,_| |_| |U| |\\  |u   /| |\\   / ___ \\   | |/__   /| |\\       | |  | |  | |___   
  \\____|\\_)-\\___/  |_| \\_|   u |_|U  /_/   \\_\\   \\____| u |_|U       |_|  |_|  |_____|  
 _// \\\\      \\\\    ||   \\\\,-._// \\\\_  \\\\    >>  _// \\\\  _// \\\\_     <<,-,,-.   <<   >>  
(__)(__)    (__)   (_")  (_/(__) (__)(__)  (__)(__)(__)(__) (__)     (./  \\.) (__) (__) 


// Contact Information
// ===================

[GitHub]
-> https://github.com/amirsalarsafaei
   For open source projects and contributions

[Email Addresses]
-> Personal: amirs.s.g.o@gmail.com
-> Work: amirsalar.safaei@divar.ir
-> University: amirsalar.safaei48@sharif.edu

[Telegram]
-> @amirsalarsafaei
   Available for quick chats and collaboration

// Usage
// =====
$ git clone https://github.com/amirsalarsafaei/awesome-project
$ echo "Feel free to reach out!"

// Note
// ====
Available for collaboration and interesting projects.
Preferred contact method: Email or Telegram
Response time: Usually within 24 hours
`}
						</pre>
					</div>
				</div>
			</div>
		</div>
	);
}
