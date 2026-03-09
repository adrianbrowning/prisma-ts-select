import assert from "node:assert/strict"
import { describe, it } from "node:test"
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
                .manyToManyJoin("M2M_Post", "M2M_Category")
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
        })
    })

    describe("reverse — Category → Post (A/B swapped)", () => {
        it("produces correct SQL", () => {
            const sql = prisma.$from("M2M_Category")
                .manyToManyJoin("M2M_Category", "M2M_Post")
                .getSQL()
            expectSQL(sql,
                `FROM ${dialect.quote("M2M_Category")} JOIN ${dialect.quote("_M2M_CategoryToM2M_Post")} ON ${dialect.quoteQualifiedColumn("_M2M_CategoryToM2M_Post.A")} = ${dialect.quoteQualifiedColumn("M2M_Category.id")} JOIN ${dialect.quote("M2M_Post")} ON ${dialect.quoteQualifiedColumn("M2M_Post.id")} = ${dialect.quoteQualifiedColumn("_M2M_CategoryToM2M_Post.B")};`
            )
        })
    })

    describe("named M2M via refName", () => {
        it("uses explicit junction table", () => {
            const sql = prisma.$from("M2M_NC_Post")
                .manyToManyJoin("M2M_NC_Post", "M2M_NC_Category", { refName: "M2M_NC" })
                .getSQL()
            expectSQL(sql,
                `FROM ${dialect.quote("M2M_NC_Post")} JOIN ${dialect.quote("_M2M_NC")} ON ${dialect.quoteQualifiedColumn("_M2M_NC.B")} = ${dialect.quoteQualifiedColumn("M2M_NC_Post.id")} JOIN ${dialect.quote("M2M_NC_Category")} ON ${dialect.quoteQualifiedColumn("M2M_NC_Category.id")} = ${dialect.quoteQualifiedColumn("_M2M_NC.A")};`
            )
        })
    })

    describe("multi-M2M — refName selects correct junction", () => {
        it("M1 junction", () => {
            const sql = prisma.$from("MMM_Post")
                .manyToManyJoin("MMM_Post", "MMM_Category", { refName: "M2M_NC_M1" })
                .getSQL()
            expectSQL(sql,
                `FROM ${dialect.quote("MMM_Post")} JOIN ${dialect.quote("_M2M_NC_M1")} ON ${dialect.quoteQualifiedColumn("_M2M_NC_M1.B")} = ${dialect.quoteQualifiedColumn("MMM_Post.id")} JOIN ${dialect.quote("MMM_Category")} ON ${dialect.quoteQualifiedColumn("MMM_Category.id")} = ${dialect.quoteQualifiedColumn("_M2M_NC_M1.A")};`
            )
        })

        it("M2 junction", () => {
            const sql = prisma.$from("MMM_Post")
                .manyToManyJoin("MMM_Post", "MMM_Category", { refName: "M2M_NC_M2" })
                .getSQL()
            expectSQL(sql,
                `FROM ${dialect.quote("MMM_Post")} JOIN ${dialect.quote("_M2M_NC_M2")} ON ${dialect.quoteQualifiedColumn("_M2M_NC_M2.B")} = ${dialect.quoteQualifiedColumn("MMM_Post.id")} JOIN ${dialect.quote("MMM_Category")} ON ${dialect.quoteQualifiedColumn("MMM_Category.id")} = ${dialect.quoteQualifiedColumn("_M2M_NC_M2.A")};`
            )
        })
    })

    describe("target alias", () => {
        it("emits AS in SQL for aliased target", () => {
            const sql = prisma.$from("M2M_Post")
                .manyToManyJoin("M2M_Post", "M2M_Category c")
                .getSQL()
            expectSQL(sql,
                `FROM ${dialect.quote("M2M_Post")} JOIN ${dialect.quote("_M2M_CategoryToM2M_Post")} ON ${dialect.quoteQualifiedColumn("_M2M_CategoryToM2M_Post.B")} = ${dialect.quoteQualifiedColumn("M2M_Post.id")} JOIN ${dialect.quote("M2M_Category")} AS ${dialect.quote("c", true)} ON ${dialect.quoteQualifiedColumn("c.id")} = ${dialect.quoteQualifiedColumn("_M2M_CategoryToM2M_Post.A")};`
            )
        })
    })

    describe("alias as source", () => {
        it("accepts alias for aliased $from table", () => {
            const sql = prisma.$from("M2M_Post mp")
                .manyToManyJoin("mp", "M2M_Category")
                .getSQL()
            expectSQL(sql,
                `FROM ${dialect.quote("M2M_Post")} AS ${dialect.quote("mp", true)} JOIN ${dialect.quote("_M2M_CategoryToM2M_Post")} ON ${dialect.quoteQualifiedColumn("_M2M_CategoryToM2M_Post.B")} = ${dialect.quoteQualifiedColumn("mp.id")} JOIN ${dialect.quote("M2M_Category")} ON ${dialect.quoteQualifiedColumn("M2M_Category.id")} = ${dialect.quoteQualifiedColumn("_M2M_CategoryToM2M_Post.A")};`
            )
        })

        it("rejects real table name when aliased", () => {
            prisma.$from("M2M_Post mp")
                // @ts-expect-error must use alias "mp", not real table name "M2M_Post"
                .manyToManyJoin("M2M_Post", "M2M_Category")
        })
    })

    describe("explicit source (aliased source table)", () => {
        it("uses alias to determine source entry", () => {
            const sql = prisma.$from("MMM_Post mp")
                .manyToManyJoin("mp", "MMM_Category mmc1", { refName: "M2M_NC_M1" })
                .getSQL()
            expectSQL(sql,
                `FROM ${dialect.quote("MMM_Post")} AS ${dialect.quote("mp", true)} JOIN ${dialect.quote("_M2M_NC_M1")} ON ${dialect.quoteQualifiedColumn("_M2M_NC_M1.B")} = ${dialect.quoteQualifiedColumn("mp.id")} JOIN ${dialect.quote("MMM_Category")} AS ${dialect.quote("mmc1", true)} ON ${dialect.quoteQualifiedColumn("mmc1.id")} = ${dialect.quoteQualifiedColumn("_M2M_NC_M1.A")};`
            )
        })
    })

    describe("branching M2M from same source", () => {
        it("two M2M joins to same target via different junctions", () => {
            const sql = prisma.$from("MMM_Post mp")
                .manyToManyJoin("mp", "MMM_Category mmc1", { refName: "M2M_NC_M1" })
                .manyToManyJoin("mp", "MMM_Category mmc2", { refName: "M2M_NC_M2" })
                .getSQL()
            expectSQL(sql,
                `FROM ${dialect.quote("MMM_Post")} AS ${dialect.quote("mp", true)} JOIN ${dialect.quote("_M2M_NC_M1")} ON ${dialect.quoteQualifiedColumn("_M2M_NC_M1.B")} = ${dialect.quoteQualifiedColumn("mp.id")} JOIN ${dialect.quote("MMM_Category")} AS ${dialect.quote("mmc1", true)} ON ${dialect.quoteQualifiedColumn("mmc1.id")} = ${dialect.quoteQualifiedColumn("_M2M_NC_M1.A")} JOIN ${dialect.quote("_M2M_NC_M2")} ON ${dialect.quoteQualifiedColumn("_M2M_NC_M2.B")} = ${dialect.quoteQualifiedColumn("mp.id")} JOIN ${dialect.quote("MMM_Category")} AS ${dialect.quote("mmc2", true)} ON ${dialect.quoteQualifiedColumn("mmc2.id")} = ${dialect.quoteQualifiedColumn("_M2M_NC_M2.A")};`
            )
        })
    })

    // ──────────────────────────────────────────
    // Type safety
    // ──────────────────────────────────────────

    describe("type safety", () => {
        it("rejects invalid refName string (type + runtime)", () => {
            assert.throws(() =>
                prisma.$from("MMM_Post")
                    // @ts-expect-error "NotAValidRef" is not in AvailableRefNames
                    .manyToManyJoin("MMM_Post", "MMM_Category", { refName: "NotAValidRef" })
            )
        })

        it("requires refName when source has ambiguous junctions (MMM_Post)", () => {
            prisma.$from("MMM_Post")
                // @ts-expect-error refName is required when junction is a union
                .manyToManyJoin("MMM_Post", "MMM_Category")
        })

        it("rejects invalid source table", () => {
            assert.throws(() => {
                prisma.$from("M2M_Post")
                    // @ts-expect-error "NotATable" is not a valid M2M source
                    .manyToManyJoin("NotATable", "M2M_Category")
            })
        })
    })

    describe("safeIdent validation", () => {
        it("throws on unsafe target identifier", () => {
            assert.throws(
                () => prisma.$from("M2M_Post").manyToManyJoin("M2M_Post", "M2M_Category; DROP TABLE" as any).getSQL(),
                /unsafe identifier/
            )
        })

        it("throws on unsafe refName identifier", () => {
            assert.throws(
                () => prisma.$from("MMM_Post").manyToManyJoin("MMM_Post", "MMM_Category", { refName: "M2M_NC_M1'; DROP" as any }).getSQL(),
                /unsafe identifier/
            )
        })

        it("throws on unsafe source identifier", () => {
            assert.throws(
                () => prisma.$from("M2M_Post").manyToManyJoin("M2M_Post; DROP TABLE" as any, "M2M_Category").getSQL(),
                /unsafe identifier/
            )
        })
    })

    // ──────────────────────────────────────────
    // Runtime (requires seeded data)
    // ──────────────────────────────────────────

    describe("runtime", () => {
        it("returns M2M_Category row joined via junction", async (t) => {
            const result = await prisma.$from("M2M_Post")
                .manyToManyJoin("M2M_Post", "M2M_Category")
                .select("M2M_Category.name")
                .run()

            t.assert.snapshot(result);
        })

        it("explicit source override returns correct rows", async (t) => {
            const result = await prisma.$from("MMM_Post mp")
                .manyToManyJoin("mp", "MMM_Category mmc1", { refName: "M2M_NC_M1" })
                .select("mmc1.name")
                .run()

            t.assert.snapshot(result);
        })
    })

    // ──────────────────────────────────────────
    // Multi-junction M2M bug fix
    // M2MBug_Post has M2M to BOTH M2MBug_CatA and M2MBug_CatB (different targets).
    // Without fix: keyof Relations<juncA | juncB> = {M2MBug_Post} only → AvailableM2MTargets = never
    // ──────────────────────────────────────────

    describe("manyToManyJoin with multiple junctions to different targets", () => {
        it("resolves M2M_CatA target from M2MBug_Post (2-junction source)", () => {
            // Bug: AvailableM2MTargets<["M2MBug_Post"]> was `never` because
            // keyof Relations<"_M2MBug_CatAToM2MBug_Post" | "_M2MBug_CatBToM2MBug_Post">
            // = intersection of {M2MBug_CatA, M2MBug_Post} ∩ {M2MBug_CatB, M2MBug_Post}
            // = {M2MBug_Post} → excluding sources → never
            const sql = prisma.$from("M2MBug_Post")
                .manyToManyJoin("M2MBug_Post", "M2MBug_CatA")
                .getSQL()
            expectSQL(sql,
                `FROM ${dialect.quote("M2MBug_Post")} JOIN ${dialect.quote("_M2MBug_CatAToM2MBug_Post")} ON ${dialect.quoteQualifiedColumn("_M2MBug_CatAToM2MBug_Post.B")} = ${dialect.quoteQualifiedColumn("M2MBug_Post.id")} JOIN ${dialect.quote("M2MBug_CatA")} ON ${dialect.quoteQualifiedColumn("M2MBug_CatA.id")} = ${dialect.quoteQualifiedColumn("_M2MBug_CatAToM2MBug_Post.A")};`
            )
        })

        it("resolves M2MBug_CatB after regular join (multi-source)", () => {
            // Same bug with 2 sources: [M2MBug_Post, User]
            const sql = prisma.$from("M2MBug_Post bp")
                .join("User u", "id", "bp.authorId")
                .manyToManyJoin("bp", "M2MBug_CatB")
                .getSQL()
            expectSQL(sql,
                `FROM ${dialect.quote("M2MBug_Post")} AS ${dialect.quote("bp", true)} JOIN ${dialect.quote("User")} AS ${dialect.quote("u", true)} ON ${dialect.quoteQualifiedColumn("u.id")} = ${dialect.quoteQualifiedColumn("bp.authorId")} JOIN ${dialect.quote("_M2MBug_CatBToM2MBug_Post")} ON ${dialect.quoteQualifiedColumn("_M2MBug_CatBToM2MBug_Post.B")} = ${dialect.quoteQualifiedColumn("bp.id")} JOIN ${dialect.quote("M2MBug_CatB")} ON ${dialect.quoteQualifiedColumn("M2MBug_CatB.id")} = ${dialect.quoteQualifiedColumn("_M2MBug_CatBToM2MBug_Post.A")};`
            )
        })

        it("chains both M2M joins from same source", () => {
            const sql = prisma.$from("M2MBug_Post bp")
                .join("User u", "id", "bp.authorId")
                .manyToManyJoin("bp", "M2MBug_CatA ca")
                .manyToManyJoin("bp", "M2MBug_CatB cb")
                .getSQL()
            expectSQL(sql,
                `FROM ${dialect.quote("M2MBug_Post")} AS ${dialect.quote("bp", true)} JOIN ${dialect.quote("User")} AS ${dialect.quote("u", true)} ON ${dialect.quoteQualifiedColumn("u.id")} = ${dialect.quoteQualifiedColumn("bp.authorId")} JOIN ${dialect.quote("_M2MBug_CatAToM2MBug_Post")} ON ${dialect.quoteQualifiedColumn("_M2MBug_CatAToM2MBug_Post.B")} = ${dialect.quoteQualifiedColumn("bp.id")} JOIN ${dialect.quote("M2MBug_CatA")} AS ${dialect.quote("ca", true)} ON ${dialect.quoteQualifiedColumn("ca.id")} = ${dialect.quoteQualifiedColumn("_M2MBug_CatAToM2MBug_Post.A")} JOIN ${dialect.quote("_M2MBug_CatBToM2MBug_Post")} ON ${dialect.quoteQualifiedColumn("_M2MBug_CatBToM2MBug_Post.B")} = ${dialect.quoteQualifiedColumn("bp.id")} JOIN ${dialect.quote("M2MBug_CatB")} AS ${dialect.quote("cb", true)} ON ${dialect.quoteQualifiedColumn("cb.id")} = ${dialect.quoteQualifiedColumn("_M2MBug_CatBToM2MBug_Post.A")};`
            )
        })

        it("runtime: returns rows with both junctions joined", async (t) => {
            const result = await prisma.$from("M2MBug_Post bp")
                .join("User u", "id", "bp.authorId")
                .manyToManyJoin("bp", "M2MBug_CatA ca")
                .manyToManyJoin("bp", "M2MBug_CatB cb")
                .select("bp.title")
                .select("u.name")
                .select("ca.name")
                .select("cb.name")
                .run()
            t.assert.snapshot(result);
        })
    })
})
