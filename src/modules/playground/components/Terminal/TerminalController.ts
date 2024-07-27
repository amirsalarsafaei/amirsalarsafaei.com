import { CommandProps } from "./Command";


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
	constructor(name: string, type: FileType, parent?: File) {
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
	folder: string;
	constructor(id: string, command: string, folder: string, stderr?: string, stdout?: string) {
		this.id = id;
		this.folder = folder;
		this.command = command;
		this.stdout = stdout;
		this.stderr = stderr;
	}
}


export class TerminalController {
	private history: CommandController[];
	private fileSystem: FileSystem;
	private folder: File;
	constructor() {
		this.history = []
		this.fileSystem = new FileSystem();
		this.folder = this.fileSystem.root;
	}


	runCommand(command: string) {
		command = command.trim();
		let args = command.split(" ");
		let folder = this.folder.name;
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
		}


		this.history = [ ...this.history, (
			new CommandController(
				String(this.history.length), command, folder, result.stderr, result.stdout,
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
		}, "/")

		return { stdout: path.substring(1),
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
				return `${prevOut}\n${curFile.getLsName()}`
			}, "")
		}
	}

	getCommands(): CommandController[] {
		return this.history;
	}

	
}
