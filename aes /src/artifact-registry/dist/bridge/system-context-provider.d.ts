/**
 * AES Bridge Layer — System Context Provider
 *
 * Provides the builder with existing system context so it builds
 * against what already exists instead of inventing parallel structures.
 *
 * Three context layers:
 *   1. Database context — Postgres schema + Neo4j graph model
 *   2. API context — existing HTTP routes and contracts
 *   3. Component context — existing TypeScript interfaces and boundaries
 *
 * The bridge compiler injects this context into the bridge so the
 * builder knows: what tables exist, what API routes exist, what
 * types/interfaces exist, and what the data model looks like.
 */
export interface DatabaseContext {
    /** Postgres tables, views, triggers relevant to this feature */
    postgres: {
        tables: TableSchema[];
        views: ViewSchema[];
        constraints: string[];
    };
    /** Neo4j node labels and relationship types relevant to this feature */
    neo4j: {
        node_labels: NodeLabelSchema[];
        relationship_types: RelationshipSchema[];
        indexes: string[];
    };
}
export interface TableSchema {
    name: string;
    columns: Array<{
        name: string;
        type: string;
        nullable: boolean;
        description?: string;
    }>;
    primary_key: string[];
    unique_constraints: string[];
    description?: string;
}
export interface ViewSchema {
    name: string;
    description: string;
    base_table: string;
}
export interface NodeLabelSchema {
    label: string;
    properties: Array<{
        name: string;
        type: string;
        required: boolean;
    }>;
    description?: string;
}
export interface RelationshipSchema {
    type: string;
    from_label: string;
    to_label: string;
    properties: Array<{
        name: string;
        type: string;
    }>;
    description?: string;
}
export interface ApiContext {
    /** Existing HTTP routes the builder should know about */
    routes: ApiRoute[];
    /** Base URL pattern */
    base_path: string;
}
export interface ApiRoute {
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    path: string;
    description: string;
    request_shape?: string;
    response_shape?: string;
    category: string;
}
export interface ComponentContext {
    /** TypeScript interfaces the builder should use or extend */
    interfaces: ComponentInterface[];
    /** Existing modules and their exports */
    modules: ModuleContext[];
    /** Type imports the builder should reference */
    type_imports: TypeImport[];
}
export interface ComponentInterface {
    name: string;
    file_path: string;
    description: string;
    fields: Array<{
        name: string;
        type: string;
        optional: boolean;
    }>;
}
export interface ModuleContext {
    name: string;
    file_path: string;
    exports: string[];
    description: string;
}
export interface TypeImport {
    from: string;
    types: string[];
}
export interface SystemContext {
    database: DatabaseContext;
    api: ApiContext;
    components: ComponentContext;
    /** Feature-specific context based on feature_type */
    feature_specific: Record<string, unknown>;
}
/**
 * Build the core Postgres database context from the schema.
 */
export declare function buildPostgresContext(): DatabaseContext["postgres"];
/**
 * Build the Neo4j graph context from the live runtime seed.
 */
export declare function buildNeo4jContext(): DatabaseContext["neo4j"];
/**
 * Build API context from the existing HTTP routes.
 */
export declare function buildApiContext(): ApiContext;
/**
 * Build component/interface context from the existing TypeScript types.
 */
export declare function buildComponentContext(): ComponentContext;
/**
 * Build the full system context for a given feature type.
 * This is what gets injected into the bridge for the builder.
 */
export declare function buildSystemContext(featureType?: string): SystemContext;
/**
 * Serialize system context to a compact format suitable for bridge injection.
 * Strips unnecessary detail for the builder prompt.
 */
export declare function serializeContextForBridge(context: SystemContext): Record<string, unknown>;
//# sourceMappingURL=system-context-provider.d.ts.map