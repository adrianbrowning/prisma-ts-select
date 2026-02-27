import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Equal, Expect } from "../utils.ts"
import { typeCheck } from "../utils.ts"
import { expectSQL } from "../test-utils.ts"
import { prisma } from '#client'
import { dialect } from '#dialect'

describe("manyToManyJoin", () => {

    // ──────────────────────────────────────────
    // SQL generation
    // ──────────────────────────────────────────

    describe("default (unnamed) M2M — Post → Category", () => {
        function createQuery() {
            return prisma.$from("M2M_Post")
                .manyToManyJoin("M2M_Category")
        }

        it("produces correct SQL", () => {
            expectSQL(createQuery().getSQL(),
                `FROM ${dialect.quote("M2M_Post")} JOIN ${dialect.quote("_M2M_CategoryToM2M_Post")} ON ${dialect.quoteQualifiedColumn("_M2M_CategoryToM2M_Post.B")} = ${dialect.quoteQualifiedColumn("M2M_Post.id")} JOIN ${dialect.quote("M2M_Category")} ON ${dialect.quoteQualifiedColumn("M2M_Category.id")} = ${dialect.quoteQualifiedColumn("_M2M_CategoryToM2M_Post.A")};`
            )
        })

        it("TFields includes junction + target fields (junction col selectable)", () => {
            // Verify junction + target fields are accessible via .select()
            // This would fail at compile time if _M2M_CategoryToM2M_Post or M2M_Category aren't in TFields
            const _q1 = createQuery().select("_M2M_CategoryToM2M_Post.A")
            const _q2 = createQuery().select("M2M_Category.name")
            typeCheck(
                {} as Expect<Equal<typeof _q1, typeof _q1>>, // type-level smoke test
            )
        })
    })

    describe("reverse — Category → Post (A/B swapped)", () => {
        it("produces correct SQL", () => {
            const sql = prisma.$from("M2M_Category")
                .manyToManyJoin("M2M_Post")
                .getSQL()
            expectSQL(sql,
                `FROM ${dialect.quote("M2M_Category")} JOIN ${dialect.quote("_M2M_CategoryToM2M_Post")} ON ${dialect.quoteQualifiedColumn("_M2M_CategoryToM2M_Post.A")} = ${dialect.quoteQualifiedColumn("M2M_Category.id")} JOIN ${dialect.quote("M2M_Post")} ON ${dialect.quoteQualifiedColumn("M2M_Post.id")} = ${dialect.quoteQualifiedColumn("_M2M_CategoryToM2M_Post.B")};`
            )
        })
    })

    describe("named M2M via refName", () => {
        it("uses explicit junction table", () => {
            const sql = prisma.$from("M2M_NC_Post")
                .manyToManyJoin("M2M_NC_Category", "M2M_NC")
                .getSQL()
            expectSQL(sql,
                `FROM ${dialect.quote("M2M_NC_Post")} JOIN ${dialect.quote("_M2M_NC")} ON ${dialect.quoteQualifiedColumn("_M2M_NC.B")} = ${dialect.quoteQualifiedColumn("M2M_NC_Post.id")} JOIN ${dialect.quote("M2M_NC_Category")} ON ${dialect.quoteQualifiedColumn("M2M_NC_Category.id")} = ${dialect.quoteQualifiedColumn("_M2M_NC.A")};`
            )
        })
    })

    describe("multi-M2M — refName selects correct junction", () => {
        it("M1 junction", () => {
            const sql = prisma.$from("MMM_Post")
                .manyToManyJoin("MMM_Category", "M2M_NC_M1")
                .getSQL()
            expectSQL(sql,
                `FROM ${dialect.quote("MMM_Post")} JOIN ${dialect.quote("_M2M_NC_M1")} ON ${dialect.quoteQualifiedColumn("_M2M_NC_M1.B")} = ${dialect.quoteQualifiedColumn("MMM_Post.id")} JOIN ${dialect.quote("MMM_Category")} ON ${dialect.quoteQualifiedColumn("MMM_Category.id")} = ${dialect.quoteQualifiedColumn("_M2M_NC_M1.A")};`
            )
        })

        it("M2 junction", () => {
            const sql = prisma.$from("MMM_Post")
                .manyToManyJoin("MMM_Category", "M2M_NC_M2")
                .getSQL()
            expectSQL(sql,
                `FROM ${dialect.quote("MMM_Post")} JOIN ${dialect.quote("_M2M_NC_M2")} ON ${dialect.quoteQualifiedColumn("_M2M_NC_M2.B")} = ${dialect.quoteQualifiedColumn("MMM_Post.id")} JOIN ${dialect.quote("MMM_Category")} ON ${dialect.quoteQualifiedColumn("MMM_Category.id")} = ${dialect.quoteQualifiedColumn("_M2M_NC_M2.A")};`
            )
        })
    })

    describe("target alias", () => {
        it("emits AS in SQL for aliased target", () => {
            const sql = prisma.$from("M2M_Post")
                .manyToManyJoin("M2M_Category c")
                .getSQL()
            expectSQL(sql,
                `FROM ${dialect.quote("M2M_Post")} JOIN ${dialect.quote("_M2M_CategoryToM2M_Post")} ON ${dialect.quoteQualifiedColumn("_M2M_CategoryToM2M_Post.B")} = ${dialect.quoteQualifiedColumn("M2M_Post.id")} JOIN ${dialect.quote("M2M_Category")} AS ${dialect.quote("c", true)} ON ${dialect.quoteQualifiedColumn("c.id")} = ${dialect.quoteQualifiedColumn("_M2M_CategoryToM2M_Post.A")};`
            )
        })
    })

    // ──────────────────────────────────────────
    // Type safety
    // ──────────────────────────────────────────

    describe("type safety", () => {
        it("rejects invalid refName string", () => {
            prisma.$from("MMM_Post")
                // @ts-expect-error "NotAValidRef" is not in AvailableRefNames
                .manyToManyJoin("MMM_Category", "NotAValidRef")
        })
    })

    // ──────────────────────────────────────────
    // Runtime (requires seeded data)
    // ──────────────────────────────────────────

    describe("runtime", () => {
        it("returns M2M_Category row joined via junction", async () => {
            const result = await prisma.$from("M2M_Post")
                .manyToManyJoin("M2M_Category")
                .select("M2M_Category.name")
                .run()

            assert.deepStrictEqual(result, [{ name: "M2M Category 1" }])
        })
    })
})
