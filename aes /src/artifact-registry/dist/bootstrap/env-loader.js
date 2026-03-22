"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadBootstrapEnvFiles = loadBootstrapEnvFiles;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = require("dotenv");
function loadBootstrapEnvFiles(env = process.env, cwd = process.cwd()) {
    const loadedFiles = [];
    const preservedKeys = new Set(Object.keys(env).filter((key) => typeof env[key] === "string"));
    for (const relativePath of [".env", ".env.local"]) {
        const resolvedPath = node_path_1.default.resolve(cwd, relativePath);
        if (!(0, node_fs_1.existsSync)(resolvedPath)) {
            continue;
        }
        const parsed = (0, dotenv_1.parse)((0, node_fs_1.readFileSync)(resolvedPath, "utf8"));
        for (const [key, value] of Object.entries(parsed)) {
            if (!preservedKeys.has(key)) {
                env[key] = value;
            }
        }
        loadedFiles.push(resolvedPath);
    }
    return {
        loaded_files: loadedFiles,
    };
}
//# sourceMappingURL=env-loader.js.map