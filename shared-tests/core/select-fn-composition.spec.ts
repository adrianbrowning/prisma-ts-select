import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { expectSQL } from "../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

describe("select() nested function composition", () => {

    describe("sum(coalesce(col, lit(0)))", () => {
        function createQuery() {
            return prisma.$from("User").select(({ sum, coalesce, lit }) => sum(coalesce("User.age", lit(0))), "total");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT SUM(COALESCE(${dialect.quoteQualifiedColumn("User.age")}, 0)) AS ${dialect.quote("total", true)} FROM ${dialect.quote("User")};`);
        });

        it("should run", async () => {
            const result = await createQuery().run();
            assert.ok(Array.isArray(result));
            assert.ok(result.length > 0);
            assert.ok("total" in result[0]);
        });
    });

    describe("abs(round(lit(-4.567), 2))", () => {
        function createQuery() {
            return prisma.$from("User").select(({ abs, round, lit }) => abs(round(lit(-4.567), 2)), "v");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT ABS(ROUND(-4.567, 2)) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });

        it("should run", async () => {
            const result = await createQuery().run();
            assert.ok(Array.isArray(result));
            assert.ok(result.length > 0);
            assert.ok("v" in result[0]);
        });
    });

    describe("upper(concat(col1, col2))", () => {
        function createQuery() {
            return prisma.$from("User").select(({ upper, concat }) => upper(concat("User.name", "User.email")), "v");
        }

        it("should match SQL", () => {
            const col1 = dialect.quoteQualifiedColumn("User.name");
            const col2 = dialect.quoteQualifiedColumn("User.email");
            const concatExpr = dialect.name === "sqlite" ? `${col1} || ${col2}` : `CONCAT(${col1}, ${col2})`;
            expectSQL(createQuery().getSQL(),
                `SELECT UPPER(${concatExpr}) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });

        it("should run", async () => {
            const result = await createQuery().run();
            assert.ok(Array.isArray(result));
            assert.ok(result.length > 0);
            assert.ok("v" in result[0]);
        });
    });

    describe("lower(coalesce(col, lit('N/A')))", () => {
        function createQuery() {
            return prisma.$from("User").select(({ lower, coalesce, lit }) => lower(coalesce("User.name", lit("N/A"))), "v");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT LOWER(COALESCE(${dialect.quoteQualifiedColumn("User.name")}, 'N/A')) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });

        it("should run", async () => {
            const result = await createQuery().run();
            assert.ok(Array.isArray(result));
            assert.ok(result.length > 0);
            assert.ok("v" in result[0]);
        });
    });

});
