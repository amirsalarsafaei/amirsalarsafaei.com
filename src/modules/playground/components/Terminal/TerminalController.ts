import { CommandProps } from "./Command";
import { say } from "cowsay";


interface PathHandler {
	getFile(path: string): File | undefined;
}

enum FileType {
	File,
	Dir,
}

class File implements PathHandler {
	name: string;
	type: FileType;
	modes: [number, number, number];
	ownerID?: number;
	groupID?: number;
	createdAt: Date;
	modifiedAt: Date;
	accessedAt: Date;
	content: string;
	constructor(name: string, type: FileType, parent?: File, content: string = "") {
		this.name = name;
		this.type = type;
		this.modes = [7, 7, 7];
		this.createdAt = this.modifiedAt = this.accessedAt = new Date();
		if (this.type === FileType.Dir) {
			this.children = [];
		}
		if (parent == null) {
			this.parent = this;
		} else {
			this.parent = parent;
			this.parent.children!!.push(this);
		}
		this.content = content
	}
	children?: File[];
	parent: File;

	getChild(name: string): File | undefined {
		return this.children?.find((f) => f.name === name);
	}

	getFile(path: string): File | undefined {

		let firstPart = path, secondPart = null;

		if (path.includes("/")) {
			firstPart = path.substring(0, path.indexOf("/"));
			secondPart = path.substring(path.indexOf("/"));
		}


		const foundFile = this.getChild(firstPart);
		if (foundFile != null) {
			if (secondPart == null) {
				return foundFile;
			}
			return foundFile.getFile(secondPart);
		}

		if (firstPart.startsWith('.')) {
			let cnt = 0;
			while (cnt < firstPart.length && firstPart.charAt(cnt) === ".") {
				cnt++;
			}
			if (cnt !== firstPart.length) {
				return undefined;
			}

			let cur: File = this;
			for (let i = 1; i < cnt; i++) {
				cur = cur.parent;
			}

			if (secondPart == null) {
				return cur;
			}
			return cur.getFile(secondPart);
		}
		return undefined;
	}

	getLsName(): string {
		if (this.type === FileType.File) {
			return this.name;
		}
		return `${this.name}/`
	}

	getPath(): string {
		if (this.parent === this) {
			return "/"
		}
		return this.parent.getPath() + this.getLsName()
	}
}


class FileSystem implements PathHandler {
	root: File;
	constructor() {
		this.root = new File("", FileType.Dir);
	}

	getFile(path: string): File | undefined {
		let i = 0;
		while (i < path.length && path.charAt(i) === "/") {
			i++;
		}
		if (i == path.length) {
			return this.root;
		}

		return this.root.getFile(path.substring(i))
	}

}

type CommandResult = {
	stdout?: string;
	stderr?: string;
}

class CommandController implements CommandProps {
	id: string;
	command: string;
	stdout?: string;
	stderr?: string;
	sentAt: Date;
	path: string;
	constructor(id: string, command: string, path: string, stderr?: string, stdout?: string) {
		this.id = id;
		this.path = path;
		this.command = command;
		this.stdout = stdout;
		this.stderr = stderr;
		this.sentAt = new Date();
	}
}


export class TerminalController {
	history: CommandController[];
	private fileSystem: FileSystem;
	private folder: File;
	constructor() {
		this.history = []
		this.fileSystem = new FileSystem();
		this.folder = this.fileSystem.root;
		new File("cv", FileType.File, this.fileSystem.root,
			`Here goes my cv
something in between
the end of cv.
`)
		this.runCommand(`cowsay "Available commands are:\nls, cd, pwd, cowsay, mkdir, cat.\nCreated with creativity by:\n AmirSalar Safaei Ghaderi"`)
	}



	private splitCommandRespectingQuotes(command: string): string[] {
		const args: string[] = [];
		let currentArg = '';
		let inQuotes = false;

		for (let i = 0; i < command.length; i++) {
			if (command[i] === '"' && (i === 0 || command[i - 1] !== '\\')) {
				inQuotes = !inQuotes;
			} else if (command[i] === ' ' && !inQuotes) {
				if (currentArg) {
					args.push(currentArg);
					currentArg = '';
				}
			} else {
				currentArg += command[i];
			}
		}

		if (currentArg) {
			args.push(currentArg);
		}

		return args;
	}

	getCurrentPath(): string {
		return this.folder.getPath()
	}

	runCommand(command: string) {
		command = command.trim();
		let args = this.splitCommandRespectingQuotes(command);
		const path = this.folder.getPath();
		let result: CommandResult = {};
		if (args[0] === "cd") {
			result = this.cd(args[1] ?? "");
		}
		else if (args[0] === "pwd") {
			result = this.pwd();
		}
		else if (args[0] === "mkdir") {
			result = this.mkdir(args[1] ?? "");
		}
		else if (args[0] === "ls") {
			result = this.ls(args[1] ?? "");
		} else if (args[0] === "cowsay") {
			result = this.cowsay(args[1] ?? "");
		} else if (args[0] === "cat") {
			result = this.cat(args[1] ?? "");
		} else {
			result = {
				stderr: "command `" + args[0] + "` not found",
			}
		}


		this.history = [...this.history, (
			new CommandController(
				String(this.history.length), command, path, result.stderr, result.stdout,
			)
		)]

	}


	cd(path: string): CommandResult {
		if (path === "") {
			this.folder = this.fileSystem.root;
			return {}
		}

		const destFolder = this.getFile(path);

		if (destFolder == null) {
			return {
				stderr: "no such file or directory: " + path,
			}
		}
		if (destFolder.type !== FileType.Dir) {
			return {
				stderr: "not a directory: " + path,
			}
		}
		this.folder = destFolder;
		return {}
	}


	private getFile(path: string): File | undefined {
		if (path.startsWith("/")) {
			return this.fileSystem.getFile(path);
		} else {
			return this.folder.getFile(path);
		}
	}


	pwd(): CommandResult {
		let cur = this.folder;
		let parents = [cur];
		while (cur.parent !== cur) {
			cur = cur.parent;
			parents.push(cur);
		}

		const path = parents.reduce((prevPath, curPar) => {
			return "/" + curPar.name + prevPath;
		}, "")

		return {
			stdout: path.substring(1),
		}
	}

	mkdir(path: string): CommandResult {
		let folder: File | undefined = this.folder;
		let name = path;
		if (path.includes("/")) {
			name = path.substring(path.lastIndexOf("/"));
			folder = this.getFile(path.substring(0, path.lastIndexOf("/")))
			if (folder == null) {
				return {
					stderr: `cannot create directory \`${path}\`: No such file or directory`
				}
			}
		}

		if (name.length === 0) {
			return {
				stderr: `cannot create directory \`${path}\`: Name cannot be empty`
			}
		}
		if (folder.getChild(name) != null) {
			return {
				stderr: `cannot create directory \`${path}\`: File exists`
			}
		}
		new File(name, FileType.Dir, this.folder)
		return {}
	}


	ls(path: string): CommandResult {
		if (path === "") {
			path = ".";
		}
		const folder = this.getFile(path);
		if (folder == null) {
			return {
				stderr: `cannot access '${path}': No such file or directory`
			}
		}
		let files = [];
		if (folder.type === FileType.File) {
			files.push(folder);
		} else {
			files = folder.children!!;
		}
		return {
			stdout: files.reduce((prevOut, curFile) => {
				if (prevOut !== "") {
					return `${prevOut}\n${curFile.getLsName()}`
				}
				return curFile.getLsName()
			}, "")
		}
	}

	cat(path: string): CommandResult {
		if (path === "") {
			return {
				stderr: `path cannot be empty`
			}
		}

		const file = this.getFile(path);
		if (file == null) {
			return {
				stderr: `cannot access '${path}': No such file or directory`
			}
		}

		if (file.type == FileType.Dir) {
			return {
				stderr: `${file.name}: is a directory`
			}
		}

		return {
			stdout: file.content,
		}
	}

	cowsay(text: string): CommandResult {
		return {
			stdout: say({ text: text })
		}

	}

	getCommands(): CommandController[] {
		return this.history;
	}

}
