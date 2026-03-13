import { describe, it } from "node:test"
import type { Equal, Expect } from "../../utils.ts"
import { typeCheck } from "../../utils.ts"
import { prisma } from '#client'

describe("groupConcat nullability propagation (SQLite)", () => {

    describe("inner join + groupConcat(col) — non-nullable col stays string", () => {
        it("type: string (not string | null)", () => {
            const q = prisma.$from("User")
                .innerJoin("Post", "authorId", "User.id")
                .groupBy(["User.id"])
                .select(({ groupConcat }) => groupConcat("Post.title"), "names");
            type R = Awaited<ReturnType<typeof q.run>>;
            // FAILS currently: groupConcat always returns SQLExpr<string | null>, so names = string | null
            typeCheck({} as Expect<Equal<R, Array<{ names: string }>>>);
        });
    });

    describe("left join + groupConcat(col) — nullable col stays string | null", () => {
        it("type: string | null (regression guard)", () => {
            const q = prisma.$from("User")
                .leftJoin("Post", "authorId", "User.id")
                .groupBy(["User.id"])
                .select(({ groupConcat }) => groupConcat("Post.title"), "names");
            type R = Awaited<ReturnType<typeof q.run>>;
            // PASSES currently: groupConcat returns SQLExpr<string | null>
            typeCheck({} as Expect<Equal<R, Array<{ names: string | null }>>>);
        });
    });

    describe("inner join + groupConcat(distinct(col)) — non-nullable col stays string", () => {
        it("type: string (regression guard)", () => {
            const q = prisma.$from("User")
                .innerJoin("Post", "authorId", "User.id")
                .groupBy(["User.id"])
                .select(({ groupConcat, distinct }) => groupConcat(distinct("Post.title")), "names");
            type R = Awaited<ReturnType<typeof q.run>>;
            // PASSES currently: distinct strips null via NonNullable, groupConcat returns string
            typeCheck({} as Expect<Equal<R, Array<{ names: string }>>>);
        });
    });

    describe("left join + groupConcat(distinct(col)) — nullable col should be string | null", () => {
        it("type: string | null", () => {
            const q = prisma.$from("User")
                .leftJoin("Post", "authorId", "User.id")
                .groupBy(["User.id"])
                .select(({ groupConcat, distinct }) => groupConcat(distinct("Post.title")), "names");
            type R = Awaited<ReturnType<typeof q.run>>;
            // FAILS currently: distinct uses NonNullable stripping null, so names = string instead of string | null
            typeCheck({} as Expect<Equal<R, Array<{ names: string | null }>>>);
        });
    });

});
