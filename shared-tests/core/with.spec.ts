import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { expectSQL } from "../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';
import type { Equal, Expect } from "../utils.ts";
import { typeCheck } from "../utils.ts";

// Database seeded via `pnpm p:r`:
// Users: id=1 name='John Doe', id=2 name='John Smith', id=3 name=null
// Posts: id=1 authorId=1 title='Blog 1', id=2 authorId=1 title='blog 2', id=3 authorId=2 title='blog 3'

describe("$with (CTE)", () => {

    test("single CTE - SQL structure", () => {
        const inner = prisma.$from('Post').select('id').select('authorId').select('title');
        const innerSQL = inner.getSQL().replace(/;$/, '');

        const query = prisma
            .$with('pp', inner)
            .from('User')
            .join('pp', 'authorId', 'User.id');

        const q = dialect.quoteTableIdentifier('pp', false);
        const qUser = dialect.quoteTableIdentifier('User', false);
        const sql = query.getSQL();

        assert.ok(sql.startsWith('WITH'), 'SQL should start with WITH');
        expectSQL(sql,
            `WITH ${q} AS (${innerSQL}) FROM ${qUser} JOIN ${q} ON ${dialect.quoteQualifiedColumn('pp.authorId')} = ${dialect.quoteQualifiedColumn('User.id')};`
        );
    });

    test("multiple CTEs - SQL structure", () => {
        const posts = prisma.$from('Post').select('id').select('authorId').select('title');
        const users = prisma.$from('User').select('id').select('name');

        const query = prisma
            .$with('pp', posts)
            .with('uu', users)
            .from('Post')
            .join('uu', 'id', 'Post.authorId');

        const sql = query.getSQL();
        const qpp = dialect.quoteTableIdentifier('pp', false);
        const quu = dialect.quoteTableIdentifier('uu', false);
        const qPost = dialect.quoteTableIdentifier('Post', false);

        assert.ok(sql.startsWith('WITH'), 'SQL should start WITH');
        assert.ok(sql.includes(`${qpp} AS (`), 'SQL should define CTE pp');
        assert.ok(sql.includes(`${quu} AS (`), 'SQL should define CTE uu');

        const withIdx = sql.indexOf('WITH');
        const ppIdx = sql.indexOf(`${qpp} AS (`);
        const uuIdx = sql.indexOf(`${quu} AS (`);
        // lastIndexOf: CTEs contain FROM internally; main FROM is last
        const fromIdx = sql.lastIndexOf('FROM');
        assert.ok(ppIdx > withIdx && ppIdx < fromIdx, 'pp CTE before FROM');
        assert.ok(uuIdx > withIdx && uuIdx < fromIdx, 'uu CTE before FROM');

        expectSQL(sql,
            `WITH ${qpp} AS (${posts.getSQL().replace(/;$/, '')}), ${quu} AS (${users.getSQL().replace(/;$/, '')}) FROM ${qPost} JOIN ${quu} ON ${dialect.quoteQualifiedColumn('uu.id')} = ${dialect.quoteQualifiedColumn('Post.authorId')};`
        );
    });

    test("CTE join - ON clause correct", () => {
        const inner = prisma.$from('Post').select('id').select('authorId').select('title');
        const query = prisma
            .$with('pp', inner)
            .from('User')
            .join('pp', 'authorId', 'User.id');

        const sql = query.getSQL();
        const qpp = dialect.quoteTableIdentifier('pp', false);
        const joinPart = `JOIN ${qpp} ON ${dialect.quoteQualifiedColumn('pp.authorId')} = ${dialect.quoteQualifiedColumn('User.id')}`;
        assert.ok(sql.includes(joinPart), `SQL should contain: ${joinPart}`);
    });

    test("CTE join - joinType option produces correct SQL prefix", () => {
        const inner = prisma.$from('Post').select('id').select('authorId').select('title');
        const query = prisma
            .$with('pp', inner)
            .from('User')
            .join('pp', 'authorId', 'User.id', { joinType: 'LEFT' });

        const sql = query.getSQL();
        const qpp = dialect.quoteTableIdentifier('pp', false);
        const joinPart = `LEFT JOIN ${qpp} ON ${dialect.quoteQualifiedColumn('pp.authorId')} = ${dialect.quoteQualifiedColumn('User.id')}`;
        assert.ok(sql.includes(joinPart), `SQL should contain: ${joinPart}`);
    });

    test("CTE columns accessible in select", () => {
        const inner = prisma.$from('Post').select('id').select('authorId').select('title');
        const query = prisma
            .$with('pp', inner)
            .from('User')
            .join('pp', 'authorId', 'User.id')
            .select('User.name')
            .select('pp.title');

        const sql = query.getSQL();
        assert.ok(sql.includes('SELECT'), 'SQL should have SELECT');
        assert.ok(sql.includes(dialect.quoteQualifiedColumn('pp.title')), 'SQL should reference pp.title');
    });

    test("CTE columns accessible in where", () => {
        const inner = prisma.$from('Post').select('id').select('authorId').select('title');
        const query = prisma
            .$with('pp', inner)
            .from('User')
            .join('pp', 'authorId', 'User.id')
            .where({ 'pp.title': 'Blog 1' });

        const sql = query.getSQL();
        assert.ok(sql.includes("WHERE"), 'SQL should have WHERE');
        assert.ok(sql.includes(dialect.quoteQualifiedColumn('pp.title')), 'WHERE should reference pp.title');
    });

    test("runtime result correctness - single CTE", async (t) => {
        const inner = prisma.$from('Post').select('id').select('authorId').select('title');
        const result = await prisma
            .$with('pp', inner)
            .from('User')
            .join('pp', 'authorId', 'User.id')
            .select('User.name')
            .select('pp.title')
            .run();

        t.assert.snapshot(result);
    });

    test("runtime result correctness - filtered CTE", async (t) => {
        // CTE filters to only post id=1
        const inner = prisma.$from('Post').where({ id: 1 }).select('id').select('authorId').select('title');
        const result = await prisma
            .$with('pp', inner)
            .from('User')
            .join('pp', 'authorId', 'User.id')
            .select('User.name')
            .select('pp.title')
            .run();

        t.assert.snapshot(result);
    });

    test("CTE columns accessible in groupBy", () => {
        const inner = prisma.$from('Post').select('id').select('authorId').select('title');
        const query = prisma
            .$with('pp', inner)
            .from('User')
            .join('pp', 'authorId', 'User.id')
            .groupBy(['pp.authorId'])
            .select('pp.authorId');

        const sql = query.getSQL();
        assert.ok(sql.includes('GROUP BY'), 'SQL should have GROUP BY');
        assert.ok(sql.includes(dialect.quoteQualifiedColumn('pp.authorId')), 'GROUP BY should reference pp.authorId');
    });

    test("type check - result shape", () => {
        const inner = prisma.$from('Post').select('id').select('authorId').select('title');
        const q = prisma
            .$with('pp', inner)
            .from('User')
            .join('pp', 'authorId', 'User.id')
            .select('User.name')
            .select('pp.title');

        type NameType = Awaited<ReturnType<typeof q.run>>[0]['name'];
        typeCheck({} as Expect<Equal<NameType, string | null>>);
        type TitleType = Awaited<ReturnType<typeof q.run>>[0]['pp.title'];
        typeCheck({} as Expect<Equal<TitleType, string>>);
    });

    test("type check - rejects invalid CTE column", () => {
        const inner = prisma.$from('Post').select('id').select('authorId').select('title');
        prisma
            .$with('pp', inner)
            .from('User')
            // @ts-expect-error 'nonExistentCol' is not a column in CTE 'pp'
            .join('pp', 'nonExistentCol', 'User.id');
    });

    test("type check - rejects unknown CTE name", () => {
        const inner = prisma.$from('Post').select('id').select('authorId').select('title');
        prisma
            .$with('pp', inner)
            .from('User')
            // @ts-expect-error 'unknown_cte' is not a registered CTE name
            .join('unknown_cte', 'authorId', 'User.id');
    });

    test("type check - unique real-table col is unqualified", () => {
        // User.name is unique (pp CTE has no 'name' col) → key should be 'name'
        const q = prisma.$with('pp', prisma.$from('Post').select('id').select('title'))
            .from('User').join('pp', 'id', 'User.id').select('User.name');
        type K = keyof Awaited<ReturnType<typeof q.run>>[0];
        typeCheck({} as Expect<Equal<K, 'name'>>);
    });

    test("type check - id col is unqualified (CTE not counted for dedup)", () => {
        // 'id' in User + pp CTE, but CTEs are skipped for dedup → same as runtime → key is 'id'
        const q = prisma.$with('pp', prisma.$from('Post').select('id').select('title'))
            .from('User').join('pp', 'id', 'User.id').select('User.id');
        type K = keyof Awaited<ReturnType<typeof q.run>>[0];
        typeCheck({} as Expect<Equal<K, 'id'>>);
    });

    test("type check - alias table unique col is unqualified", () => {
        // from('User', 'u') — alias 'u', 'name' unique across u + pp → key is 'name'
        const q = prisma.$with('pp', prisma.$from('Post').select('id').select('title'))
            .from('User', 'u').join('pp', 'id', 'u.id').select('u.name');
        type K = keyof Awaited<ReturnType<typeof q.run>>[0];
        typeCheck({} as Expect<Equal<K, 'name'>>);
    });

    test("runtime - throws when 'pp.*' is used in select", () => {
        const inner = prisma.$from('Post').select('id').select('authorId').select('title');
        const query = prisma
            .$with('pp', inner)
            .from('User')
            .join('pp', 'authorId', 'User.id');

        assert.throws(
            () => query.select('pp.*' as any).getSQL(),
            /Cannot expand "pp\.\*" — CTE columns must be selected explicitly/
        );
    });

    test("CTE declared but not joined - WITH clause present, no JOIN", () => {
        const inner = prisma.$from('Post').select('id').select('authorId').select('title');
        const query = prisma
            .$with('pp', inner)
            .from('User')
            .select('User.id');

        const sql = query.getSQL();
        const qpp = dialect.quoteTableIdentifier('pp', false);
        assert.ok(sql.startsWith('WITH'), 'SQL should start with WITH');
        assert.ok(sql.includes(`${qpp} AS (`), 'WITH clause should define pp');
        assert.ok(!sql.includes('JOIN'), 'SQL should have no JOIN clause');
    });

    test("CTE name is properly quoted in WITH clause header", () => {
        const inner = prisma.$from('Post').select('id').select('title');
        const query = prisma
            .$with('pp', inner)
            .from('User')
            .join('pp', 'id', 'User.id');

        const sql = query.getSQL();
        const quotedCTE = dialect.quoteTableIdentifier('pp', false);
        // WITH header must use the dialect-quoted identifier, not bare 'pp'
        assert.ok(
            sql.includes(`WITH ${quotedCTE} AS (`),
            `WITH header should use dialect-quoted identifier: WITH ${quotedCTE} AS (...)`
        );
    });

    test("CTE as base - SQL structure", () => {
        const inner = prisma.$from('Post').select('id').select('title');
        const query = prisma.$with('pp', inner).from('pp').select('pp.id');

        const sql = query.getSQL();
        const qpp = dialect.quoteTableIdentifier('pp', false);
        assert.ok(sql.startsWith('WITH'), 'SQL should start with WITH');
        assert.ok(sql.includes(`FROM ${qpp}`), `SQL should contain FROM ${qpp}`);
        assert.ok(sql.includes('SELECT'), 'SQL should have SELECT');
    });

    test("CTE as base - WHERE clause", () => {
        const inner = prisma.$from('Post').select('id').select('title');
        const query = prisma
            .$with('pp', inner)
            .from('pp')
            .where({ 'pp.id': 1 })
            .select('pp.id');

        const sql = query.getSQL();
        assert.ok(sql.includes('WHERE'), 'SQL should have WHERE');
        assert.ok(sql.includes(dialect.quoteQualifiedColumn('pp.id')), 'WHERE should reference pp.id');
    });

    test("type check - CTE as base result shape", () => {
        const inner = prisma.$from('Post').select('id').select('title');
        const q = prisma.$with('pp', inner).from('pp').select('pp.id').select('pp.title');

        type IdType = Awaited<ReturnType<typeof q.run>>[0]['pp.id'];
        type TitleType = Awaited<ReturnType<typeof q.run>>[0]['pp.title'];
        typeCheck({} as Expect<Equal<IdType, number>>);
        typeCheck({} as Expect<Equal<TitleType, string>>);
    });

    test("type check - unknown CTE name rejected", () => {
        const inner = prisma.$from('Post').select('id').select('title');
        prisma
            .$with('pp', inner)
            // @ts-expect-error 'notDeclared' is not a registered CTE name
            .from('notDeclared');
    });

    test("runtime - CTE as base returns rows", async () => {
        const inner = prisma.$from('Post').select('id').select('title');
        const result = await prisma
            .$with('pp', inner)
            .from('pp')
            .select('pp.id')
            .select('pp.title')
            .run();

        assert.ok(result.length > 0, 'Should return rows');
        assert.ok('pp.title' in result[0]!, 'Result should have pp.title');
    });

    describe("select * with CTE join", () => {
        function createQuery() {
            const inner = prisma.$from("Post").select("id").select("authorId").select("title");
            return prisma
                .$with("pp", inner)
                .from("User")
                .join("pp", "authorId", "User.id")
                .select("*");
        }

        test("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `WITH ${dialect.quoteTableIdentifier("pp", false)} AS (SELECT ${dialect.quote("id")}, ${dialect.quote("authorId")}, ${dialect.quote("title")} FROM ${dialect.quote("Post")}) SELECT ${dialect.quoteQualifiedColumn("User.id")} AS ${dialect.quote("User.id", true)}, ${dialect.quoteQualifiedColumn("User.email")} AS ${dialect.quote("User.email", true)}, ${dialect.quoteQualifiedColumn("User.name")} AS ${dialect.quote("User.name", true)}, ${dialect.quoteQualifiedColumn("User.age")} AS ${dialect.quote("User.age", true)}, ${dialect.quoteQualifiedColumn("pp.id")} AS ${dialect.quote("pp.id", true)}, ${dialect.quoteQualifiedColumn("pp.authorId")} AS ${dialect.quote("pp.authorId", true)}, ${dialect.quoteQualifiedColumn("pp.title")} AS ${dialect.quote("pp.title", true)} FROM ${dialect.quote("User")} JOIN ${dialect.quote("pp")} ON ${dialect.quoteQualifiedColumn("pp.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`
            );
        });

        test("should run and return qualified data including CTE columns", async () => {
            const result = await createQuery().run();
            type IdType = (typeof result)[0]["User.id"];
            typeCheck({} as Expect<Equal<IdType, number>>);
            type TitleType = (typeof result)[0]["pp.title"];
            typeCheck({} as Expect<Equal<TitleType, string>>);
            assert.deepStrictEqual(result, [{
                'User.id': 1, 'User.email': 'johndoe@example.com', 'User.name': 'John Doe', 'User.age': 25,
                'pp.id': 1, 'pp.authorId': 1, 'pp.title': 'Blog 1'
            }, {
                'User.id': 1, 'User.email': 'johndoe@example.com', 'User.name': 'John Doe', 'User.age': 25,
                'pp.id': 2, 'pp.authorId': 1, 'pp.title': 'blog 2'
            }, {
                'User.id': 2, 'User.email': 'smith@example.com', 'User.name': 'John Smith', 'User.age': 30,
                'pp.id': 3, 'pp.authorId': 2, 'pp.title': 'blog 3'
            }]);
        });
    });

    describe("select * with CTE as base joined to real table", () => {
        function createQuery() {
            const inner = prisma.$from("Post").select("id").select("authorId").select("title");
            return prisma
                .$with("pp", inner)
                .from("pp")
                .join("User", "id", "pp.authorId")
                .select("*");
        }

        test("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `WITH ${dialect.quoteTableIdentifier("pp", false)} AS (SELECT ${dialect.quote("id")}, ${dialect.quote("authorId")}, ${dialect.quote("title")} FROM ${dialect.quote("Post")}) SELECT ${dialect.quoteQualifiedColumn("pp.id")} AS ${dialect.quote("pp.id", true)}, ${dialect.quoteQualifiedColumn("pp.authorId")} AS ${dialect.quote("pp.authorId", true)}, ${dialect.quoteQualifiedColumn("pp.title")} AS ${dialect.quote("pp.title", true)}, ${dialect.quoteQualifiedColumn("User.id")} AS ${dialect.quote("User.id", true)}, ${dialect.quoteQualifiedColumn("User.email")} AS ${dialect.quote("User.email", true)}, ${dialect.quoteQualifiedColumn("User.name")} AS ${dialect.quote("User.name", true)}, ${dialect.quoteQualifiedColumn("User.age")} AS ${dialect.quote("User.age", true)} FROM ${dialect.quoteTableIdentifier("pp", false)} JOIN ${dialect.quote("User")} ON ${dialect.quoteQualifiedColumn("User.id")} = ${dialect.quoteQualifiedColumn("pp.authorId")};`
            );
        });

        test("should run and return qualified CTE + real table data", async () => {
            const result = await createQuery().run();
            type AuthorIdType = (typeof result)[0]["pp.authorId"];
            typeCheck({} as Expect<Equal<AuthorIdType, number>>);
            type NameType = (typeof result)[0]["User.name"];
            typeCheck({} as Expect<Equal<NameType, string | null>>);
            assert.deepStrictEqual(result, [
                { 'pp.id': 1, 'pp.authorId': 1, 'pp.title': 'Blog 1',  'User.id': 1, 'User.email': 'johndoe@example.com', 'User.name': 'John Doe',   'User.age': 25 },
                { 'pp.id': 2, 'pp.authorId': 1, 'pp.title': 'blog 2',  'User.id': 1, 'User.email': 'johndoe@example.com', 'User.name': 'John Doe',   'User.age': 25 },
                { 'pp.id': 3, 'pp.authorId': 2, 'pp.title': 'blog 3',  'User.id': 2, 'User.email': 'smith@example.com',   'User.name': 'John Smith', 'User.age': 30 },
            ]);
        });
    });

    describe("select * with CTE as base", () => {
        function createQuery() {
            const inner = prisma.$from("Post").select("id").select("authorId").select("title");
            return prisma
                .$with("pp", inner)
                .from("pp")
                .select("*");
        }

        test("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `WITH ${dialect.quoteTableIdentifier("pp", false)} AS (SELECT ${dialect.quote("id")}, ${dialect.quote("authorId")}, ${dialect.quote("title")} FROM ${dialect.quote("Post")}) SELECT * FROM ${dialect.quoteTableIdentifier("pp", false)};`
            );
        });

        test("should run and return CTE data unqualified", async () => {
            const result = await createQuery().run();
            type IdType = (typeof result)[0]["id"];
            typeCheck({} as Expect<Equal<IdType, number>>);
            type TitleType = (typeof result)[0]["title"];
            typeCheck({} as Expect<Equal<TitleType, string>>);
            assert.deepStrictEqual(result, [
                { id: 1, authorId: 1, title: 'Blog 1' },
                { id: 2, authorId: 1, title: 'blog 2' },
                { id: 3, authorId: 2, title: 'blog 3' },
            ]);
        });
    });

    describe("selectAll() with CTE join", () => {
        function createQuery() {
            const inner = prisma.$from("Post").select("id").select("authorId").select("title");
            return prisma
                .$with("pp", inner)
                .from("User")
                .join("pp", "authorId", "User.id")
                .selectAll();
        }

        test("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `WITH ${dialect.quoteTableIdentifier("pp", false)} AS (SELECT ${dialect.quote("id")}, ${dialect.quote("authorId")}, ${dialect.quote("title")} FROM ${dialect.quote("Post")}) SELECT ${dialect.quoteQualifiedColumn("User.id")} AS ${dialect.quote("User.id", true)}, ${dialect.quoteQualifiedColumn("User.email")} AS ${dialect.quote("User.email", true)}, ${dialect.quoteQualifiedColumn("User.name")} AS ${dialect.quote("User.name", true)}, ${dialect.quoteQualifiedColumn("User.age")} AS ${dialect.quote("User.age", true)}, ${dialect.quoteQualifiedColumn("pp.id")} AS ${dialect.quote("pp.id", true)}, ${dialect.quoteQualifiedColumn("pp.authorId")} AS ${dialect.quote("pp.authorId", true)}, ${dialect.quoteQualifiedColumn("pp.title")} AS ${dialect.quote("pp.title", true)} FROM ${dialect.quote("User")} JOIN ${dialect.quote("pp")} ON ${dialect.quoteQualifiedColumn("pp.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`
            );
        });

        test("should run and return qualified data including CTE columns", async () => {
            const result = await createQuery().run();
            type IdType = (typeof result)[0]["User.id"];
            typeCheck({} as Expect<Equal<IdType, number>>);
            type TitleType = (typeof result)[0]["pp.title"];
            typeCheck({} as Expect<Equal<TitleType, string>>);
            assert.deepStrictEqual(result, [{
                'User.id': 1, 'User.email': 'johndoe@example.com', 'User.name': 'John Doe', 'User.age': 25,
                'pp.id': 1, 'pp.authorId': 1, 'pp.title': 'Blog 1'
            }, {
                'User.id': 1, 'User.email': 'johndoe@example.com', 'User.name': 'John Doe', 'User.age': 25,
                'pp.id': 2, 'pp.authorId': 1, 'pp.title': 'blog 2'
            }, {
                'User.id': 2, 'User.email': 'smith@example.com', 'User.name': 'John Smith', 'User.age': 30,
                'pp.id': 3, 'pp.authorId': 2, 'pp.title': 'blog 3'
            }]);
        });
    });

    test("select * with CTE-in-join and no parseable columns throws", () => {
        const fakeQuery = { values: { selects: [] }, getSQL: () => '' } as any;
        const withCtx = prisma.$with("pp", fakeQuery);
        const joined = withCtx.from("User").join("pp" as any, "id" as any, "User.id" as any);
        assert.throws(() => joined.select("*"), /Cannot expand \* for CTE "pp"/);
    });

    test("selectAll() on CTE base throws", () => {
        const inner = prisma.$from("Post").select("id").select("title");
        const query = prisma.$with("pp", inner).from("pp");
        assert.throws(
            () => query.selectAll(),
            /selectAll\(\) is not supported when the base table is a CTE/
        );
    });

});
