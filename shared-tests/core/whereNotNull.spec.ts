import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Equal, Expect, Prettify } from "../utils.ts"
import { typeCheck } from "../utils.ts"
import { expectSQL } from "../test-utils.ts"
import { prisma } from '#client'
import { dialect } from '#dialect'
import type { UserRow, UserPostQualifiedJoinRow } from "../types.ts"

describe("whereNotNull / whereIsNull", () => {

    describe("type safety — non-nullable col rejected", () => {

        it("type: User.id (non-nullable number) rejected", () => {
            prisma.$from("User")
                .join("Post", "authorId", "User.id")
                //@ts-expect-error User.id is not nullable
                .whereNotNull("User.id")
        })

        it("type: User.email (non-nullable string) rejected", () => {
            prisma.$from("User")
                //@ts-expect-error User.email is not nullable
                .whereNotNull("User.email")
        })

        it("type: after whereNotNull(name), name no longer accepted as nullable", () => {
            prisma.$from("User")
                .whereNotNull("User.name")
                //@ts-expect-error User.name is already non-null
                .whereNotNull("User.name")
        })

        it("type: User.id (non-nullable number) rejected for whereIsNull", () => {
            prisma.$from("User")
                //@ts-expect-error User.id is not nullable
                .whereIsNull("User.id")
        })

        it("type: User.email (non-nullable string) rejected for whereIsNull", () => {
            prisma.$from("User")
                //@ts-expect-error User.email is not nullable
                .whereIsNull("User.email")
        })

    })

    describe("whereNotNull — single table", () => {

        function createQuery() {
            return prisma.$from("User")
                .whereNotNull("User.name")
                .selectAll()
        }

        it("should match SQL", () => {
            const cols = ["id", "email", "name", "age"].map(c => dialect.quote(c)).join(", ")
            expectSQL(
                createQuery().getSQL(),
                `SELECT ${cols} FROM ${dialect.quote("User")} WHERE (${dialect.quoteQualifiedColumn("User.name")} IS NOT NULL);`
            )
        })

        it("should narrow string|null → string and exclude null-name rows", async () => {
            const result = await createQuery().run()
            type TExpected = Array<Prettify<Omit<UserRow, "name"> & { name: string }>>
            typeCheck({} as Expect<Equal<typeof result, TExpected>>)
            assert.equal(result.length, 2)
            assert.ok(result.every(r => r.name !== null))
        })

    })

    describe("whereIsNull — single table", () => {

        function createQuery() {
            return prisma.$from("User")
                .whereIsNull("User.name")
                .selectAll()
        }

        it("should match SQL", () => {
            const cols = ["id", "email", "name", "age"].map(c => dialect.quote(c)).join(", ")
            expectSQL(
                createQuery().getSQL(),
                `SELECT ${cols} FROM ${dialect.quote("User")} WHERE (${dialect.quoteQualifiedColumn("User.name")} IS NULL);`
            )
        })

        it("should narrow string|null → null and return only null-name rows", async () => {
            const result = await createQuery().run()
            type TExpected = Array<Prettify<Omit<UserRow, "name"> & { name: null }>>
            typeCheck({} as Expect<Equal<typeof result, TExpected>>)
            assert.equal(result.length, 1)
            assert.equal(result[0]!.name, null)
            assert.equal(result[0]!.id, 3)
        })

    })

    describe("chaining whereNotNull × 2", () => {

        function createQuery() {
            return prisma.$from("User")
                .whereNotNull("User.name")
                .whereNotNull("User.age")
                .selectAll()
        }

        it("should match SQL", () => {
            const cols = ["id", "email", "name", "age"].map(c => dialect.quote(c)).join(", ")
            expectSQL(
                createQuery().getSQL(),
                `SELECT ${cols} FROM ${dialect.quote("User")} WHERE (${dialect.quoteQualifiedColumn("User.name")} IS NOT NULL) AND (${dialect.quoteQualifiedColumn("User.age")} IS NOT NULL);`
            )
        })

        it("should narrow both cols and return rows with no nulls", async () => {
            const result = await createQuery().run()
            type TExpected = Array<Prettify<Omit<UserRow, "name" | "age"> & { name: string; age: number }>>
            typeCheck({} as Expect<Equal<typeof result, TExpected>>)
            assert.equal(result.length, 2)
            assert.ok(result.every(r => r.name !== null && r.age !== null))
        })

    })

    describe("join + whereNotNull — multi-source narrowing", () => {

        function createQuery() {
            return prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .whereNotNull("User.name")
                .selectAll()
        }

        it("should match SQL", () => {
            const userCols = ["id", "email", "name", "age"]
                .map(c => `${dialect.quoteQualifiedColumn(`User.${c}`)} AS ${dialect.quote(`User.${c}`, true)}`)
                .join(", ")
            const postCols = ["id", "title", "content", "published", "createdAt", "authorId", "lastModifiedById"]
                .map(c => `${dialect.quoteQualifiedColumn(`Post.${c}`)} AS ${dialect.quote(`Post.${c}`, true)}`)
                .join(", ")
            expectSQL(
                createQuery().getSQL(),
                `SELECT ${userCols}, ${postCols} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} WHERE (${dialect.quoteQualifiedColumn("User.name")} IS NOT NULL);`
            )
        })

        it("should narrow User.name → string in join result", async () => {
            const result = await createQuery().run()
            type TExpected = Array<Prettify<Omit<UserPostQualifiedJoinRow, "User.name"> & { "User.name": string }>>
            typeCheck({} as Expect<Equal<typeof result, TExpected>>)
            assert.equal(result.length, 3) // User3 (null name) has no posts → not in join
            assert.ok(result.every(r => r["User.name"] !== null))
        })

    })

})
