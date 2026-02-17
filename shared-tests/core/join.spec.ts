import assert from "node:assert/strict"
import { describe, test } from "node:test"
import type {SafeJoins} from '#extend'
import type {Equal, Expect, GetUnionOfRelations, Prettify, TestUnion} from "../utils.ts";
import { typeCheck} from "../utils.ts";
import { expectSQL } from "../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

// Database is seeded via `pnpm p:r` which runs before all tests
describe("join", () => {

    test("TS join Checks", async () =>  {

        {
            const query = prisma.$from("User")
                .join("Post", "authorId", "User.id");

            expectSQL(query.getSQL(), `FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`);

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
            expectSQL(sql, `FROM ${dialect.quote("LikedPosts")} JOIN ${dialect.quote("User")} ON ${dialect.quoteQualifiedColumn("User.id")} = ${dialect.quoteQualifiedColumn("LikedPosts.authorId")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`);
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
            expectSQL(sql, `FROM ${dialect.quote("LikedPosts")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.id")} = ${dialect.quoteQualifiedColumn("LikedPosts.postId")} JOIN ${dialect.quote("User")} ON ${dialect.quoteQualifiedColumn("User.id")} = ${dialect.quoteQualifiedColumn("Post.authorId")};`);

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
            expectSQL(sql, `FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.id")} = ${dialect.quoteQualifiedColumn("User.id")};`);
        }

        {
            const sql = prisma.$from("User")
                .joinUnsafeTypeEnforced("Post", "authorId", "Post.lastModifiedById")
                .joinUnsafeTypeEnforced("PostsImages", "id", "Post.id")
                .getSQL();
            expectSQL(sql, `FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("Post.lastModifiedById")} JOIN ${dialect.quote("PostsImages")} ON ${dialect.quoteQualifiedColumn("PostsImages.id")} = ${dialect.quoteQualifiedColumn("Post.id")};`);
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
            expectSQL(sql, `FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.id")} = ${dialect.quoteQualifiedColumn("User.email")};`);
        }

        {
            const sql = prisma.$from("User")
                .joinUnsafeIgnoreType("Post", "authorId", "User.email")
                .joinUnsafeIgnoreType("PostsImages", "id", "Post.published")
                .getSQL();
            expectSQL(sql, `FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.email")} JOIN ${dialect.quote("PostsImages")} ON ${dialect.quoteQualifiedColumn("PostsImages.id")} = ${dialect.quoteQualifiedColumn("Post.published")};`);
        }
    });

    test("Test Join to Multi Field Id Model", ()=> {
        const sql = prisma.$from("MFId_Category")
            .join("MFId_CategoryPost", "categoryId", "MFId_Category.id")
            .join("MFId_Post", "id", "MFId_CategoryPost.postId")
            .getSQL();

        expectSQL(sql, `FROM ${dialect.quote("MFId_Category")} JOIN ${dialect.quote("MFId_CategoryPost")} ON ${dialect.quoteQualifiedColumn("MFId_CategoryPost.categoryId")} = ${dialect.quoteQualifiedColumn("MFId_Category.id")} JOIN ${dialect.quote("MFId_Post")} ON ${dialect.quoteQualifiedColumn("MFId_Post.id")} = ${dialect.quoteQualifiedColumn("MFId_CategoryPost.postId")};`);
    });

    test("Many To Many Link; Default Name", ()=> {
        const sql = prisma.$from("M2M_Category")
            .join("_M2M_CategoryToM2M_Post", "A", "M2M_Category.id" )
            .join("M2M_Post", "id", "_M2M_CategoryToM2M_Post.B" )
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("M2M_Category")} JOIN ${dialect.quote("_M2M_CategoryToM2M_Post")} ON ${dialect.quoteQualifiedColumn("_M2M_CategoryToM2M_Post.A")} = ${dialect.quoteQualifiedColumn("M2M_Category.id")} JOIN ${dialect.quote("M2M_Post")} ON ${dialect.quoteQualifiedColumn("M2M_Post.id")} = ${dialect.quoteQualifiedColumn("_M2M_CategoryToM2M_Post.B")};`);
    });

    test("Many To Many Link; Name Change", ()=> {
        const sql = prisma.$from("M2M_NC_Category")
            .join("_M2M_NC", "A", "M2M_NC_Category.id" )
            .join("M2M_NC_Post", "id", "_M2M_NC.B" )
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("M2M_NC_Category")} JOIN ${dialect.quote("_M2M_NC")} ON ${dialect.quoteQualifiedColumn("_M2M_NC.A")} = ${dialect.quoteQualifiedColumn("M2M_NC_Category.id")} JOIN ${dialect.quote("M2M_NC_Post")} ON ${dialect.quoteQualifiedColumn("M2M_NC_Post.id")} = ${dialect.quoteQualifiedColumn("_M2M_NC.B")};`);
    });

    test("2 Many-To-Many Links", ()=> {
        {
            const sql = prisma.$from("MMM_Category")
                .join("_M2M_NC_M1", "A", "MMM_Category.id")
                .join("MMM_Post", "id", "_M2M_NC_M1.B" )
                .getSQL();
            expectSQL(sql, `FROM ${dialect.quote("MMM_Category")} JOIN ${dialect.quote("_M2M_NC_M1")} ON ${dialect.quoteQualifiedColumn("_M2M_NC_M1.A")} = ${dialect.quoteQualifiedColumn("MMM_Category.id")} JOIN ${dialect.quote("MMM_Post")} ON ${dialect.quoteQualifiedColumn("MMM_Post.id")} = ${dialect.quoteQualifiedColumn("_M2M_NC_M1.B")};`);
        }

        {
            const sql = prisma.$from("MMM_Post")
                .join("_M2M_NC_M2", "B", "MMM_Post.id")
                .join("MMM_Category", "id", "_M2M_NC_M2.A" )
                .getSQL();
            expectSQL(sql, `FROM ${dialect.quote("MMM_Post")} JOIN ${dialect.quote("_M2M_NC_M2")} ON ${dialect.quoteQualifiedColumn("_M2M_NC_M2.B")} = ${dialect.quoteQualifiedColumn("MMM_Post.id")} JOIN ${dialect.quote("MMM_Category")} ON ${dialect.quoteQualifiedColumn("MMM_Category.id")} = ${dialect.quoteQualifiedColumn("_M2M_NC_M2.A")};`);
        }
    });
});

