import { describe, test, before } from "node:test"

import {DbSelect} from "../src/db-select.js"
import type {GetUnionOfRelations, SafeJoins} from "../src/db-select.js"
import type {Equal, Expect, TestUnion} from "./utils.js";
import { typeCheck} from "./utils.js";
import {PrismaClient} from "@prisma/client";


const prisma = new PrismaClient({
    log: ['query']
})
//
const db = new DbSelect(prisma);


describe("join", () => {

    before(()=> {
        /*TODO insert data into DB*/
    });

    test("TS join Checks", async () =>  {

        db.from("User")
            .join("Post", "authorId", "User.id")

        db.from("LikedPosts")
            .join("User", "id", "LikedPosts.userId")
            .join("Post", "authorId", "User.id")

        db.from("LikedPosts")
            //@ts-expect-error TS2345: Argument of type string is not assignable to parameter of type never
            .join("Post", "authorId", "User.id")
            .join("User", "id", "LikedPosts.userId")

        db.from("LikedPosts")
            .join("Post", "id", "LikedPosts.postId")
            .join("User", "id", "Post.authorId")

        db.from("User")
            //TS2345: Argument of type "Posts" is not assignable to parameter of type
            // "User" | "Post" | "LikedPosts" | "PostsImages"
            //@ts-expect-error
         .join("Posts", "", "");



        type safeJoins = SafeJoins<"Post", ["LikedPosts"]>;
        //    ^?
        typeCheck({} as Expect<Equal<safeJoins, {LikedPosts: {id: ["postId"]}}>>);

        type unionOfRelations = GetUnionOfRelations<safeJoins>
        //        ^?
        typeCheck( {} as Expect<TestUnion<unionOfRelations, ["id", "LikedPosts.postId"]>>);




        type safeJoins2 = SafeJoins<"Post", ["LikedPosts", "User"]>;
        //    ^?
        typeCheck({} as Expect<Equal<safeJoins2, {
            LikedPosts: {id: ["postId"]},
            User: {
                authorId: ["id"]
                lastModifiedBy: ["id"]
            }
        }>>);

        type unionOf_Post_LikedPosts_User = ["id", "LikedPosts.postId"] | ["authorId", "User.id"] | ["lastModifiedBy", "User.id"];
        type unionOfRelations2 = GetUnionOfRelations<safeJoins2>
        //        ^?
        typeCheck( {} as Expect<TestUnion<unionOfRelations2, unionOf_Post_LikedPosts_User>>);


        type safeJoins3 = SafeJoins<"User", ["LikedPosts", "Post"]>;
        //    ^?
        typeCheck({} as Expect<Equal<safeJoins3, {
            LikedPosts: {id: ["userId"]},
            Post: {
                id: ["authorId", "lastModifiedBy"]
            }
        }>>);

        type unionOf_User_LikedPosts_Post = ["id", "LikedPosts.postId"] | ["authorId", "User.id"] | ["lastModifiedBy", "User.id"];
        type unionOfRelations3 = GetUnionOfRelations<safeJoins2>
        //        ^?
        typeCheck( {} as Expect<TestUnion<unionOfRelations3, unionOf_User_LikedPosts_Post>>);

    });

    test("TS joinUnsafe Checks", async () =>  {

        db.from("User")
            .joinUnsafe("Post", "id", "User.id");

        db.from("User")
            .joinUnsafe("Post", "authorId", "Post.lastModifiedById")
            .joinUnsafe("PostsImages", "id", "Post.id");


        db.from("User")
            //@ts-expect-error "User.name" is string so shouldn't be allowed
            .joinUnsafe("Post", "id", "User.name");

    });

    test("TS joinUnsafeAllFields Checks", async () =>  {

    db.from("User")
        .joinUnsafeAllFields("Post", "id", "User.email");

    db.from("User")
        .joinUnsafeAllFields("Post", "authorId", "User.email")
        .joinUnsafeAllFields("PostsImages", "id", "Post.published");
    });
});

