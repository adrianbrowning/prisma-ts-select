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

    test("join with where option - simple condition", () => {
        const sql = prisma.$from("User")
            .join("Post", "authorId", "User.id", { where: { "Post.published": true } })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} AND ${dialect.quoteQualifiedColumn("Post.published")} = true;`);
    });

    test("join with where option - object syntax", () => {
        const sql = prisma.$from("User")
            .join({ table: "Post", src: "authorId", on: "User.id", where: { "Post.published": true } })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} AND ${dialect.quoteQualifiedColumn("Post.published")} = true;`);
    });

    test("join with where option - logical ops ($AND)", () => {
        const sql = prisma.$from("User")
            .join("Post", "authorId", "User.id", { where: { $AND: [{ "Post.published": true }, { "Post.id": { op: ">", value: 0 } }] } })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} AND (${dialect.quoteQualifiedColumn("Post.published")} = true AND ${dialect.quoteQualifiedColumn("Post.id")} > 0);`);
    });

    test("join with where + top-level where", () => {
        const sql = prisma.$from("User")
            .join("Post", "authorId", "User.id", { where: { "Post.published": true } })
            .where({ "User.id": { op: ">", value: 0 } })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} AND ${dialect.quoteQualifiedColumn("Post.published")} = true WHERE ${dialect.quoteQualifiedColumn("User.id")} > 0;`);
    });

    test("joinUnsafeTypeEnforced with where option", () => {
        const sql = prisma.$from("User")
            .joinUnsafeTypeEnforced("Post", "id", "User.id", { where: { "Post.published": true } })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.id")} = ${dialect.quoteQualifiedColumn("User.id")} AND ${dialect.quoteQualifiedColumn("Post.published")} = true;`);
    });

    test("joinUnsafeIgnoreType with where option", () => {
        const sql = prisma.$from("User")
            .joinUnsafeIgnoreType("Post", "id", "User.email", { where: { "Post.published": false } })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.id")} = ${dialect.quoteQualifiedColumn("User.email")} AND ${dialect.quoteQualifiedColumn("Post.published")} = false;`);
    });

    test("join where type-safety: wrong table fields rejected", () => {
        prisma.$from("User")
            .join("Post", "authorId", "User.id", {
                // @ts-expect-error "User.name" is not a field of Post
                where: { "User.name": "test" }
            });
    });

    test("LEFT JOIN", () => {
        const sql = prisma.$from("User")
            .join("Post", "authorId", "User.id", { joinType: "LEFT" })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} LEFT JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`);
    });

    test("LEFT OUTER JOIN", () => {
        const sql = prisma.$from("User")
            .join("Post", "authorId", "User.id", { joinType: "LEFT OUTER" })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} LEFT OUTER JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`);
    });

    test("RIGHT JOIN", () => {
        const sql = prisma.$from("User")
            .join("Post", "authorId", "User.id", { joinType: "RIGHT" })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} RIGHT JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`);
    });

    test("FULL OUTER JOIN", () => {
        const sql = prisma.$from("User")
            .join("Post", "authorId", "User.id", { joinType: "FULL OUTER" })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} FULL OUTER JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`);
    });

    test("INNER JOIN (explicit)", () => {
        const sql = prisma.$from("User")
            .join("Post", "authorId", "User.id", { joinType: "INNER" })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} INNER JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`);
    });

    test("CROSS JOIN (no ON clause)", () => {
        const sql = prisma.$from("User")
            .joinUnsafeIgnoreType("Post", "id", "User.id", { joinType: "CROSS" })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} CROSS JOIN ${dialect.quote("Post")};`);
    });

    test("LEFT JOIN + where on ON clause", () => {
        const sql = prisma.$from("User")
            .join("Post", "authorId", "User.id", { joinType: "LEFT", where: { "Post.published": true } })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} LEFT JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} AND ${dialect.quoteQualifiedColumn("Post.published")} = true;`);
    });

    test("joinType object syntax", () => {
        const sql = prisma.$from("User")
            .join({ table: "Post", src: "authorId", on: "User.id", joinType: "LEFT" })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} LEFT JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`);
    });

    test("joinUnsafeTypeEnforced with joinType", () => {
        const sql = prisma.$from("User")
            .joinUnsafeTypeEnforced("Post", "id", "User.id", { joinType: "LEFT" })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} LEFT JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.id")} = ${dialect.quoteQualifiedColumn("User.id")};`);
    });

    test("joinUnsafeIgnoreType with joinType", () => {
        const sql = prisma.$from("User")
            .joinUnsafeIgnoreType("Post", "id", "User.email", { joinType: "LEFT" })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} LEFT JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.id")} = ${dialect.quoteQualifiedColumn("User.email")};`);
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

describe("join type variations", () => {

    test("innerJoin emits INNER JOIN", () => {
        const sql = prisma.$from("User")
            .innerJoin("Post", "authorId", "User.id")
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} INNER JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`);
    });

    test("leftJoin emits LEFT JOIN", () => {
        const sql = prisma.$from("User")
            .leftJoin("Post", "authorId", "User.id")
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} LEFT JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`);
    });

    test("crossJoin emits CROSS JOIN (no ON clause)", () => {
        const sql = prisma.$from("User")
            .crossJoin("Post")
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} CROSS JOIN ${dialect.quote("Post")};`);
    });

    test("innerJoin object syntax", () => {
        const sql = prisma.$from("User")
            .innerJoin({ table: "Post", src: "authorId", on: "User.id" })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} INNER JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`);
    });

    test("leftJoin object syntax", () => {
        const sql = prisma.$from("User")
            .leftJoin({ table: "Post", src: "authorId", on: "User.id" })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} LEFT JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`);
    });

    test("chained mixed join types", () => {
        const sql = prisma.$from("User")
            .innerJoin("Post", "authorId", "User.id")
            .leftJoin("LikedPosts", "authorId", "User.id")
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} INNER JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} LEFT JOIN ${dialect.quote("LikedPosts")} ON ${dialect.quoteQualifiedColumn("LikedPosts.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`);
    });
});

describe("join unsafe variants", () => {

    test("innerJoinUnsafeTypeEnforced emits INNER JOIN", () => {
        const sql = prisma.$from("User")
            .innerJoinUnsafeTypeEnforced("Post", "id", "User.id")
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} INNER JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.id")} = ${dialect.quoteQualifiedColumn("User.id")};`);
    });

    test("innerJoinUnsafeIgnoreType emits INNER JOIN", () => {
        const sql = prisma.$from("User")
            .innerJoinUnsafeIgnoreType("Post", "id", "User.email")
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} INNER JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.id")} = ${dialect.quoteQualifiedColumn("User.email")};`);
    });

    test("leftJoinUnsafeTypeEnforced emits LEFT JOIN", () => {
        const sql = prisma.$from("User")
            .leftJoinUnsafeTypeEnforced("Post", "id", "User.id")
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} LEFT JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.id")} = ${dialect.quoteQualifiedColumn("User.id")};`);
    });

    test("leftJoinUnsafeIgnoreType emits LEFT JOIN", () => {
        const sql = prisma.$from("User")
            .leftJoinUnsafeIgnoreType("Post", "id", "User.email")
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} LEFT JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.id")} = ${dialect.quoteQualifiedColumn("User.email")};`);
    });

    test("crossJoinUnsafeTypeEnforced emits CROSS JOIN", () => {
        const sql = prisma.$from("User")
            .crossJoinUnsafeTypeEnforced("Post")
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} CROSS JOIN ${dialect.quote("Post")};`);
    });

    test("crossJoinUnsafeIgnoreType emits CROSS JOIN", () => {
        const sql = prisma.$from("User")
            .crossJoinUnsafeIgnoreType("Post")
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} CROSS JOIN ${dialect.quote("Post")};`);
    });
});

describe("join nullability types", () => {

    test("leftJoin makes new table fields nullable", () => {
        const q = prisma.$from("User").leftJoin("Post", "authorId", "User.id").select("Post.title");
        type TitleType = Awaited<ReturnType<typeof q.run>>[0]["title"];
        typeCheck({} as Expect<Equal<TitleType, string | null>>);
    });

    test("leftJoinUnsafeTypeEnforced makes new table fields nullable", () => {
        const q = prisma.$from("User").leftJoinUnsafeTypeEnforced("Post", "id", "User.id").select("Post.title");
        type TitleType = Awaited<ReturnType<typeof q.run>>[0]["title"];
        typeCheck({} as Expect<Equal<TitleType, string | null>>);
    });

    test("leftJoinUnsafeIgnoreType makes new table fields nullable", () => {
        const q = prisma.$from("User").leftJoinUnsafeIgnoreType("Post", "id", "User.email").select("Post.title");
        type TitleType = Awaited<ReturnType<typeof q.run>>[0]["title"];
        typeCheck({} as Expect<Equal<TitleType, string | null>>);
    });

    test("innerJoin preserves field types unchanged", () => {
        const q = prisma.$from("User").innerJoin("Post", "authorId", "User.id").select("Post.title");
        type TitleType = Awaited<ReturnType<typeof q.run>>[0]["title"];
        typeCheck({} as Expect<Equal<TitleType, string>>);
    });

    test("join (default) preserves field types unchanged", () => {
        const q = prisma.$from("User").join("Post", "authorId", "User.id").select("Post.title");
        type TitleType = Awaited<ReturnType<typeof q.run>>[0]["title"];
        typeCheck({} as Expect<Equal<TitleType, string>>);
    });
});
