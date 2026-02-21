import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { expectSQL } from "../../test-utils.ts"
import { prisma } from '#client'
import { dialect } from '#dialect'

describe("PostgreSQL dialect fns", () => {
    describe("stringAgg(col, sep)", () => {
        function createQuery() {
            return prisma.$from("User")
                .select(({ stringAgg }) => stringAgg("User.name", ", "), "names");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT STRING_AGG("User"."name", ', ') AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("arrayAgg(col)", () => {
        function createQuery() {
            return prisma.$from("User")
                .select(({ arrayAgg }) => arrayAgg("User.name"), "names");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT ARRAY_AGG("User"."name") AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("stddevPop(col)", () => {
        function createQuery() {
            return prisma.$from("User")
                .select(({ stddevPop }) => stddevPop("User.age"), "sd");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT STDDEV_POP("User"."age") AS ${dialect.quote("sd", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("stddevSamp(col)", () => {
        function createQuery() {
            return prisma.$from("User")
                .select(({ stddevSamp }) => stddevSamp("User.age"), "sd");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT STDDEV_SAMP("User"."age") AS ${dialect.quote("sd", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("varPop(col)", () => {
        function createQuery() {
            return prisma.$from("User")
                .select(({ varPop }) => varPop("User.age"), "v");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT VAR_POP("User"."age") AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("varSamp(col)", () => {
        function createQuery() {
            return prisma.$from("User")
                .select(({ varSamp }) => varSamp("User.age"), "v");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT VAR_SAMP("User"."age") AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("boolAnd(col)", () => {
        function createQuery() {
            return prisma.$from("User")
                .select(({ boolAnd }) => boolAnd("User.isActive"), "allActive");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT BOOL_AND("User"."isActive") AS ${dialect.quote("allActive", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("boolOr(col)", () => {
        function createQuery() {
            return prisma.$from("User")
                .select(({ boolOr }) => boolOr("User.isActive"), "anyActive");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT BOOL_OR("User"."isActive") AS ${dialect.quote("anyActive", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("jsonAgg(col)", () => {
        function createQuery() {
            return prisma.$from("User")
                .select(({ jsonAgg }) => jsonAgg("User.name"), "names");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT JSON_AGG("User"."name") AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("bitAnd(col)", () => {
        function createQuery() {
            return prisma.$from("User")
                .select(({ bitAnd }) => bitAnd("User.age"), "bits");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT BIT_AND("User"."age") AS ${dialect.quote("bits", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("bitOr(col)", () => {
        function createQuery() {
            return prisma.$from("User")
                .select(({ bitOr }) => bitOr("User.age"), "bits");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT BIT_OR("User"."age") AS ${dialect.quote("bits", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("jsonObjectAgg(key, val)", () => {
        function createQuery() {
            return prisma.$from("User")
                .select(({ jsonObjectAgg }) => jsonObjectAgg("User.id", "User.name"), "obj");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT JSON_OBJECT_AGG("User"."id", "User"."name") AS ${dialect.quote("obj", true)} FROM ${dialect.quote("User")};`);
        });
    });
});
