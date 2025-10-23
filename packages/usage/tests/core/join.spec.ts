import assert from "node:assert/strict"
import { describe, test, before } from "node:test"
import tsSelectExtend from 'prisma-ts-select/extend'
import type {SafeJoins} from 'prisma-ts-select/extend'
import type {Equal, Expect, GetUnionOfRelations, Prettify, TestUnion} from "../utils.ts";
import { typeCheck} from "../utils.ts";
import {PrismaClient} from "@prisma/client";


const prisma = new PrismaClient({})
    .$extends(tsSelectExtend);

// Database is seeded via `pnpm p:r` which runs before all tests
describe("join", () => {

    test("TS join Checks", async () =>  {

        {
            const query = prisma.$from("User")
                .join("Post", "authorId", "User.id");

            assert.equal(query.getSQL(), "FROM User JOIN Post ON Post.authorId = User.id;");

            // Verify join returns actual data
            const result = await query.select("User.name").select("Post.title").run();
            assert.ok(result.length > 0, "Join should return data");
            assert.deepStrictEqual(result, [{
                name: 'John Doe',
                title: 'Blog 1'
            },
                {
                    name: 'John Doe',
                 title: 'blog 2'
          },
               {
                 name: 'John Smith',
                 title: 'blog 3'
           }])

        }

        {
            const sql = prisma.$from("LikedPosts")
                .join("User", "id", "LikedPosts.authorId")
                .join("Post", "authorId", "User.id")
                .getSQL();
            assert.equal(sql, "FROM LikedPosts JOIN User ON User.id = LikedPosts.authorId JOIN Post ON Post.authorId = User.id;");
        }

        prisma.$from("LikedPosts")
            //@ts-expect-error TS2345: Argument of type string is not assignable to parameter of type never
            .join("Post", "authorId", "User.id")
            .join("User", "id", "LikedPosts.authorId")
        {
            const sql = prisma.$from("LikedPosts")
            .join("Post", "id", "LikedPosts.postId")
            .join("User", "id", "Post.authorId")
            .getSQL();
            assert.equal(sql, "FROM LikedPosts JOIN Post ON Post.id = LikedPosts.postId JOIN User ON User.id = Post.authorId;");

        }

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

    test("Joins That have a relationship", () => {
        prisma.$from("User")
            //@ts-expect-error should not allow a table with no relationship
            .join("PostsImages", "", "" );

        prisma.$from("User")
            //@ts-expect-error should not allow a table with no relationship
            .joinUnsafeTypeEnforced("PostsImages", "", "" );


        prisma.$from("User")
            //@ts-expect-error should not allow a table with no relationship
            .joinUnsafeIgnoreType("PostsImages", "", "" );
    });

    test("TS joinUnsafe Checks", async () =>  {

        {
            const sql = prisma.$from("User")
                .joinUnsafeTypeEnforced("Post", "id", "User.id")
                .getSQL();
            assert.equal(sql, "FROM User JOIN Post ON Post.id = User.id;");
        }

        {
            const sql = prisma.$from("User")
                .joinUnsafeTypeEnforced("Post", "authorId", "Post.lastModifiedById")
                .joinUnsafeTypeEnforced("PostsImages", "id", "Post.id")
                .getSQL();
            assert.equal(sql, "FROM User JOIN Post ON Post.authorId = Post.lastModifiedById JOIN PostsImages ON PostsImages.id = Post.id;");
        }


        prisma.$from("User")
            //@ts-expect-error "User.name" is string so shouldn't be allowed
            .joinUnsafeTypeEnforced("Post", "id", "User.name");

    });

    test("TS joinUnsafeIgnoreType Checks", async () =>  {

        {
            const sql = prisma.$from("User")
                .joinUnsafeIgnoreType("Post", "id", "User.email")
                .getSQL();
            assert.equal(sql, "FROM User JOIN Post ON Post.id = User.email;");
        }

        {
            const sql = prisma.$from("User")
                .joinUnsafeIgnoreType("Post", "authorId", "User.email")
                .joinUnsafeIgnoreType("PostsImages", "id", "Post.published")
                .getSQL();
            assert.equal(sql, "FROM User JOIN Post ON Post.authorId = User.email JOIN PostsImages ON PostsImages.id = Post.published;");
        }
    });

    test("Test Join to Multi Field Id Model", ()=> {
        const sql = prisma.$from("MFId_Category")
            .join("MFId_CategoryPost", "categoryId", "MFId_Category.id")
            .join("MFId_Post", "id", "MFId_CategoryPost.postId")
            .getSQL();

        assert.equal(sql, "FROM MFId_Category JOIN MFId_CategoryPost ON MFId_CategoryPost.categoryId = MFId_Category.id JOIN MFId_Post ON MFId_Post.id = MFId_CategoryPost.postId;");
    });

    test("Many To Many Link; Default Name", ()=> {
        const sql = prisma.$from("M2M_Category")
            .join("_M2M_CategoryToM2M_Post", "A", "M2M_Category.id" )
            .join("M2M_Post", "id", "_M2M_CategoryToM2M_Post.B" )
            .getSQL();
        assert.equal(sql, "FROM M2M_Category JOIN _M2M_CategoryToM2M_Post ON _M2M_CategoryToM2M_Post.A = M2M_Category.id JOIN M2M_Post ON M2M_Post.id = _M2M_CategoryToM2M_Post.B;");
    });

    test("Many To Many Link; Name Change", ()=> {
        const sql = prisma.$from("M2M_NC_Category")
            .join("_M2M_NC", "A", "M2M_NC_Category.id" )
            .join("M2M_NC_Post", "id", "_M2M_NC.B" )
            .getSQL();
        assert.equal(sql, "FROM M2M_NC_Category JOIN _M2M_NC ON _M2M_NC.A = M2M_NC_Category.id JOIN M2M_NC_Post ON M2M_NC_Post.id = _M2M_NC.B;");
    });

    test("2 Many-To-Many Links", ()=> {
        {
            const sql = prisma.$from("MMM_Category")
                .join("_M2M_NC_M1", "A", "MMM_Category.id")
                .join("MMM_Post", "id", "_M2M_NC_M1.B" )
                .getSQL();
            assert.equal(sql, "FROM MMM_Category JOIN _M2M_NC_M1 ON _M2M_NC_M1.A = MMM_Category.id JOIN MMM_Post ON MMM_Post.id = _M2M_NC_M1.B;");
        }

        {
            const sql = prisma.$from("MMM_Post")
                .join("_M2M_NC_M2", "B", "MMM_Post.id")
                .join("MMM_Category", "id", "_M2M_NC_M2.A" )
                .getSQL();
            assert.equal(sql, "FROM MMM_Post JOIN _M2M_NC_M2 ON _M2M_NC_M2.B = MMM_Post.id JOIN MMM_Category ON MMM_Category.id = _M2M_NC_M2.A;");
        }
    });
});

