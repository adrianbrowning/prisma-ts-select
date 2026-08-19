import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getDialect, sqliteDialect, mysqlDialect, postgresqlDialect } from "../src/dialects/index.ts";
import { mysqlV6ContextFns } from "../src/dialects/mysql-v6.ts";
import { mysqlV7ContextFns } from "../src/dialects/mysql-v7.ts";
import { mysqlContextFns, supportedJoinMethods as mysqlJoins } from "../src/dialects/mysql.ts";
import { postgresqlV6ContextFns } from "../src/dialects/postgresql-v6.ts";
import { postgresqlV7ContextFns } from "../src/dialects/postgresql-v7.ts";
import { postgresqlContextFns, supportedJoinMethods as pgJoins } from "../src/dialects/postgresql.ts";
import { esc, flattenJsonObjectPairs } from "../src/dialects/shared.ts";
import { sqliteContextFns, supportedJoinMethods as sqliteJoins } from "../src/dialects/sqlite.ts";
import { SUPPORTED_PROVIDERS } from "../src/dialects/types.ts";
import { sqlExpr, sqlDistinct } from "../src/sql-expr.ts";

const id = (s: string) => s;
const bt = (s: string) => `\`${s}\``;
const dq = (s: string) => `"${s}"`;

type TestCols =
  | ["id", number]
  | ["name", string]
  | ["price", number]
  | ["val", number]
  | ["data", object]
  | ["d", Date]
  | ["a", string]
  | ["b", string]
  | ["c", string]
  | ["v", string]
  | ["flag", boolean];

void describe("dialects/types.ts", () => {
  void test("SUPPORTED_PROVIDERS", () => {
    assert.deepEqual([ ...SUPPORTED_PROVIDERS ], [ "sqlite", "mysql", "postgresql" ]);
  });
});

void describe("dialects/shared.ts", () => {
  void test("esc escapes single quotes", () => {
    assert.equal(esc("it's"), "it''s");
    assert.equal(esc("no quotes"), "no quotes");
  });

  void test("flattenJsonObjectPairs with string values", () => {
    const result = flattenJsonObjectPairs([[ "key", "col" ]], id);
    assert.deepEqual(result, [ "'key'", "col" ]);
  });

  void test("flattenJsonObjectPairs with SQLExpr values", () => {
    const expr = sqlExpr<string>("UPPER(name)");
    const result = flattenJsonObjectPairs([[ "k", expr ]], id);
    assert.deepEqual(result, [ "'k'", "UPPER(name)" ]);
  });

  void test("flattenJsonObjectPairs escapes key quotes", () => {
    const result = flattenJsonObjectPairs([[ "it's", "col" ]], id);
    assert.deepEqual(result, [ "'it''s'", "col" ]);
  });
});

void describe("dialects/index.ts getDialect", () => {
  void test("returns sqlite for 'sqlite'", () => {
    assert.equal(getDialect("sqlite").name, "sqlite");
  });

  void test("returns mysql for 'mysql'", () => {
    assert.equal(getDialect("mysql").name, "mysql");
  });

  void test("returns postgresql for 'postgresql'", () => {
    assert.equal(getDialect("postgresql").name, "postgresql");
  });

  void test("defaults to sqlite for unknown provider", () => {
    assert.equal(getDialect("unknown" as never).name, "sqlite");
  });
});

void describe("sqliteDialect", () => {
  void test("name", () => assert.equal(sqliteDialect.name, "sqlite"));
  void test("quote plain (not alias)", () => assert.equal(sqliteDialect.quote("id", false), "id"));
  void test("quote alias wrapped in backticks", () => assert.equal(sqliteDialect.quote("a", true), "`a`"));
  void test("needsBooleanCoercion", () => assert.equal(sqliteDialect.needsBooleanCoercion(), true));
  void test("quoteTableIdentifier table plain", () => assert.equal(sqliteDialect.quoteTableIdentifier("User", false), "User"));
  void test("quoteTableIdentifier alias wrapped", () => assert.equal(sqliteDialect.quoteTableIdentifier("u", true), "`u`"));
  void test("quoteQualifiedColumn qualified", () => assert.equal(sqliteDialect.quoteQualifiedColumn("User.id"), "User.id"));
  void test("quoteQualifiedColumn unqualified", () => assert.equal(sqliteDialect.quoteQualifiedColumn("id"), "id"));
  void test("quoteOrderByClause with direction", () => assert.equal(sqliteDialect.quoteOrderByClause("User.name DESC"), "User.name DESC"));
  void test("quoteOrderByClause no direction, unqualified", () => assert.equal(sqliteDialect.quoteOrderByClause("id"), "id"));
  void test("supportedJoinMethods is array", () => assert.ok(Array.isArray(sqliteJoins)));
});

void describe("mysqlDialect", () => {
  void test("name", () => assert.equal(mysqlDialect.name, "mysql"));
  void test("quote wraps in backticks", () => assert.equal(mysqlDialect.quote("id", false), "`id`"));
  void test("quote escapes backticks", () => assert.equal(mysqlDialect.quote("a`b", false), "`a``b`"));
  void test("needsBooleanCoercion", () => assert.equal(mysqlDialect.needsBooleanCoercion(), true));
  void test("quoteTableIdentifier", () => assert.equal(mysqlDialect.quoteTableIdentifier("User", false), "`User`"));
  void test("quoteQualifiedColumn qualified", () => assert.equal(mysqlDialect.quoteQualifiedColumn("User.id"), "`User`.`id`"));
  void test("quoteQualifiedColumn unqualified", () => assert.equal(mysqlDialect.quoteQualifiedColumn("id"), "`id`"));
  void test("quoteOrderByClause with direction", () => assert.equal(mysqlDialect.quoteOrderByClause("User.name DESC"), "`User`.`name` DESC"));
  void test("quoteOrderByClause no direction, unqualified", () => assert.equal(mysqlDialect.quoteOrderByClause("id"), "`id`"));
  void test("supportedJoinMethods is array", () => assert.ok(Array.isArray(mysqlJoins)));
});

void describe("postgresqlDialect", () => {
  void test("name", () => assert.equal(postgresqlDialect.name, "postgresql"));
  void test("quote wraps in double quotes", () => assert.equal(postgresqlDialect.quote("id", false), "\"id\""));
  void test("quote escapes double quotes", () => assert.equal(postgresqlDialect.quote("a\"b", false), "\"a\"\"b\""));
  void test("needsBooleanCoercion", () => assert.equal(postgresqlDialect.needsBooleanCoercion(), false));
  void test("quoteTableIdentifier", () => assert.equal(postgresqlDialect.quoteTableIdentifier("User", false), "\"User\""));
  void test("quoteQualifiedColumn qualified", () => assert.equal(postgresqlDialect.quoteQualifiedColumn("User.id"), "\"User\".\"id\""));
  void test("quoteQualifiedColumn unqualified", () => assert.equal(postgresqlDialect.quoteQualifiedColumn("id"), "\"id\""));
  void test("quoteOrderByClause with direction", () => assert.equal(postgresqlDialect.quoteOrderByClause("User.name DESC"), "\"User\".\"name\" DESC"));
  void test("quoteOrderByClause no direction, unqualified", () => assert.equal(postgresqlDialect.quoteOrderByClause("id"), "\"id\""));
  void test("supportedJoinMethods is array", () => assert.ok(Array.isArray(pgJoins)));
});

void describe("sqliteContextFns", () => {
  const fns = sqliteContextFns<TestCols, object>(bt, () => "1=1");

  void test("countAll", () => assert.equal(fns.countAll().sql, "COUNT(*)"));
  void test("count with column", () => assert.equal(fns.count("id").sql, "COUNT(`id`)"));
  void test("count with *", () => assert.equal(fns.count("*").sql, "COUNT(*)"));
  void test("countDistinct", () => assert.equal(fns.countDistinct("id").sql, "COUNT(DISTINCT `id`)"));
  void test("sum", () => assert.equal(fns.sum("price").sql, "SUM(`price`)"));
  void test("avg", () => assert.equal(fns.avg("price").sql, "AVG(`price`)"));
  void test("min", () => assert.equal(fns.min("price").sql, "MIN(`price`)"));
  void test("max", () => assert.equal(fns.max("price").sql, "MAX(`price`)"));
  void test("abs", () => assert.equal(fns.abs("val").sql, "ABS(`val`)"));
  void test("ceil", () => assert.equal(fns.ceil("val").sql, "CEIL(`val`)"));
  void test("floor", () => assert.equal(fns.floor("val").sql, "FLOOR(`val`)"));
  void test("round", () => assert.equal(fns.round("val").sql, "ROUND(`val`)"));
  void test("round with decimals", () => assert.equal(fns.round("val", 2).sql, "ROUND(`val`, 2)"));
  void test("power with number exp", () => assert.equal(fns.power("val", 2).sql, "POWER(`val`, 2)"));
  void test("power with SQLExpr exp", () => assert.equal(fns.power("val", sqlExpr<number>("2")).sql, "POWER(`val`, 2)"));
  void test("sqrt", () => assert.equal(fns.sqrt("val").sql, "SQRT(`val`)"));
  void test("mod", () => assert.equal(fns.mod("val", 3).sql, "MOD(`val`, 3)"));
  void test("sign", () => assert.equal(fns.sign("val").sql, "SIGN(`val`)"));
  void test("exp", () => assert.equal(fns.exp("val").sql, "EXP(`val`)"));
  void test("random", () => assert.equal(fns.random().sql, "RANDOM()"));
  void test("log", () => assert.equal(fns.log("val").sql, "LOG(`val`)"));
  void test("log2", () => assert.equal(fns.log2("val").sql, "LOG2(`val`)"));
  void test("log10", () => assert.equal(fns.log10("val").sql, "LOG10(`val`)"));
  void test("length", () => assert.equal(fns.length("name").sql, "LENGTH(`name`)"));
  void test("substr 2 args", () => assert.equal(fns.substr("name", 1).sql, "SUBSTR(`name`, 1)"));
  void test("substr 3 args", () => assert.equal(fns.substr("name", 1, 3).sql, "SUBSTR(`name`, 1, 3)"));
  void test("instr", () => assert.equal(fns.instr("name", "x'y").sql, "INSTR(`name`, 'x''y')"));
  void test("char", () => assert.equal(fns.char(65, 66).sql, "CHAR(65, 66)"));
  void test("hex", () => assert.equal(fns.hex("name").sql, "HEX(`name`)"));
  void test("unicode", () => assert.equal(fns.unicode("name").sql, "UNICODE(`name`)"));
  void test("concat", () => assert.equal(fns.concat("a", "b").sql, "`a` || `b`"));
  void test("concat throws with 0 args", () => {
    assert.throws(() => (fns.concat as (...a: Array<never>) => unknown)(), /at least one/);
  });
  void test("ifNull", () => {
    const expr = sqlExpr<string>("'x'");
    assert.equal(fns.ifNull("name", expr).sql, "IFNULL(`name`, 'x')");
  });
  void test("iif with criteria object", () => {
    const t = sqlExpr<number>("1");
    const f = sqlExpr<number>("0");
    assert.equal(fns.iif({} as never, t, f).sql, "IIF(1=1, 1, 0)");
  });
  void test("iif with SQLExpr cond", () => {
    const t = sqlExpr<number>("1");
    const f = sqlExpr<number>("0");
    assert.equal(fns.iif(sqlExpr("x > 0"), t, f).sql, "IIF(x > 0, 1, 0)");
  });
  void test("total", () => assert.equal(fns.total("id").sql, "TOTAL(`id`)"));
  void test("groupConcat plain", () => assert.equal(fns.groupConcat("name").sql, "GROUP_CONCAT(`name`)"));
  void test("groupConcat with separator", () => assert.equal(fns.groupConcat("name", ",").sql, "GROUP_CONCAT(`name`, ',')"));
  void test("groupConcat with distinct+separator throws", () => {
    // @ts-expect-error — testing runtime guard against misuse
    assert.throws(() => fns.groupConcat(sqlDistinct<string>("DISTINCT `name`"), ","), /DISTINCT/);
  });
  void test("cast", () => assert.equal(fns.cast("val", "INTEGER").sql, "CAST(`val` AS INTEGER)"));
  void test("cast invalid throws", () => {
    assert.throws(() => fns.cast("val", "BOGUS" as never), /invalid cast type/);
  });
  void test("distinct", () => assert.equal(fns.distinct("id").sql, "DISTINCT `id`"));
  void test("now", () => assert.equal(fns.now().sql, "datetime('now')"));
  void test("curDate", () => assert.equal(fns.curDate().sql, "date('now')"));
  void test("year col string", () => assert.match(fns.year("d").sql, /^strftime\('%Y', CASE/));
  void test("year with SQLExpr", () => assert.equal(fns.year(sqlExpr<Date>("now()")).sql, "strftime('%Y', now())"));
  void test("month", () => assert.match(fns.month("d").sql, /^strftime\('%m',/));
  void test("day", () => assert.match(fns.day("d").sql, /^strftime\('%d',/));
  void test("hour", () => assert.match(fns.hour("d").sql, /^strftime\('%H',/));
  void test("minute", () => assert.match(fns.minute("d").sql, /^strftime\('%M',/));
  void test("second", () => assert.match(fns.second("d").sql, /^strftime\('%S',/));
  void test("strftime", () => assert.match(fns.strftime("%Y-%m", "d").sql, /^strftime\('%Y-%m',/));
  void test("strftime escapes quotes", () => assert.match(fns.strftime("it's", "d").sql, /'it''s'/));
  void test("julianday", () => assert.match(fns.julianday("d").sql, /^julianday\(/));
  void test("date", () => assert.match(fns.date("d").sql, /^date\(/));
  void test("datetime", () => assert.match(fns.datetime("d").sql, /^datetime\(/));
  void test("jsonExtract", () => assert.equal(fns.jsonExtract("data", "$.name").sql, "json_extract(`data`, '$.name')"));
  void test("jsonArray", () => assert.equal(fns.jsonArray("a", "b").sql, "json_array(`a`, `b`)"));
  void test("jsonObject", () => assert.equal(fns.jsonObject([[ "k", "v" ]]).sql, "json_object('k', `v`)"));
});

void describe("mysqlContextFns", () => {
  const fns = mysqlContextFns<TestCols, object>(bt, () => "1=1");

  void test("countAll", () => assert.equal(fns.countAll().sql, "COUNT(*)"));
  void test("count col", () => assert.equal(fns.count("id").sql, "COUNT(`id`)"));
  void test("count *", () => assert.equal(fns.count("*").sql, "COUNT(*)"));
  void test("countDistinct", () => assert.equal(fns.countDistinct("id").sql, "COUNT(DISTINCT `id`)"));
  void test("sum", () => assert.equal(fns.sum("price").sql, "SUM(`price`)"));
  void test("avg", () => assert.equal(fns.avg("price").sql, "AVG(`price`)"));
  void test("length", () => assert.equal(fns.length("name").sql, "LENGTH(`name`)"));
  void test("distinct", () => assert.equal(fns.distinct("id").sql, "DISTINCT `id`"));
  void test("concat", () => assert.equal(fns.concat("a", "b").sql, "CONCAT(`a`, `b`)"));
  void test("concat throws with 0 args", () => {
    assert.throws(() => (fns.concat as (...a: Array<never>) => unknown)(), /at least one/);
  });
  void test("substring 2 args", () => assert.equal(fns.substring("name", 1).sql, "SUBSTRING(`name`, 1)"));
  void test("substring 3 args", () => assert.equal(fns.substring("name", 1, 3).sql, "SUBSTRING(`name`, 1, 3)"));
  void test("left", () => assert.equal(fns.left("name", 2).sql, "LEFT(`name`, 2)"));
  void test("right", () => assert.equal(fns.right("name", 2).sql, "RIGHT(`name`, 2)"));
  void test("repeat", () => assert.equal(fns.repeat("name", 2).sql, "REPEAT(`name`, 2)"));
  void test("reverse", () => assert.equal(fns.reverse("name").sql, "REVERSE(`name`)"));
  void test("lpad", () => assert.equal(fns.lpad("name", 5, "0").sql, "LPAD(`name`, 5, '0')"));
  void test("rpad", () => assert.equal(fns.rpad("name", 5, "0").sql, "RPAD(`name`, 5, '0')"));
  void test("locate", () => assert.equal(fns.locate("x", "name").sql, "LOCATE('x', `name`)"));
  void test("space", () => assert.equal(fns.space(3).sql, "SPACE(3)"));
  void test("dateFormat", () => assert.equal(fns.dateFormat("d", "%Y").sql, "DATE_FORMAT(`d`, '%Y')"));
  void test("dateAdd", () => assert.equal(fns.dateAdd("d", 1, "DAY").sql, "DATE_ADD(`d`, INTERVAL 1 DAY)"));
  void test("dateAdd non-finite throws", () => {
    assert.throws(() => fns.dateAdd("d", NaN, "DAY"), /finite number/);
  });
  void test("dateSub", () => assert.equal(fns.dateSub("d", 1, "DAY").sql, "DATE_SUB(`d`, INTERVAL 1 DAY)"));
  void test("dateSub non-finite throws", () => {
    assert.throws(() => fns.dateSub("d", Infinity, "DAY"), /finite number/);
  });
  void test("dateDiff", () => assert.equal(fns.dateDiff("d", "d").sql, "DATEDIFF(`d`, `d`)"));
  void test("date", () => assert.equal(fns.date("d").sql, "DATE(`d`)"));
  void test("quarter", () => assert.equal(fns.quarter("d").sql, "QUARTER(`d`)"));
  void test("weekOfYear", () => assert.equal(fns.weekOfYear("d").sql, "WEEKOFYEAR(`d`)"));
  void test("dayName", () => assert.equal(fns.dayName("d").sql, "DAYNAME(`d`)"));
  void test("lastDay", () => assert.equal(fns.lastDay("d").sql, "LAST_DAY(`d`)"));
  void test("now", () => assert.equal(fns.now().sql, "NOW()"));
  void test("curDate", () => assert.equal(fns.curDate().sql, "CURDATE()"));
  void test("year", () => assert.equal(fns.year("d").sql, "YEAR(`d`)"));
  void test("month", () => assert.equal(fns.month("d").sql, "MONTH(`d`)"));
  void test("day", () => assert.equal(fns.day("d").sql, "DAY(`d`)"));
  void test("hour", () => assert.equal(fns.hour("d").sql, "HOUR(`d`)"));
  void test("minute", () => assert.equal(fns.minute("d").sql, "MINUTE(`d`)"));
  void test("second", () => assert.equal(fns.second("d").sql, "SECOND(`d`)"));
  void test("$if with criteria", () => {
    const t = sqlExpr<number>("1");
    const f = sqlExpr<number>("0");
    assert.equal(fns.$if({} as never, t, f).sql, "IF(1=1, 1, 0)");
  });
  void test("$if with SQLExpr cond", () => {
    const t = sqlExpr<number>("1");
    const f = sqlExpr<number>("0");
    assert.equal(fns.$if(sqlExpr("x > 0"), t, f).sql, "IF(x > 0, 1, 0)");
  });
  void test("ifNull", () => {
    assert.equal(fns.ifNull("name", sqlExpr<string>("'x'")).sql, "IFNULL(`name`, 'x')");
  });
  void test("greatest", () => assert.equal(fns.greatest<number>("val", "price").sql, "GREATEST(`val`, `price`)"));
  void test("greatest throws with 0 args", () => {
    assert.throws(() => (fns.greatest as (...a: Array<never>) => unknown)(), /at least one/);
  });
  void test("least", () => assert.equal(fns.least<number>("val", "price").sql, "LEAST(`val`, `price`)"));
  void test("least throws with 0 args", () => {
    assert.throws(() => (fns.least as (...a: Array<never>) => unknown)(), /at least one/);
  });
  void test("abs", () => assert.equal(fns.abs("val").sql, "ABS(`val`)"));
  void test("ceil", () => assert.equal(fns.ceil("val").sql, "CEIL(`val`)"));
  void test("floor", () => assert.equal(fns.floor("val").sql, "FLOOR(`val`)"));
  void test("round no decimals", () => assert.equal(fns.round("val").sql, "ROUND(`val`)"));
  void test("round with decimals", () => assert.equal(fns.round("val", 2).sql, "ROUND(`val`, 2)"));
  void test("power number exp", () => assert.equal(fns.power("val", 2).sql, "POWER(`val`, 2)"));
  void test("power SQLExpr exp", () => assert.equal(fns.power("val", sqlExpr<number>("2")).sql, "POWER(`val`, 2)"));
  void test("sqrt", () => assert.equal(fns.sqrt("val").sql, "SQRT(`val`)"));
  void test("mod", () => assert.equal(fns.mod("val", 2).sql, "MOD(`val`, 2)"));
  void test("sign", () => assert.equal(fns.sign("val").sql, "SIGN(`val`)"));
  void test("exp", () => assert.equal(fns.exp("val").sql, "EXP(`val`)"));
  void test("pi", () => assert.equal(fns.pi().sql, "PI()"));
  void test("ln", () => assert.equal(fns.ln("val").sql, "LN(`val`)"));
  void test("log", () => assert.equal(fns.log("val").sql, "LOG(`val`)"));
  void test("log2", () => assert.equal(fns.log2("val").sql, "LOG2(`val`)"));
  void test("log10", () => assert.equal(fns.log10("val").sql, "LOG10(`val`)"));
  void test("truncate", () => assert.equal(fns.truncate("val", 2).sql, "TRUNCATE(`val`, 2)"));
  void test("rand no seed", () => assert.equal(fns.rand().sql, "RAND()"));
  void test("rand with seed", () => assert.equal(fns.rand(1).sql, "RAND(1)"));
  void test("jsonExtract", () => assert.equal(fns.jsonExtract("data", "$.name").sql, "JSON_EXTRACT(`data`, '$.name')"));
  void test("jsonArray", () => assert.equal(fns.jsonArray("a", "b").sql, "JSON_ARRAY(`a`, `b`)"));
  void test("jsonObject", () => assert.equal(fns.jsonObject([[ "k", "v" ]]).sql, "JSON_OBJECT('k', `v`)"));
  void test("bitAnd", () => assert.equal(fns.bitAnd("val").sql, "BIT_AND(`val`)"));
  void test("bitOr", () => assert.equal(fns.bitOr("val").sql, "BIT_OR(`val`)"));
  void test("bitXor", () => assert.equal(fns.bitXor("val").sql, "BIT_XOR(`val`)"));
  void test("stddev", () => assert.equal(fns.stddev("val").sql, "STDDEV(`val`)"));
  void test("stddevSamp", () => assert.equal(fns.stddevSamp("val").sql, "STDDEV_SAMP(`val`)"));
  void test("variance", () => assert.equal(fns.variance("val").sql, "VARIANCE(`val`)"));
  void test("varSamp", () => assert.equal(fns.varSamp("val").sql, "VAR_SAMP(`val`)"));
  void test("jsonArrayAgg", () => assert.equal(fns.jsonArrayAgg("data").sql, "JSON_ARRAYAGG(`data`)"));
  void test("jsonObjectAgg", () => assert.equal(fns.jsonObjectAgg("name", "val").sql, "JSON_OBJECTAGG(`name`, `val`)"));
  void test("groupConcat plain", () => assert.equal(fns.groupConcat("name").sql, "GROUP_CONCAT(`name`)"));
  void test("groupConcat with separator", () => assert.equal(fns.groupConcat("name", ",").sql, "GROUP_CONCAT(`name` SEPARATOR ',')"));
  void test("cast", () => assert.equal(fns.cast("val", "SIGNED").sql, "CAST(`val` AS SIGNED)"));
  void test("cast invalid throws", () => {
    assert.throws(() => fns.cast("val", "BOGUS" as never), /invalid cast type/);
  });
});

void describe("postgresqlContextFns", () => {
  const fns = postgresqlContextFns<TestCols>(dq);

  void test("countAll", () => assert.equal(fns.countAll().sql, "COUNT(*)"));
  void test("count col", () => assert.equal(fns.count("id").sql, "COUNT(\"id\")"));
  void test("count *", () => assert.equal(fns.count("*").sql, "COUNT(*)"));
  void test("countDistinct", () => assert.equal(fns.countDistinct("id").sql, "COUNT(DISTINCT \"id\")"));
  void test("sum", () => assert.equal(fns.sum("price").sql, "SUM(\"price\")"));
  void test("avg", () => assert.equal(fns.avg("price").sql, "AVG(\"price\")"));
  void test("length", () => assert.equal(fns.length("name").sql, "LENGTH(\"name\")"));
  void test("distinct", () => assert.equal(fns.distinct("id").sql, "DISTINCT \"id\""));
  void test("concat", () => assert.equal(fns.concat("a", "b").sql, "CONCAT(\"a\", \"b\")"));
  void test("concat throws with 0 args", () => {
    assert.throws(() => (fns.concat as (...a: Array<never>) => unknown)(), /at least one/);
  });
  void test("substring 2", () => assert.equal(fns.substring("name", 1).sql, "SUBSTRING(\"name\", 1)"));
  void test("substring 3", () => assert.equal(fns.substring("name", 1, 3).sql, "SUBSTRING(\"name\", 1, 3)"));
  void test("left", () => assert.equal(fns.left("name", 2).sql, "LEFT(\"name\", 2)"));
  void test("right", () => assert.equal(fns.right("name", 2).sql, "RIGHT(\"name\", 2)"));
  void test("repeat", () => assert.equal(fns.repeat("name", 2).sql, "REPEAT(\"name\", 2)"));
  void test("reverse", () => assert.equal(fns.reverse("name").sql, "REVERSE(\"name\")"));
  void test("lpad", () => assert.equal(fns.lpad("name", 5, "0").sql, "LPAD(\"name\", 5, '0')"));
  void test("rpad", () => assert.equal(fns.rpad("name", 5, "0").sql, "RPAD(\"name\", 5, '0')"));
  void test("initcap", () => assert.equal(fns.initcap("name").sql, "INITCAP(\"name\")"));
  void test("strpos", () => assert.equal(fns.strpos("name", "x").sql, "STRPOS(\"name\", 'x')"));
  void test("splitPart", () => assert.equal(fns.splitPart("name", ",", 1).sql, "SPLIT_PART(\"name\", ',', 1)"));
  void test("btrim no chars", () => assert.equal(fns.btrim("name").sql, "BTRIM(\"name\")"));
  void test("btrim with chars", () => assert.equal(fns.btrim("name", " ").sql, "BTRIM(\"name\", ' ')"));
  void test("md5", () => assert.equal(fns.md5("name").sql, "MD5(\"name\")"));
  void test("stringAgg", () => assert.equal(fns.stringAgg("name", ",").sql, "STRING_AGG(\"name\", ',')"));
  void test("arrayAgg", () => assert.equal(fns.arrayAgg("name").sql, "ARRAY_AGG(\"name\")"));
  void test("stddevPop", () => assert.equal(fns.stddevPop("val").sql, "STDDEV_POP(\"val\")"));
  void test("stddevSamp", () => assert.equal(fns.stddevSamp("val").sql, "STDDEV_SAMP(\"val\")"));
  void test("varPop", () => assert.equal(fns.varPop("val").sql, "VAR_POP(\"val\")"));
  void test("varSamp", () => assert.equal(fns.varSamp("val").sql, "VAR_SAMP(\"val\")"));
  void test("boolAnd", () => assert.equal(fns.boolAnd("flag").sql, "BOOL_AND(\"flag\")"));
  void test("boolOr", () => assert.equal(fns.boolOr("flag").sql, "BOOL_OR(\"flag\")"));
  void test("jsonAgg", () => assert.equal(fns.jsonAgg("data").sql, "JSON_AGG(\"data\")"));
  void test("bitAnd", () => assert.equal(fns.bitAnd("val").sql, "BIT_AND(\"val\")"));
  void test("bitOr", () => assert.equal(fns.bitOr("val").sql, "BIT_OR(\"val\")"));
  void test("jsonObjectAgg", () => assert.equal(fns.jsonObjectAgg("name", "val").sql, "JSON_OBJECT_AGG(\"name\", \"val\")"));
  void test("greatest", () => assert.equal(fns.greatest<number>("val", "price").sql, "GREATEST(\"val\", \"price\")"));
  void test("greatest throws with 0 args", () => {
    assert.throws(() => (fns.greatest as (...a: Array<never>) => unknown)(), /at least one/);
  });
  void test("least", () => assert.equal(fns.least<number>("val", "price").sql, "LEAST(\"val\", \"price\")"));
  void test("least throws with 0 args", () => {
    assert.throws(() => (fns.least as (...a: Array<never>) => unknown)(), /at least one/);
  });
  void test("now", () => assert.equal(fns.now().sql, "NOW()"));
  void test("curDate", () => assert.equal(fns.curDate().sql, "CURRENT_DATE"));
  void test("year", () => assert.equal(fns.year("d").sql, "EXTRACT(YEAR FROM \"d\")::integer"));
  void test("month", () => assert.equal(fns.month("d").sql, "EXTRACT(MONTH FROM \"d\")::integer"));
  void test("day", () => assert.equal(fns.day("d").sql, "EXTRACT(DAY FROM \"d\")::integer"));
  void test("hour", () => assert.equal(fns.hour("d").sql, "EXTRACT(HOUR FROM \"d\")::integer"));
  void test("minute", () => assert.equal(fns.minute("d").sql, "EXTRACT(MINUTE FROM \"d\")::integer"));
  void test("second", () => assert.equal(fns.second("d").sql, "EXTRACT(SECOND FROM \"d\")::integer"));
  void test("extract", () => assert.equal(fns.extract("YEAR", "d").sql, "EXTRACT(YEAR FROM \"d\")"));
  void test("dateTrunc", () => assert.equal(fns.dateTrunc("month", "d").sql, "DATE_TRUNC('month', \"d\")"));
  void test("age single arg", () => assert.equal(fns.age("d").sql, "AGE(\"d\")"));
  void test("age two args", () => assert.equal(fns.age("d", "d").sql, "AGE(\"d\", \"d\")"));
  void test("toDate", () => assert.equal(fns.toDate("name", "YYYY-MM-DD").sql, "TO_DATE(\"name\", 'YYYY-MM-DD')"));
  void test("abs", () => assert.equal(fns.abs("val").sql, "ABS(\"val\")"));
  void test("ceil", () => assert.equal(fns.ceil("val").sql, "CEIL(\"val\")"));
  void test("floor", () => assert.equal(fns.floor("val").sql, "FLOOR(\"val\")"));
  void test("round no decimals", () => assert.equal(fns.round("val").sql, "ROUND(\"val\")"));
  void test("round with decimals", () => assert.equal(fns.round("val", 2).sql, "ROUND(\"val\", 2)"));
  void test("power number exp", () => assert.equal(fns.power("val", 2).sql, "POWER(\"val\", 2)"));
  void test("power SQLExpr exp", () => assert.equal(fns.power("val", sqlExpr<number>("2")).sql, "POWER(\"val\", 2)"));
  void test("sqrt", () => assert.equal(fns.sqrt("val").sql, "SQRT(\"val\")"));
  void test("mod", () => assert.equal(fns.mod("val", 2).sql, "MOD(\"val\", 2)"));
  void test("sign", () => assert.equal(fns.sign("val").sql, "SIGN(\"val\")"));
  void test("exp", () => assert.equal(fns.exp("val").sql, "EXP(\"val\")"));
  void test("pi", () => assert.equal(fns.pi().sql, "PI()"));
  void test("ln", () => assert.equal(fns.ln("val").sql, "LN(\"val\")"));
  void test("log", () => assert.equal(fns.log("val").sql, "LOG(\"val\")"));
  void test("logBase", () => assert.equal(fns.logBase(10, "val").sql, "LOG(10, \"val\")"));
  void test("trunc no n", () => assert.equal(fns.trunc("val").sql, "TRUNC(\"val\")"));
  void test("trunc with n", () => assert.equal(fns.trunc("val", 2).sql, "TRUNC(\"val\", 2)"));
  void test("div", () => assert.equal(fns.div("val", 2).sql, "DIV(\"val\", 2)"));
  void test("random", () => assert.equal(fns.random().sql, "RANDOM()"));
  void test("jsonExtract", () => assert.equal(fns.jsonExtract("data", "$.name").sql, "jsonb_path_query_first(\"data\", '$.name')"));
  void test("jsonArray", () => assert.equal(fns.jsonArray("a", "b").sql, "jsonb_build_array(\"a\", \"b\")"));
  void test("jsonObject", () => assert.equal(fns.jsonObject([[ "k", "v" ]]).sql, "jsonb_build_object('k', \"v\")"));
  void test("cast", () => assert.equal(fns.cast("val", "INTEGER").sql, "CAST(\"val\" AS INTEGER)"));
  void test("cast invalid throws", () => {
    assert.throws(() => fns.cast("val", "BOGUS" as never), /invalid cast type/);
  });
});

void describe("mysqlV6ContextFns overrides", () => {
  const fns = mysqlV6ContextFns<TestCols, object>(bt, () => "1=1");

  void test("countAll", () => assert.equal(fns.countAll().sql, "COUNT(*)"));
  void test("count col", () => assert.equal(fns.count("id").sql, "COUNT(`id`)"));
  void test("count *", () => assert.equal(fns.count("*").sql, "COUNT(*)"));
  void test("countDistinct", () => assert.equal(fns.countDistinct("id").sql, "COUNT(DISTINCT `id`)"));
  void test("length", () => assert.equal(fns.length("name").sql, "LENGTH(`name`)"));
  void test("abs", () => assert.equal(fns.abs("val").sql, "ABS(`val`)"));
  void test("ceil", () => assert.equal(fns.ceil("val").sql, "CEIL(`val`)"));
  void test("floor", () => assert.equal(fns.floor("val").sql, "FLOOR(`val`)"));
  void test("mod", () => assert.equal(fns.mod("val", 2).sql, "MOD(`val`, 2)"));
  void test("sign", () => assert.equal(fns.sign("val").sql, "SIGN(`val`)"));
});

void describe("mysqlV7ContextFns", () => {
  void test("re-exports mysqlContextFns", () => {
    const fns = mysqlV7ContextFns<TestCols, object>(bt, () => "1=1");
    assert.equal(fns.countAll().sql, "COUNT(*)");
  });
});

void describe("postgresqlV6ContextFns overrides", () => {
  const fns = postgresqlV6ContextFns<TestCols>(dq);

  void test("countAll", () => assert.equal(fns.countAll().sql, "COUNT(*)"));
  void test("count col", () => assert.equal(fns.count("id").sql, "COUNT(\"id\")"));
  void test("count *", () => assert.equal(fns.count("*").sql, "COUNT(*)"));
  void test("countDistinct", () => assert.equal(fns.countDistinct("id").sql, "COUNT(DISTINCT \"id\")"));
  void test("ceil", () => assert.equal(fns.ceil("val").sql, "CEIL(\"val\")"));
  void test("floor", () => assert.equal(fns.floor("val").sql, "FLOOR(\"val\")"));
});

void describe("postgresqlV7ContextFns overrides", () => {
  const fns = postgresqlV7ContextFns<TestCols>(dq);

  void test("countAll", () => assert.equal(fns.countAll().sql, "COUNT(*)"));
  void test("count col", () => assert.equal(fns.count("id").sql, "COUNT(\"id\")"));
  void test("count *", () => assert.equal(fns.count("*").sql, "COUNT(*)"));
  void test("countDistinct", () => assert.equal(fns.countDistinct("id").sql, "COUNT(DISTINCT \"id\")"));
  void test("ceil", () => assert.equal(fns.ceil("val").sql, "CEIL(\"val\")"));
  void test("floor", () => assert.equal(fns.floor("val").sql, "FLOOR(\"val\")"));
});
