import { promises as fs } from "node:fs";
import path from "node:path";

export interface ArtifactBlobStore {
  writeJson(namespace: string, name: string, value: unknown): Promise<string>;
  writeText(namespace: string, name: string, value: string): Promise<string>;
  writeBuffer(namespace: string, name: string, value: Buffer): Promise<string>;
  readText(blobRef: string): Promise<string>;
  readJson<T>(blobRef: string): Promise<T>;
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "artifact";
}

function ensureExtension(name: string, extension: string): string {
  return name.endsWith(extension) ? name : `${name}${extension}`;
}

export class LocalFileArtifactStore implements ArtifactBlobStore {
  constructor(private readonly rootDir: string) {}

  async writeJson(namespace: string, name: string, value: unknown): Promise<string> {
    return this.writeText(namespace, ensureExtension(name, ".json"), JSON.stringify(value, null, 2));
  }

  async writeText(namespace: string, name: string, value: string): Promise<string> {
    const target = this.resolvePath(namespace, name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, value, "utf8");
    return target;
  }

  async writeBuffer(namespace: string, name: string, value: Buffer): Promise<string> {
    const target = this.resolvePath(namespace, name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, value);
    return target;
  }

  async readText(blobRef: string): Promise<string> {
    return fs.readFile(blobRef, "utf8");
  }

  async readJson<T>(blobRef: string): Promise<T> {
    return JSON.parse(await this.readText(blobRef)) as T;
  }

  private resolvePath(namespace: string, name: string): string {
    const safeNamespace = sanitizePathSegment(namespace);
    const safeName = sanitizePathSegment(name);
    return path.join(this.rootDir, safeNamespace, safeName);
  }
}
