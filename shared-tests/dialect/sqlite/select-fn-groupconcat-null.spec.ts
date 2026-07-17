import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Equal, Expect } from "../../utils.ts"
import { typeCheck } from "../../utils.ts"
import { expectSQL } from "../../test-utils.ts"
import { prisma } from '#client'
import { dialect } from '#dialect'

function sortByNames(rows: Array<{ names: string | null }>, sep = ","): Array<{ names: string | null }> {
    return rows
        .map(r => ({ names: r.names !== null ? r.names.split(sep).sort().join(sep) : null }))
        .sort((a, b) => {
            if (a.names === null) return 1;
            if (b.names === null) return -1;
            return a.names < b.names ? -1 : a.names > b.names ? 1 : 0;
        });
}

describe("groupConcat nullability propagation (SQLite)", () => {

    describe("inner join + groupConcat(col) — non-nullable col stays string", () => {
        function createQuery() {
            return prisma.$from("User")
                .innerJoin("Post", "authorId", "User.id")
                .groupBy(["User.id"])
                .select(({ groupConcat }) => groupConcat("Post.title"), "names");
        }

        it("type: string (not string | null)", () => {
            const q = createQuery();
            type R = Awaited<ReturnType<typeof q.run>>;
            typeCheck({} as Expect<Equal<R, Array<{ names: string }>>>);
        });

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT GROUP_CONCAT(${dialect.quoteQualifiedColumn("Post.title")}) AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")} INNER JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} GROUP BY ${dialect.quoteQualifiedColumn("User.id")};`);
        });

        it("should run and return sorted results", async () => {
            const result = await createQuery().run();
            assert.deepStrictEqual(sortByNames(result, ","), [
                { names: "Blog 1,blog 2" },
                { names: "blog 3" },
            ]);
        });
    });

    describe("left join + groupConcat(col) — nullable col stays string | null", () => {
        function createQuery() {
            return prisma.$from("User")
                .leftJoin("Post", "authorId", "User.id")
                .groupBy(["User.id"])
                .select(({ groupConcat }) => groupConcat("Post.title"), "names");
        }

        it("type: string | null (regression guard)", () => {
            const q = createQuery();
            type R = Awaited<ReturnType<typeof q.run>>;
            typeCheck({} as Expect<Equal<R, Array<{ names: string | null }>>>);
        });

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT GROUP_CONCAT(${dialect.quoteQualifiedColumn("Post.title")}) AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")} LEFT JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} GROUP BY ${dialect.quoteQualifiedColumn("User.id")};`);
        });

        it("should run and include null for users without posts", async () => {
            const result = await createQuery().run();
            assert.deepStrictEqual(sortByNames(result, ","), [
                { names: "Blog 1,blog 2" },
                { names: "blog 3" },
                { names: null },
            ]);
        });
    });

    describe("inner join + groupConcat(distinct(col)) — non-nullable col stays string", () => {
        function createQuery() {
            return prisma.$from("User")
                .innerJoin("Post", "authorId", "User.id")
                .groupBy(["User.id"])
                .select(({ groupConcat, distinct }) => groupConcat(distinct("Post.title")), "names");
        }

        it("type: string (regression guard)", () => {
            const q = createQuery();
            type R = Awaited<ReturnType<typeof q.run>>;
            typeCheck({} as Expect<Equal<R, Array<{ names: string }>>>);
        });

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT GROUP_CONCAT(DISTINCT ${dialect.quoteQualifiedColumn("Post.title")}) AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")} INNER JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} GROUP BY ${dialect.quoteQualifiedColumn("User.id")};`);
        });

        it("should run and return sorted results", async () => {
            const result = await createQuery().run();
            assert.deepStrictEqual(sortByNames(result, ","), [
                { names: "Blog 1,blog 2" },
                { names: "blog 3" },
            ]);
        });
    });

    describe("left join + groupConcat(distinct(col)) — nullable col should be string | null", () => {
        function createQuery() {
            return prisma.$from("User")
                .leftJoin("Post", "authorId", "User.id")
                .groupBy(["User.id"])
                .select(({ groupConcat, distinct }) => groupConcat(distinct("Post.title")), "names");
        }

        it("type: string | null", () => {
            const q = createQuery();
            type R = Awaited<ReturnType<typeof q.run>>;
            typeCheck({} as Expect<Equal<R, Array<{ names: string | null }>>>);
        });

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT GROUP_CONCAT(DISTINCT ${dialect.quoteQualifiedColumn("Post.title")}) AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")} LEFT JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} GROUP BY ${dialect.quoteQualifiedColumn("User.id")};`);
        });

        it("should run and include null for users without posts", async () => {
            const result = await createQuery().run();
            assert.deepStrictEqual(sortByNames(result, ","), [
                { names: "Blog 1,blog 2" },
                { names: "blog 3" },
                { names: null },
            ]);
        });
    });

    describe("schema-nullable col (no join) + groupConcat(col) — overload 2", () => {
        function createQuery() {
            return prisma.$from("User")
                .groupBy(["User.id"])
                .select(({ groupConcat }) => groupConcat("User.name"), "names");
        }

        it("type: string | null (User.name is String? in schema)", () => {
            const q = createQuery();
            type R = Awaited<ReturnType<typeof q.run>>;
            typeCheck({} as Expect<Equal<R, Array<{ names: string | null }>>>);
        });

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT GROUP_CONCAT(${dialect.quoteQualifiedColumn("User.name")}) AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")} GROUP BY ${dialect.quoteQualifiedColumn("User.id")};`);
        });

        it("should run and return null for users with null name", async () => {
            const result = await createQuery().run();
            assert.deepStrictEqual(sortByNames(result, ","), [
                { names: "John Doe" },
                { names: "John Smith" },
                { names: null },
            ]);
        });
    });

    describe("schema-nullable col + groupConcat(col, sep) — SQLite two-arg syntax", () => {
        function createQuery() {
            return prisma.$from("User")
                .groupBy(["User.id"])
                .select(({ groupConcat }) => groupConcat("User.name", " | "), "names");
        }

        it("type: string | null", () => {
            const q = createQuery();
            type R = Awaited<ReturnType<typeof q.run>>;
            typeCheck({} as Expect<Equal<R, Array<{ names: string | null }>>>);
        });

        it("should match SQL — two-arg syntax (not SEPARATOR keyword)", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT GROUP_CONCAT(${dialect.quoteQualifiedColumn("User.name")}, ' | ') AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")} GROUP BY ${dialect.quoteQualifiedColumn("User.id")};`);
        });

        it("should run and return values", async () => {
            const result = await createQuery().run();
            assert.deepStrictEqual(sortByNames(result, " | "), [
                { names: "John Doe" },
                { names: "John Smith" },
                { names: null },
            ]);
        });
    });

    describe("raw SQLExpr<string> input — overload 3", () => {
        function createQuery() {
            return prisma.$from("User")
                .innerJoin("Post", "authorId", "User.id")
                .groupBy(["User.id"])
                .select(({ groupConcat, substr }) => groupConcat(substr("Post.title", 1)), "names");
        }

        it("type: string (SQLExpr<string> in → SQLExpr<string> out)", () => {
            const q = createQuery();
            type R = Awaited<ReturnType<typeof q.run>>;
            typeCheck({} as Expect<Equal<R, Array<{ names: string }>>>);
        });

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT GROUP_CONCAT(SUBSTR(${dialect.quoteQualifiedColumn("Post.title")}, 1)) AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")} INNER JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} GROUP BY ${dialect.quoteQualifiedColumn("User.id")};`);
        });

        it("should run and return sorted results", async () => {
            const result = await createQuery().run();
            assert.deepStrictEqual(sortByNames(result, ","), [
                { names: "Blog 1,blog 2" },
                { names: "blog 3" },
            ]);
        });

        it("type: string | null (SQLExpr<string | null> in → SQLExpr<string | null> out)", () => {
            // Verifies overload 3: groupConcat(SQLExpr<string|null>) → SQLExpr<string|null>.
            // Query is constructed but never run() — nested aggregate is valid SQL-builder input.
            const q = prisma.$from("User")
                .leftJoin("Post", "authorId", "User.id")
                .groupBy(["User.id"])
                .select(({ groupConcat }) => {
                    const nullableExpr = groupConcat("Post.title"); // SQLExpr<string | null> via overload 2
                    return groupConcat(nullableExpr);               // overload 3: T = string | null
                }, "names");
            type R = Awaited<ReturnType<typeof q.run>>;
            typeCheck({} as Expect<Equal<R, Array<{ names: string | null }>>>);
        });
    });

    describe("type boundary", () => {
        it("groupConcat(SQLExpr<bigint>) should be a type error", () => {
            // @ts-expect-error — SQLExpr<bigint> does not satisfy T extends string | null
            prisma.$from("User").select(({ groupConcat, count }) => groupConcat(count("User.id")), "v");
        });

        it("groupConcat(distinct(number col)) should be a type error", () => {
            // @ts-expect-error — SQLDistinct<number | null> fails T extends string | null constraint
            prisma.$from("User").select(({ groupConcat, distinct }) => groupConcat(distinct("User.age")), "v");
        });

        it("groupConcat(distinct(col), sep) should be a type error + runtime guard", () => {
            assert.throws(() => prisma.$from("User").innerJoin("Post", "authorId", "User.id").groupBy(["User.id"])
                // @ts-expect-error — distinct overload has no sep param; DISTINCT_BRAND excludes overload 3
                .select(({ groupConcat, distinct }) => groupConcat(distinct("Post.title"), ","), "names"),
                /SQLite does not support GROUP_CONCAT\(DISTINCT col, sep\)/);
        });
    });

});
