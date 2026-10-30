// A small in-memory POSIX-flavoured filesystem.
//
// Directory entries map a name to a node, so hard links (two names -> one
// node) are representable. Nodes deliberately have no parent pointer: paths
// are resolved from the root every time, which keeps `..`, symlinks and hard
// links honest. Cwd state lives in the shell.

export type NodeKind = "file" | "directory" | "symlink";

export type Errno =
  | "ENOENT"
  | "ENOTDIR"
  | "EISDIR"
  | "EEXIST"
  | "ENOTEMPTY"
  | "EACCES"
  | "EPERM"
  | "EINVAL"
  | "ELOOP"
  | "ENOSPC"
  | "ENAMETOOLONG";

export const STRERROR: Record<Errno, string> = {
  ENOENT: "No such file or directory",
  ENOTDIR: "Not a directory",
  EISDIR: "Is a directory",
  EEXIST: "File exists",
  ENOTEMPTY: "Directory not empty",
  EACCES: "Permission denied",
  EPERM: "Operation not permitted",
  EINVAL: "Invalid argument",
  ELOOP: "Too many levels of symbolic links",
  ENOSPC: "No space left on device",
  ENAMETOOLONG: "File name too long",
};

export class FsError extends Error {
  readonly code: Errno;
  readonly path: string;

  constructor(code: Errno, path: string) {
    super(STRERROR[code]);
    this.name = "FsError";
    this.code = code;
    this.path = path;
  }
}

export interface Credentials {
  uid: number;
  gid: number;
  groups: number[];
}

export interface NodeInit {
  mode?: number;
  uid?: number;
  gid?: number;
  content?: string;
  target?: string;
  special?: "null" | "zero" | "urandom";
}

let nextIno = 1;

export class FsNode {
  readonly kind: NodeKind;
  readonly ino: number;
  mode: number;
  uid: number;
  gid: number;
  nlink: number;
  content: string;
  /** Symlink destination, for `kind === "symlink"`. */
  target?: string;
  /** Device-ish behaviour used by redirections (/dev/null). */
  special?: "null" | "zero" | "urandom";
  children?: Map<string, FsNode>;
  atime: Date;
  mtime: Date;
  ctime: Date;

  constructor(kind: NodeKind, init: NodeInit = {}) {
    this.kind = kind;
    this.ino = nextIno++;
    this.mode =
      init.mode ??
      (kind === "directory" ? 0o755 : kind === "symlink" ? 0o777 : 0o644);
    this.uid = init.uid ?? 0;
    this.gid = init.gid ?? 0;
    this.nlink = kind === "directory" ? 2 : 1;
    this.target = init.target;
    this.special = init.special;
    this.content = kind === "symlink" ? init.target ?? "" : init.content ?? "";
    if (kind === "directory") {
      this.children = new Map();
    }
    this.atime = this.mtime = this.ctime = new Date();
  }

  isDirectory(): boolean {
    return this.kind === "directory";
  }

  isFile(): boolean {
    return this.kind === "file";
  }

  isSymlink(): boolean {
    return this.kind === "symlink";
  }

  /** Size in bytes as `stat` would report it. */
  size(): number {
    if (this.kind === "directory") {
      // A plausible, stable directory size (does not need to be exact).
      return 4096;
    }
    return new TextEncoder().encode(this.content).length;
  }
}

export interface Resolved {
  node: FsNode;
  /** Physical, canonical absolute path (symlinks resolved, no trailing /). */
  path: string;
}

export interface StatInfo {
  node: FsNode;
  path: string;
}

const ACCESS_R = 4;
const ACCESS_W = 2;
const ACCESS_X = 1;

export function joinPath(dir: string, name: string): string {
  if (dir === "/" || dir === "") return "/" + name;
  return dir.replace(/\/+$/, "") + "/" + name;
}

export function splitPath(path: string): string[] {
  return path.split("/").filter((part) => part.length > 0);
}

export function dirname(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  const idx = trimmed.lastIndexOf("/");
  if (idx < 0) return ".";
  if (idx === 0) return "/";
  return trimmed.slice(0, idx);
}

export function basename(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  const idx = trimmed.lastIndexOf("/");
  return idx < 0 ? trimmed : trimmed.slice(idx + 1);
}

/** String-level normalisation used for logical paths (does not touch the fs). */
export function normalizeLogical(path: string, cwd = "/"): string {
  const absolute = path.startsWith("/");
  const parts = absolute ? splitPath(path) : splitPath(cwd + "/" + path);
  const out: string[] = [];
  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return "/" + out.join("/");
}

function octal(mode: number, bits: number): string {
  const shift = bits * 3;
  const value = (mode >> shift) & 7;
  let s = "";
  if (value & 4) s += "r";
  else s += "-";
  if (value & 2) s += "w";
  else s += "-";
  if (value & 1) s += "x";
  else s += "-";
  return s;
}

export function formatMode(node: FsNode): string {
  const type =
    node.kind === "directory" ? "d" : node.kind === "symlink" ? "l" : "-";
  const owner = octal(node.mode, 2);
  const group = octal(node.mode, 1);
  const other = octal(node.mode, 0);
  // Merge setuid / setgid / sticky into the exec columns like ls does.
  const chars = (owner + group + other).split("");
  if (node.mode & 0o4000) chars[2] = owner[2] === "x" ? "s" : "S";
  if (node.mode & 0o2000) chars[5] = group[2] === "x" ? "s" : "S";
  if (node.mode & 0o1000) chars[8] = other[2] === "x" ? "t" : "T";
  return type + chars.join("");
}

export function parseOctalMode(value: string): number | null {
  if (!/^[0-7]{1,4}$/.test(value)) return null;
  return parseInt(value, 8) & 0o7777;
}

export class FileSystem {
  root: FsNode;
  cred: Credentials = { uid: 1000, gid: 1000, groups: [1, 100, 1000] };
  private readonly now = () => new Date();

  constructor(seed?: (fs: FileSystem) => void) {
    this.root = new FsNode("directory", { mode: 0o755, uid: 0, gid: 0 });
    if (seed) seed(this);
  }

  touch(node: FsNode): void {
    node.mtime = this.now();
    node.ctime = new Date(node.mtime);
  }

  access(node: FsNode, want: number, path: string): void {
    if (this.cred.uid === 0) return;
    let allowed: number;
    if (node.uid === this.cred.uid) {
      allowed = (node.mode >> 6) & 7;
    } else if (
      node.gid === this.cred.gid ||
      this.cred.groups.indexOf(node.gid) !== -1
    ) {
      allowed = (node.mode >> 3) & 7;
    } else {
      allowed = node.mode & 7;
    }
    if ((allowed & want) !== want) {
      throw new FsError("EACCES", path);
    }
  }

  canAccess(node: FsNode, want: number): boolean {
    try {
      this.access(node, want, "");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolve `path` against `cwd` (an absolute physical path).
   * Symlinks are followed unless `followFinal` is false.
   */
  resolve(
    path: string,
    cwd: string,
    options: { followFinal?: boolean } = {},
  ): Resolved {
    const followFinal = options.followFinal !== false;
    if (path === "") throw new FsError("ENOENT", path);

    const wantsDirectory = path.length > 1 && path.endsWith("/");
    let pending = (
      path.startsWith("/") ? path : (cwd === "/" ? "" : cwd) + "/" + path
    )
      .split("/")
      .filter((part) => part.length > 0);

    let names: string[] = [];
    const stack: FsNode[] = [this.root];
    let linkCount = 0;

    while (pending.length > 0) {
      const part = pending.shift() as string;
      if (part === ".") continue;
      if (part === "..") {
        if (stack.length > 1) {
          stack.pop();
          names.pop();
        }
        continue;
      }

      const dir = stack[stack.length - 1];
      if (!dir.isDirectory()) {
        throw new FsError("ENOTDIR", "/" + names.concat(part).join("/"));
      }
      this.access(dir, ACCESS_X, "/" + names.join("/"));

      const child = dir.children!.get(part);
      if (!child) {
        throw new FsError("ENOENT", "/" + names.concat(part).join("/"));
      }

      const isLast = pending.length === 0;
      if (child.isSymlink() && (!isLast || followFinal)) {
        if (++linkCount > 40) {
          throw new FsError("ELOOP", "/" + names.concat(part).join("/"));
        }
        const target = child.target ?? "";
        // Restart resolution from the root with the symlink target spliced in.
        // Relative targets are resolved against the directory holding the link.
        const prefix = target.startsWith("/") ? [] : names.slice();
        pending = prefix.concat(splitPath(target), pending);
        names = [];
        stack.length = 1;
        continue;
      }

      stack.push(child);
      names.push(part);
    }

    const node = stack[stack.length - 1];
    if (wantsDirectory && !node.isDirectory()) {
      throw new FsError("ENOTDIR", "/" + names.join("/"));
    }
    return { node, path: "/" + names.join("/") };
  }

  /** Resolve without following a trailing symlink. */
  lstat(path: string, cwd: string, followFinal = false): Resolved {
    return this.resolve(path, cwd, { followFinal });
  }

  /**
   * Split a path into an existing parent directory and the final name.
   * Only the parent is resolved.
   */
  resolveParent(
    path: string,
    cwd: string,
  ): { parent: FsNode; parentPath: string; name: string } {
    const trimmed = path.replace(/\/+$/, "");
    if (trimmed === "" || trimmed === "/") {
      throw new FsError("EINVAL", path);
    }
    const slash = trimmed.lastIndexOf("/");
    const parentPath = slash < 0 ? "." : slash === 0 ? "/" : trimmed.slice(0, slash);
    const name = trimmed.slice(slash + 1);
    if (name === "" || name === "." || name === "..") {
      throw new FsError("EINVAL", path);
    }
    if (name.length > 255) throw new FsError("ENAMETOOLONG", path);

    const resolvedParent = this.resolve(parentPath, cwd);
    if (!resolvedParent.node.isDirectory()) {
      throw new FsError("ENOTDIR", parentPath);
    }
    this.access(resolvedParent.node, ACCESS_W | ACCESS_X, resolvedParent.path);
    return {
      parent: resolvedParent.node,
      parentPath: resolvedParent.path,
      name,
    };
  }

  readFile(path: string, cwd: string): { node: FsNode; content: string } {
    const resolved = this.resolve(path, cwd);
    if (resolved.node.isDirectory()) throw new FsError("EISDIR", resolved.path);
    this.access(resolved.node, ACCESS_R, resolved.path);
    resolved.node.atime = this.now();
    if (resolved.node.special === "zero") {
      return { node: resolved.node, content: "\0" };
    }
    if (resolved.node.special === "urandom") {
      let out = "";
      for (let i = 0; i < 32; i++) {
        out += Math.floor(Math.random() * 256)
          .toString(16)
          .padStart(2, "0");
      }
      return { node: resolved.node, content: out };
    }
    return { node: resolved.node, content: resolved.node.content };
  }

  /** Write `content` to a path, creating it when `create` is true. */
  writeFile(
    path: string,
    cwd: string,
    content: string,
    options: { append?: boolean; create?: boolean; mode?: number } = {},
  ): { node: FsNode; path: string } {
    const append = options.append === true;
    const create = options.create !== false;

    let resolved: Resolved;
    try {
      resolved = this.resolve(path, cwd);
    } catch (error) {
      if (!(error instanceof FsError) || error.code !== "ENOENT") throw error;
      if (!create) throw error;
      const { parent, name, parentPath } = this.resolveParent(path, cwd);
      const exists = parent.children!.get(name);
      if (exists) {
        resolved = { node: exists, path: joinPath(parentPath, name) };
      } else {
        const node = new FsNode("file", {
          mode: options.mode ?? 0o644,
          uid: this.cred.uid,
          gid: this.cred.gid,
        });
        parent.children!.set(name, node);
        this.touch(parent);
        resolved = { node, path: joinPath(parentPath, name) };
      }
    }

    const node = resolved.node;
    if (node.isDirectory()) throw new FsError("EISDIR", resolved.path);
    if (node.special === "null") return { node, path: resolved.path };
    this.access(node, ACCESS_W, resolved.path);
    node.content = append ? node.content + content : content;
    this.touch(node);
    return { node, path: resolved.path };
  }

  createFile(
    parent: FsNode,
    parentPath: string,
    name: string,
    content = "",
    mode = 0o644,
  ): FsNode {
    if (parent.children!.has(name)) {
      throw new FsError("EEXIST", joinPath(parentPath, name));
    }
    const node = new FsNode("file", {
      mode,
      uid: this.cred.uid || 1000,
      gid: this.cred.gid || 1000,
      content,
    });
    parent.children!.set(name, node);
    this.touch(parent);
    return node;
  }

  createDir(
    parent: FsNode,
    parentPath: string,
    name: string,
    mode = 0o755,
  ): FsNode {
    if (parent.children!.has(name)) {
      throw new FsError("EEXIST", joinPath(parentPath, name));
    }
    const node = new FsNode("directory", {
      mode,
      uid: this.cred.uid || 1000,
      gid: this.cred.gid || 1000,
    });
    parent.children!.set(name, node);
    this.touch(parent);
    return node;
  }

  mkdir(
    path: string,
    cwd: string,
    options: { recursive?: boolean; mode?: number } = {},
  ): Resolved {
    if (options.recursive) {
      return this.mkdirRecursive(path, cwd, options.mode ?? 0o755);
    }
    const { parent, parentPath, name } = this.resolveParent(path, cwd);
    const child = this.createDir(parent, parentPath, name, options.mode ?? 0o755);
    return { node: child, path: joinPath(parentPath, name) };
  }

  private mkdirRecursive(path: string, cwd: string, mode: number): Resolved {
    try {
      const existing = this.resolve(path, cwd);
      if (!existing.node.isDirectory()) {
        throw new FsError("ENOTDIR", existing.path);
      }
      return existing;
    } catch (error) {
      if (!(error instanceof FsError) || error.code !== "ENOENT") throw error;
    }

    const trimmed = path.replace(/\/+$/, "");
    if (trimmed === "" || trimmed === "/") return { node: this.root, path: "/" };
    const slash = trimmed.lastIndexOf("/");
    const parentPath = slash < 0 ? "." : slash === 0 ? "/" : trimmed.slice(0, slash);
    const name = trimmed.slice(slash + 1);
    if (name === "" || name === "." || name === "..") {
      return this.resolve(path, cwd);
    }
    const parent = this.mkdirRecursive(parentPath, cwd, mode);
    const existing = parent.node.children!.get(name);
    if (existing) {
      if (!existing.isDirectory()) {
        throw new FsError("ENOTDIR", joinPath(parent.path, name));
      }
      return { node: existing, path: joinPath(parent.path, name) };
    }
    this.access(parent.node, ACCESS_W | ACCESS_X, parent.path);
    const child = this.createDir(parent.node, parent.path, name, mode);
    return { node: child, path: joinPath(parent.path, name) };
  }

  /** Look up the directory entry itself, without following a final symlink. */
  entry(path: string, cwd: string): {
    parent: FsNode;
    parentPath: string;
    name: string;
    node: FsNode;
  } {
    const { parent, parentPath, name } = this.resolveParent(path, cwd);
    const node = parent.children!.get(name);
    if (!node) throw new FsError("ENOENT", joinPath(parentPath, name));
    return { parent, parentPath, name, node };
  }

  unlink(path: string, cwd: string): { node: FsNode; path: string } {
    const { parent, parentPath, name, node } = this.entry(path, cwd);
    if (node.isDirectory()) {
      throw new FsError("EISDIR", joinPath(parentPath, name));
    }
    parent.children!.delete(name);
    node.nlink--;
    this.touch(parent);
    this.touch(node);
    return { node, path: joinPath(parentPath, name) };
  }

  rmdir(path: string, cwd: string): { node: FsNode; path: string } {
    const { parent, parentPath, name, node } = this.entry(path, cwd);
    if (!node.isDirectory()) {
      throw new FsError("ENOTDIR", joinPath(parentPath, name));
    }
    if (node.children!.size > 0) {
      throw new FsError("ENOTEMPTY", joinPath(parentPath, name));
    }
    parent.children!.delete(name);
    this.touch(parent);
    return { node, path: joinPath(parentPath, name) };
  }

  removeTree(path: string, cwd: string): { node: FsNode; path: string } {
    const { parent, parentPath, name, node } = this.entry(path, cwd);
    parent.children!.delete(name);
    this.touch(parent);
    return { node, path: joinPath(parentPath, name) };
  }

  move(
    srcPath: string,
    srcCwd: string,
    dstPath: string,
    dstCwd: string,
    options: { noClobber?: boolean } = {},
  ): { from: string; to: string } {
    const src = this.entry(srcPath, srcCwd);
    const srcFull = joinPath(src.parentPath, src.name);
    if (srcFull === "/") throw new FsError("EINVAL", srcPath);

    let dstName = "";
    let dstParent: FsNode;
    let dstParentPath: string;

    // If the destination is an existing directory, move inside it.
    try {
      const resolvedDst = this.resolve(dstPath, dstCwd);
      if (resolvedDst.node.isDirectory()) {
        dstParent = resolvedDst.node;
        dstParentPath = resolvedDst.path;
        dstName = src.name;
      } else {
        const parentInfo = this.resolveParent(dstPath, dstCwd);
        dstParent = parentInfo.parent;
        dstParentPath = parentInfo.parentPath;
        dstName = parentInfo.name;
      }
    } catch (error) {
      if (!(error instanceof FsError) || error.code !== "ENOENT") throw error;
      const parentInfo = this.resolveParent(dstPath, dstCwd);
      dstParent = parentInfo.parent;
      dstParentPath = parentInfo.parentPath;
      dstName = parentInfo.name;
    }

    const dstFull = joinPath(dstParentPath, dstName);
    if (srcFull === dstFull) return { from: srcFull, to: dstFull };
    if (src.node.isDirectory() && dstFull.startsWith(srcFull + "/")) {
      throw new FsError("EINVAL", dstFull);
    }

    const existing = dstParent.children!.get(dstName);
    if (existing && existing !== src.node) {
      if (options.noClobber) throw new FsError("EEXIST", dstFull);
      if (existing.isDirectory()) {
        if (!src.node.isDirectory()) throw new FsError("EISDIR", dstFull);
        if (existing.children!.size > 0) throw new FsError("ENOTEMPTY", dstFull);
      }
      dstParent.children!.delete(dstName);
      existing.nlink--;
    }

    src.parent.children!.delete(src.name);
    dstParent.children!.set(dstName, src.node);
    this.touch(src.node);
    this.touch(src.parent);
    this.touch(dstParent);
    return { from: srcFull, to: dstFull };
  }

  hardlink(
    srcPath: string,
    srcCwd: string,
    dstPath: string,
    dstCwd: string,
  ): { node: FsNode; path: string } {
    const src = this.resolve(srcPath, srcCwd);
    if (src.node.isDirectory()) throw new FsError("EPERM", src.path);
    const { parent, parentPath, name } = this.resolveParent(dstPath, dstCwd);
    if (parent.children!.has(name)) {
      throw new FsError("EEXIST", joinPath(parentPath, name));
    }
    parent.children!.set(name, src.node);
    src.node.nlink++;
    this.touch(parent);
    return { node: src.node, path: joinPath(parentPath, name) };
  }

  symlink(
    target: string,
    dstPath: string,
    dstCwd: string,
  ): { node: FsNode; path: string } {
    const { parent, parentPath, name } = this.resolveParent(dstPath, dstCwd);
    if (parent.children!.has(name)) {
      throw new FsError("EEXIST", joinPath(parentPath, name));
    }
    const node = new FsNode("symlink", {
      target,
      uid: this.cred.uid,
      gid: this.cred.gid,
    });
    parent.children!.set(name, node);
    this.touch(parent);
    return { node, path: joinPath(parentPath, name) };
  }

  chmod(path: string, cwd: string, mode: number, recursive = false): Resolved {
    const resolved = this.resolve(path, cwd);
    const apply = (node: FsNode, p: string) => {
      if (this.cred.uid !== 0 && node.uid !== this.cred.uid) {
        throw new FsError("EPERM", p);
      }
      node.mode = mode & 0o7777;
      this.touch(node);
    };
    apply(resolved.node, resolved.path);
    if (recursive && resolved.node.isDirectory()) {
      const walk = (node: FsNode, base: string) => {
        const names = Array.from(node.children!.keys()).sort();
        for (const name of names) {
          const child = node.children!.get(name)!;
          const childPath = joinPath(base, name);
          apply(child, childPath);
          if (child.isDirectory()) walk(child, childPath);
        }
      };
      walk(resolved.node, resolved.path);
    }
    return resolved;
  }

  exists(path: string, cwd: string, follow = true): boolean {
    try {
      this.resolve(path, cwd, { followFinal: follow });
      return true;
    } catch {
      return false;
    }
  }

  /** Sort directory entries the way a C locale `ls` would. */
  list(node: FsNode, includeHidden: boolean): string[] {
    const names = Array.from(node.children!.keys());
    return names
      .filter((name) => includeHidden || !name.startsWith("."))
      .sort((a, b) => a.localeCompare(b, "en"));
  }
}
