import { describe, test, before } from "node:test"
import tsSelectExtend from 'prisma-ts-select/extend'
import type {SafeJoins} from 'prisma-ts-select/extend'
import type {Equal, Expect, GetUnionOfRelations, Prettify, TestUnion} from "./utils.js";
import { typeCheck} from "./utils.js";
import {PrismaClient} from "@prisma/client";

// import type {GetUnionOfRelations, SafeJoins} from "prisma-ts-select/dist/extend/extend.js";

const prisma = new PrismaClient({}).$extends(tsSelectExtend);

describe("join", () => {

    before(()=> {
        /*TODO insert data into DB*/
    });

    test("TS join Checks", async () =>  {

        prisma.$from("User")
            .join("Post", "authorId", "User.id")

        prisma.$from("LikedPosts")
            .join("User", "id", "LikedPosts.authorId")
            .join("Post", "authorId", "User.id")

        prisma.$from("LikedPosts")
            //@ts-expect-error TS2345: Argument of type string is not assignable to parameter of type never
            .join("Post", "authorId", "User.id")
            .join("User", "id", "LikedPosts.authorId")

        prisma.$from("LikedPosts")
            .join("Post", "id", "LikedPosts.postId")
            .join("User", "id", "Post.authorId")

        prisma.$from("User")
            //TS2345: Argument of type "Posts" is not assignable to parameter of type
            // "User" | "Post" | "LikedPosts" | "PostsImages"
            //@ts-expect-error
         .join("Posts", "", "");



        type safeJoins = Prettify<SafeJoins<"Post", ["LikedPosts"]>>;
        //    ^?
        typeCheck({} as Expect<Equal<safeJoins, {LikedPosts: {id: ["postId"]}}>>);

        type unionOfRelations = GetUnionOfRelations<safeJoins>
        //        ^?
        typeCheck( {} as Expect<TestUnion<unionOfRelations, ["id", "LikedPosts.postId"]>>);




        type safeJoins2 = SafeJoins<"Post", ["LikedPosts", "User"]>;
        //    ^?


        typeCheck({} as Expect<Equal<safeJoins2, {
             LikedPosts: {
                 id: ["postId"]
             },
             User: {
                 authorId: ["id"]
                 lastModifiedById: ["id"]
            }
        }>>);

        type unionOf_Post_LikedPosts_User = ["id", "LikedPosts.postId"] | ["authorId", "User.id"] | ["lastModifiedById", "User.id"];
        type unionOfRelations2 = GetUnionOfRelations<safeJoins2>
        //        ^?
        typeCheck( {} as Expect<TestUnion<unionOfRelations2, unionOf_Post_LikedPosts_User>>);


        type safeJoins3 = SafeJoins<"User", ["LikedPosts", "Post"]>;
        //    ^?

        typeCheck({} as Expect<Equal<safeJoins3, {
            LikedPosts: {
                id: ["authorId"]
            },
            Post: {
                id: ["authorId", "lastModifiedById"]
            }
        }>>);

        type unionOf_User_LikedPosts_Post = ["id", "LikedPosts.postId"] | ["authorId", "User.id"] | ["lastModifiedById", "User.id"];
        type unionOfRelations3 = GetUnionOfRelations<safeJoins2>
        //        ^?
        typeCheck( {} as Expect<TestUnion<unionOfRelations3, unionOf_User_LikedPosts_Post>>);

    });

    test("TS joinUnsafe Checks", async () =>  {

        prisma.$from("User")
            .joinUnsafeTypeEnforced("Post", "id", "User.id");

        prisma.$from("User")
            .joinUnsafeTypeEnforced("Post", "authorId", "Post.lastModifiedById")
            .joinUnsafeTypeEnforced("PostsImages", "id", "Post.id");


        prisma.$from("User")
            //@ts-expect-error "User.name" is string so shouldn't be allowed
            .joinUnsafe("Post", "id", "User.name");

    });

    test("TS joinUnsafeAllFields Checks", async () =>  {

    prisma.$from("User")
        .joinUnsafeIgnoreType("Post", "id", "User.email");

    prisma.$from("User")
        .joinUnsafeIgnoreType("Post", "authorId", "User.email")
        .joinUnsafeIgnoreType("PostsImages", "id", "Post.published");
    });
});

