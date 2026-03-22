"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalFileArtifactStore = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
function sanitizePathSegment(value) {
    return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "artifact";
}
function ensureExtension(name, extension) {
    return name.endsWith(extension) ? name : `${name}${extension}`;
}
class LocalFileArtifactStore {
    constructor(rootDir) {
        this.rootDir = rootDir;
    }
    async writeJson(namespace, name, value) {
        return this.writeText(namespace, ensureExtension(name, ".json"), JSON.stringify(value, null, 2));
    }
    async writeText(namespace, name, value) {
        const target = this.resolvePath(namespace, name);
        await node_fs_1.promises.mkdir(node_path_1.default.dirname(target), { recursive: true });
        await node_fs_1.promises.writeFile(target, value, "utf8");
        return target;
    }
    async writeBuffer(namespace, name, value) {
        const target = this.resolvePath(namespace, name);
        await node_fs_1.promises.mkdir(node_path_1.default.dirname(target), { recursive: true });
        await node_fs_1.promises.writeFile(target, value);
        return target;
    }
    async readText(blobRef) {
        return node_fs_1.promises.readFile(blobRef, "utf8");
    }
    async readJson(blobRef) {
        return JSON.parse(await this.readText(blobRef));
    }
    resolvePath(namespace, name) {
        const safeNamespace = sanitizePathSegment(namespace);
        const safeName = sanitizePathSegment(name);
        return node_path_1.default.join(this.rootDir, safeNamespace, safeName);
    }
}
exports.LocalFileArtifactStore = LocalFileArtifactStore;
//# sourceMappingURL=blob-store.js.map