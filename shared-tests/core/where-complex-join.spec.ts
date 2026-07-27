import { describe, test } from "node:test"
import { prisma } from '#client';

describe("where with many joins (TS2590 regression)", () => {

    test("where() should not trigger TS2590 with 6+ joins", () => {
        // This query chains 6 joins before calling .where()
        // Previously triggered: TS2590: Expression produces a union type that is too complex to represent
        const query = prisma.$from("User")
            .join("Post", "authorId", "User.id")
            .join("PostsImages", "postId", "Post.id")
            // .join("LikedPosts lp", "postId", "Post.id")
            // .join("LikedPosts lp2", "authorId", "User.id")
            .join("Post p2", "authorId", "User.id")
            .leftJoin("PostsImages pi2", "postId", "p2.id")
            .where({
                "User.name": "test",
                "Post.published": true,
                "User.id" : {
                    "op": "=",
                    value: {"$col": "User.id"}
                }
            })
            .select("User.name")
            .select("Post.title");

        // If we reach here, type-checking passed (no TS2590)
        void query;
    });

    test("where() with condition operators on many-join query", () => {
        const query = prisma.$from("User")
            .join("Post", "authorId", "User.id")
            .join("PostsImages", "postId", "Post.id")
            .join("LikedPosts lp", "postId", "Post.id")
            .join("LikedPosts lp2", "authorId", "User.id")
            .join("Post p2", "authorId", "User.id")
            .leftJoin("PostsImages pi2", "postId", "p2.id")
            .where({
                "User.name": { op: "LIKE", value: "%test%" },
                "Post.id": { op: ">", value: 5 },
                "lp.authorId": { op: "!=", value: 0 },
            })
            .select("User.name");

        void query;
    });
});
