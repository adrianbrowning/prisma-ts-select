import { describe, it } from "node:test";
import { expectSQL } from "../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

const q = (col: string) => dialect.quote(col);
const qq = (col: string) => dialect.quoteQualifiedColumn(col);

describe("having() restricted to groupBy columns", () => {

    describe("type safety: criteria overload", () => {
        it("accepts grouped column", () => {
            function check() {
                prisma.$from("User")
                    .join("Post", "authorId", "User.id")
                    .groupBy(["User.name"])
                    .having({ "User.name": "Alice" });
            }
            void check;
        });

        it("rejects non-grouped column (id not in groupBy)", () => {
            function check() {
                prisma.$from("User")
                    .join("Post", "authorId", "User.id")
                    .groupBy(["User.name"])
                    // @ts-expect-error — User.id not in groupBy
                    .having({ "User.id": 1 });
            }
            void check;
        });

        it("rejects non-grouped column (email not in groupBy)", () => {
            function check() {
                prisma.$from("User")
                    .join("Post", "authorId", "User.id")
                    .groupBy(["User.name"])
                    // @ts-expect-error — User.email not in groupBy
                    .having({ "User.email": "x" });
            }
            void check;
        });

        it("accepts multiple grouped columns", () => {
            function check() {
                prisma.$from("User")
                    .join("Post", "authorId", "User.id")
                    .groupBy(["User.name", "User.id"])
                    .having({ "User.name": "Alice", "User.id": 1 });
            }
            void check;
        });

        it("rejects column not in multi-column groupBy", () => {
            function check() {
                prisma.$from("User")
                    .join("Post", "authorId", "User.id")
                    .groupBy(["User.name", "User.id"])
                    // @ts-expect-error — User.email not in groupBy
                    .having({ "User.email": "x" });
            }
            void check;
        });
    });

    describe("type safety: fn overload (aggregates) still unrestricted", () => {
        it("fn overload accepts aggregate without grouped column", () => {
            function check() {
                prisma.$from("User")
                    .join("Post", "authorId", "User.id")
                    .groupBy(["User.name"])
                    .having(({ countAll }) => [[countAll(), { op: '>', value: 1 }]]);
            }
            void check;
        });
    });

    describe("type safety: chained having preserves restriction", () => {
        it("second having also restricted to groupBy columns", () => {
            function check() {
                prisma.$from("User")
                    .join("Post", "authorId", "User.id")
                    .groupBy(["User.name", "User.id"])
                    .having({ "User.name": "Alice" })
                    // @ts-expect-error — User.email not in groupBy (chained)
                    .having({ "User.email": "x" });
            }
            void check;
        });
    });

    describe("SQL generation (positive cases)", () => {
        it("groupBy + having criteria generates correct SQL", () => {
            const sql = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .groupBy(["User.name"])
                .having({ "User.name": "Alice" })
                .select("User.name")
                .getSQL();
            expectSQL(sql, [
                `SELECT ${q("name")}`,
                `FROM ${q("User")}`,
                `JOIN ${q("Post")} ON ${qq("Post.authorId")} = ${qq("User.id")}`,
                `GROUP BY ${qq("User.name")}`,
                `HAVING ${qq("User.name")} = 'Alice';`,
            ].join(" "));
        });
    });

    describe("having without groupBy (on _fGroupBy) still accepts any column", () => {
        it("having on _fGroupBy accepts any joined column", () => {
            function check() {
                prisma.$from("User")
                    .join("Post", "authorId", "User.id")
                    .having({ "User.id": 1 });
            }
            void check;
        });
    });
});
