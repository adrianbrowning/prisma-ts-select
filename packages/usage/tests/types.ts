/**
 * Common type definitions for test files.
 * These represent database table structures and query result shapes.
 */

// ============================================================================
// Single Table Row Types (Unqualified Columns)
// ============================================================================

import type {Prettify} from "./utils.js";

/**
 * User table row with unqualified column names.
 * Used when selecting from a single User table without joins.
 */
export type UserRow = {
    id: number;
    email: string;
    name: string | null;
    age: number | null;
};

/**
 * Post table row with unqualified column names.
 * Used when selecting from a single Post table without joins.
 */
export type PostRow = {
    id: number;
    title: string;
    content: string | null;
    published: boolean;
    authorId: number;
    lastModifiedById: number;
};

/**
 * PostsImages table row with unqualified column names.
 */
export type PostsImagesRow = {
    id: number;
    url: string;
    postId: number;
};

/**
 * LikedPosts table row with unqualified column names.
 */
export type LikedPostsRow = {
    id: number;
    postId: number;
    authorId: number;
};

/**
 * Employee table row with unqualified column names.
 */
export type EmployeeRow = {
    id: number;
    name: string;
    managerId: number | null;
};

// ============================================================================
// Qualified Row Types (For Joins)
// ============================================================================

/**
 * User table row with qualified column names (prefixed with "User.").
 * Used in multi-table joins where column names need table prefixes.
 */
export type UserRowQualified<T extends string = "User"> = {
    [K in keyof UserRow as `${T}.${K}`]: UserRow[K]
};

/**
 * Post table row with qualified column names (prefixed with "Post.").
 * Used in multi-table joins where column names need table prefixes.
 */
export type PostRowQualified<T extends string = "Post"> = {
    [K in keyof PostRow as `${T}.${K}`]: PostRow[K]
};

/**
 * PostsImages table row with qualified column names.
 */
export type PostsImagesRowQualified = {
    "PostsImages.id": number;
    "PostsImages.url": string;
    "PostsImages.postId": number;
};

/**
 * LikedPosts table row with qualified column names.
 */
export type LikedPostsRowQualified = {
    "LikedPosts.id": number;
    "LikedPosts.postId": number;
    "LikedPosts.authorId": number;
};

/**
 * Employee table row with qualified column names.
 */
export type EmployeeRowQualified = {
    "Employee.id": number;
    "Employee.name": string;
    "Employee.managerId": number | null;
};

// ============================================================================
// Common Join Result Types
// ============================================================================

/**
 * Combined User + Post join result with qualified column names.
 * Used when joining User and Post tables with selectAll().
 */
export type UserPostQualifiedJoinRow<U extends string = "User", P extends string = "Post"> = Prettify<UserRowQualified<U> & PostRowQualified<P>>;


export type UserPostJoinRow = Prettify<UserRow & PostRow>;

/**
 * Combined User + Post + LikedPosts join result with qualified column names.
 */
export type UserPostLikedPostsJoinRow = UserRowQualified & PostRowQualified & LikedPostsRowQualified;

// ============================================================================
// Array Result Types
// ============================================================================

/**
 * Array of User rows (unqualified).
 * Common return type for single-table User queries.
 */
export type UserRowArray = Array<UserRow>;

/**
 * Array of Post rows (unqualified).
 * Common return type for single-table Post queries.
 */
export type PostRowArray = Array<PostRow>;

/**
 * Array of User + Post join results (qualified).
 * Common return type for User-Post join queries.
 */
export type UserPostJoinRowArray = Array<UserPostQualifiedJoinRow>;
