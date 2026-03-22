export interface ArtifactBlobStore {
    writeJson(namespace: string, name: string, value: unknown): Promise<string>;
    writeText(namespace: string, name: string, value: string): Promise<string>;
    writeBuffer(namespace: string, name: string, value: Buffer): Promise<string>;
    readText(blobRef: string): Promise<string>;
    readJson<T>(blobRef: string): Promise<T>;
}
export declare class LocalFileArtifactStore implements ArtifactBlobStore {
    private readonly rootDir;
    constructor(rootDir: string);
    writeJson(namespace: string, name: string, value: unknown): Promise<string>;
    writeText(namespace: string, name: string, value: string): Promise<string>;
    writeBuffer(namespace: string, name: string, value: Buffer): Promise<string>;
    readText(blobRef: string): Promise<string>;
    readJson<T>(blobRef: string): Promise<T>;
    private resolvePath;
}
//# sourceMappingURL=blob-store.d.ts.map