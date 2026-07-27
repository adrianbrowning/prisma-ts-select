import { describe, it } from "node:test";
import type { Equal, Expect } from "../utils.ts";
import { typeCheck } from "../utils.ts";
import { expectSQL } from "../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

describe("scalar subquery — builder as SQLExpr", () => {

    describe("single-select builder in coalesce()", () => {
        function createQuery() {
            const subquery = prisma.$from("Post")
                .where({ id: 1 })
                .select("title");

            return prisma.$from("User")
                .select(({ coalesce }) => coalesce(subquery, "User.name"), "label");
        }

        it("should emit parenthesized scalar subquery", () => {
            const q = dialect.quote;
            const qc = dialect.quoteQualifiedColumn;
            expectSQL(createQuery().getSQL(),
                `SELECT COALESCE((SELECT ${q("title", false)} FROM ${q("Post")} WHERE ${qc("id")} = 1), ${qc("User.name")}) AS ${q("label", true)} FROM ${q("User")};`);
        });

        it("type: string", () => {
            const result = createQuery();
            typeCheck({} as Expect<Equal<Awaited<ReturnType<typeof result.run>>, Array<{ label: string }>>>);
        });
    });

    describe("single-select builder passed directly to select()", () => {
        function createQuery() {
            const subquery = prisma.$from("Post")
                .where({ id: 1 })
                .select("title");

            return prisma.$from("User")
                .select(subquery, "postTitle");
        }

        it("should emit parenthesized scalar subquery as select expression", () => {
            const q = dialect.quote;
            const qc = dialect.quoteQualifiedColumn;
            expectSQL(createQuery().getSQL(),
                `SELECT (SELECT ${q("title", false)} FROM ${q("Post")} WHERE ${qc("id")} = 1) AS ${q("postTitle", true)} FROM ${q("User")};`);
        });

        it("type: string", () => {
            const result = createQuery();
            typeCheck({} as Expect<Equal<Awaited<ReturnType<typeof result.run>>, Array<{ postTitle: string }>>>);
        });
    });

    describe("correlated scalar subquery with $col", () => {
        it("should emit correlated subquery", () => {
            const subquery = prisma.$from("Post")
                .where({ authorId: { $col: "Post.authorId" } })
                .select(({ countAll }) => countAll(), "cnt");

            const sql = prisma.$from("User")
                .select("name")
                .select(subquery, "postCount")
                .getSQL();

            const q = dialect.quote;
            const qc = dialect.quoteQualifiedColumn;
            expectSQL(sql,
                `SELECT ${q("name", false)}, (SELECT COUNT(*) AS ${q("cnt", true)} FROM ${q("Post")} WHERE ${qc("authorId")} = ${qc("Post.authorId")}) AS ${q("postCount", true)} FROM ${q("User")};`);
        });
    });

    describe("type safety — multi-select builder rejected in .select() overload", () => {
        it("rejects multi-column builder passed to .select()", () => {
            const sub = prisma.$from("Post")
                .where({ id: 1 })
                .select("title")
                .select("id");

            // @ts-expect-error multi-select builder not assignable to single-select overload
            prisma.$from("User").select(sub, "x");
        });
    });
});
