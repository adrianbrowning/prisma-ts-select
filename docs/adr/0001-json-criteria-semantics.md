# ADR 0001: Cross-dialect JSON criteria semantics

- Status: Accepted
- Date: 2026-09-26
- Issue: #148 (parent #105)
- Implemented by: #149 (JSON equality), #150 (first JSON query slice), #156 (renderer regression tests)

## Context

Prisma `Json` fields are typed `JSONValue` in select results (`GetTSType<"Json">` in `extend.ts`). In `.where()` they only accept `{ op: "IS NULL" }` and `{ op: "IS NOT NULL" }`: `SUPPORTED_TYPES` leaves out `JSONValue` (see #105) and `CondValueForField` has no JSON branch.

The three dialects disagree on JSON in ways that matter for a typed query builder. The SQL behavior below was checked with the native clients against SQLite 3.46.0 and 3.53.1, MySQL 8.0.46 and PostgreSQL 16.14. Result decoding was checked through `$queryRawUnsafe` on Prisma 6.19 and 7.8 for all three dialects; SQLite 3.46.0 is the Prisma 6.19 engine's build and 3.53.1 is better-sqlite3 13.0.3's (Prisma 7).

- **Equality.** PostgreSQL `jsonb` and MySQL `JSON` compare structurally: object key order and whitespace are ignored and `1 = 1.0 = 1e0`. SQLite has no JSON type. `json(a) = json(b)` compares minified text, so `{"b":1,"a":2}` does not equal `{"a":2,"b":1}` and `1.0` does not equal `1`. PostgreSQL `json` (as opposed to `jsonb`) has no `=` operator at all.
- **Comparing to a non-JSON string.** MySQL `json_col = '{"a":1}'` treats the right side as a JSON *string* and returns false. The value must go through `CAST(? AS JSON)`.
- **Null.** `json_extract()` in SQLite returns SQL NULL for both a JSON `null` and a missing path. SQLite `->`, MySQL `JSON_EXTRACT` and PostgreSQL `jsonb_path_query_first` return a JSON `null` value for the first case and SQL NULL for the second.
- **Paths.** PostgreSQL jsonpath defaults to lax mode: `$.a` on `[{"a":1}]` returns `1` and `$.a[0]` on `{"a":5}` returns `5`. `strict` mode fixes that but raises `JSON object does not contain key "a"` on a missing key unless the `silent` argument is `true`. MySQL also auto-wraps: `$[0]` on a non-array returns the value itself. SQLite returns NULL in both cases.
- **Results.** For expressions (not whole columns), Prisma decodes MySQL `JSON` and PostgreSQL `jsonb` into JS values. SQLite has no JSON result type, so the same expressions come back as SQL values: `json_extract` returns objects and arrays as strings (`'{"b":1}'`) and booleans as `1n`. SQL boolean expressions such as `x IS NOT NULL` come back as `0n`/`1n` on SQLite and MySQL and as `false`/`true` on PostgreSQL. Whole `Json` columns come back parsed on every dialect (shared test snapshots); on SQLite, Prisma declares the column type as `JSONB`.
- **Large numbers.** A JSON integer above 2^53 comes back as a rounded JS `number` on MySQL and PostgreSQL (`9007199254740993` becomes `9007199254740992`). The drivers round it before the builder sees the row.

### Current renderer behavior

This ADR defines a target contract. It does not describe how the renderer works today.

- `sqlVal()` (`extend.ts:484`) writes criteria values into the SQL text as literals. Strings go through `esc()` (`dialects/shared.ts`), which only doubles single quotes. `run()` executes the result with `$queryRawUnsafe(this.getSQL())` and no parameters (`extend.ts:673`). Nothing is bound today.
- `sqlVal()` throws on objects and arrays, so JSON values cannot reach it.
- The existing dialect-specific `jsonExtract(col, path)` helpers (in `dialects/sqlite.ts`, `mysql.ts` and `postgresql.ts`) inline the path with `esc()`, take native path strings, and are typed `SQLExpr<JSONValue>`. On SQLite that type is wrong for objects, arrays and booleans (see Results above).
- `run()` turns `0`/`1` into booleans only for output columns it can map to a `Boolean` model field. It has no way to decode an arbitrary expression.

## Decision

### 1. Parameter safety

- JSON values and JSON paths MUST reach the database as bound parameters. They MUST NOT be interpolated into SQL text, and they MUST NOT go through `sqlVal()` or `esc()`.
- JSON criteria MUST NOT ship on the inline-literal renderer. #149 and #150 depend on the renderer gaining bound parameters (#29 and the move away from `$queryRawUnsafe(sql)` with no arguments). Before either issue merges, #156 must show in regression tests that JSON values and paths appear in the parameter list and not in the SQL text.
- The builder serializes values itself (section 2) and binds the resulting **string**. It never passes JS objects to a driver, so the JSON text never depends on how a driver serializes objects.
- Placeholders: `?` on SQLite and MySQL, `$n` on PostgreSQL. The SQL around each placeholder converts the string to JSON:

| Bound item | SQLite | MySQL | PostgreSQL |
|---|---|---|---|
| JSON value | `json(?)` | `CAST(? AS JSON)` | `CAST($n AS jsonb)` |
| JSON path | `?` | `?` | `CAST($n AS jsonpath)` |

- Column identifiers keep using the dialect's existing quoting (`dialect.quote`).
- `whereRaw()` stays an unsafe escape hatch and is not covered by this contract.

### 2. Value serialization

A JSON criterion value is a `JSONValue`, or the `jsonNull` sentinel described in section 4. Before binding, the builder validates the value recursively and then calls `JSON.stringify`.

The builder accepts:
- strings, including any Unicode;
- finite numbers (`-0` serializes as `0`);
- booleans;
- `null` nested inside an array or object, which means JSON `null`;
- arrays;
- plain objects (prototype `Object.prototype` or `null`).

The builder rejects the following with a `TypeError`. Each of these would otherwise throw inside `JSON.stringify` or silently turn into different JSON:
- `bigint` (use a number or a numeric string);
- `NaN`, `Infinity`, `-Infinity` (`JSON.stringify` turns them into `null`);
- `undefined` at any depth (`JSON.stringify` drops it from objects and turns it into `null` in arrays);
- `Date`, `Buffer`, `Map`, `Set`, class instances and any object with a `toJSON` method (pass an explicit representation such as `date.toISOString()`);
- functions, symbols and sparse arrays;
- cyclic references.

A top-level JS `null` is never a JSON value. See section 4.

### 3. Canonical path format

A public JSON path is an array of segments:

```ts
type JsonPathSegment = string | number;   // string = object key, number = array index
type JsonPath = ReadonlyArray<JsonPathSegment>;
// ["tags", 0]  →  metadata.tags[0]
// []           →  the whole document
```

- A string segment is an object key. Any string is allowed, including `""`, `"a.b"`, `"0"`, and keys containing quotes, backslashes or non-ASCII characters.
- A number segment is an array index. It must be a non-negative safe integer; anything else is a `TypeError`.
- Not supported: wildcards, recursive descent, filters, negative indexes, `last`, ranges and lax/strict prefixes supplied by the user.

The builder renders the segment array into one dialect path string and binds it (section 1):

- The string always starts with `$`.
- Each key becomes `.` followed by `JSON.stringify(key)`. So `a"b` renders as `."a\"b"`.
- Each index becomes `[n]`.
- PostgreSQL gets the prefix `strict `, and every PostgreSQL path function is called with `silent => true`. Strict mode stops the lax unwrapping and wrapping. Silent mode turns a missing key into SQL NULL instead of an error.

Example: `["tags", 0]` renders as `$."tags"[0]` on SQLite and MySQL and as `strict $."tags"[0]` on PostgreSQL.

Quoted keys with JSON escapes (`\"`, `\\`, `\u00e9`), empty keys and dotted keys resolve the same way on all three dialects.

The existing `jsonExtract(col, path: string)` helpers keep their native, per-dialect path strings. The builder does not translate those.

### 4. SQL NULL, JSON null and missing path

These are three different states:

- **SQL NULL**: the column holds no value (`Prisma.DbNull`).
- **JSON null**: the column, or the value at the path, is the JSON literal `null` (`Prisma.JsonNull`, or `{"a": null}` at path `["a"]`).
- **Missing path**: the document exists but nothing is at the path.

The public API spells them this way:
- A JS `null` in criteria keeps its meaning for every other column type: SQL NULL. The existing `{ op: "IS NULL" }` / `{ op: "IS NOT NULL" }` criteria and the shorthand `{ col: null }` test SQL NULL only.
- JSON null has its own sentinel exported by prisma-ts-select, `jsonNull`. It is not JS `null`, and it is not `Prisma.JsonNull`, so criteria do not depend on the generated client's runtime classes. `{ op: "=", value: null }` is a type error on JSON columns.
- A missing path is detected with `jsonPathExists`.

| Stored state | `IS NULL` | `= jsonNull` | `= <any value>` / `!= <any value>` | `jsonPathExists(path)` | `jsonGet(path)` in a select |
|---|---|---|---|---|---|
| Column is SQL NULL | true | no match (UNKNOWN) | no match (UNKNOWN) | false | `null` |
| Column is JSON null, path `[]` | false | true | compared as JSON | true | `null` |
| JSON null at path | false | true | compared as JSON | true | `null` |
| Path missing | false | no match (UNKNOWN) | no match (UNKNOWN) | false | `null` |

Standard SQL three-valued logic applies. A comparison against SQL NULL or a missing path is UNKNOWN, so `!=` excludes those rows too. Use `jsonPathExists` or `IS NULL` to include or exclude them explicitly.

Results cannot tell the three states apart: each one decodes to JS `null`. That matches how Prisma already returns `Json` columns.

### 5. Equality semantics

`{ op: "=" | "!=", value }` compares JSON to JSON. The left side is a JSON column or a `jsonGet` expression. The right side is a serialized JSON value or `jsonNull`.

| Aspect | SQLite | MySQL | PostgreSQL |
|---|---|---|---|
| Rendering (column) | `json(col) = json(?)` | `col = CAST(? AS JSON)` | `CAST(col AS jsonb) = CAST($n AS jsonb)` |
| Comparison model | minified text | structural | structural |
| Object key order | **significant** | ignored | ignored |
| Whitespace | ignored | ignored | ignored |
| Array order and duplicates | significant | significant | significant |
| Numbers | text: `1` ≠ `1.0` ≠ `1e0` | numeric: `1` = `1.0` = `1e0` | numeric: `1` = `1.0` = `1e0` |
| Integers above 2^53 | text (exact) | exact within int64/uint64, double beyond | arbitrary precision (exact) |
| `true` vs `1`, `"1"` vs `1` | not equal | not equal | not equal |
| `"\u00e9"` vs `"é"` in stored text | **not equal** | equal | equal |
| Duplicate keys in stored text | kept, so not equal | last one wins | last one wins |

SQLite equality matches structural equality only when both texts use the same key order, number spelling and string escaping. Prisma writes and builder-serialized values both come from `JSON.stringify`, which fixes number spelling and escaping, so they agree whenever keys were inserted in the same order. JSON text written by anything else (`1.0`, `\u00e9`, duplicate keys) can differ. The table is the documented contract for SQLite. The builder does not canonicalize SQLite JSON.

`jsonGet(...) = jsonNull` matches a JSON `null` at the path on every dialect, because none of the three extraction expressions turns JSON `null` into SQL NULL (section 7). The bound forms were checked against `{"a":null}`, `{}`, SQL NULL and a column holding JSON `null`. With path `$."a"` only `{"a":null}` matched; with the root path only the JSON-null column matched. On PostgreSQL `jsonb_path_query_first(..., 'strict $."a"', '{}', true)` returned a non-NULL jsonb `null` for `{"a":null}` and SQL NULL for the other three rows.

On PostgreSQL the column side is always cast to `jsonb`. On a `jsonb` column the cast is dropped at plan time and a btree index on the column is still used (checked with `EXPLAIN`). On a `json` column (`@db.Json`) the cast gives it `jsonb` semantics, so the generator does not need to know the native type.

### 6. Path extraction return contract

`jsonGet(col, path)` returns `SQLExpr<JSONValue>`, which includes `null`. The result is a decoded JS value on every dialect: object, array, string, number, boolean or `null`.

- The builder does not provide a text helper (`->>` or `JSON_UNQUOTE`) in the first slice. MySQL `JSON_UNQUOTE` returns the string `'null'` for both JSON `null` and the JSON string `"null"`. PostgreSQL `->>` returns SQL NULL for JSON `null`. A portable text helper would hide that difference.
- Rendering: SQLite `(col -> ?)`, MySQL `JSON_EXTRACT(col, ?)`, PostgreSQL `jsonb_path_query_first(CAST(col AS jsonb), CAST($n AS jsonpath), '{}', true)`.
- Normalization. SQLite `->` always returns JSON text: `'{"b":1}'`, `'"x"'`, `'true'`, or `'null'` for JSON null, and SQL NULL when the path is missing. The `jsonGet` expression carries a runtime result decoder, and `run()` applies it to the expression's output column (by alias). On SQLite the decoder is `JSON.parse` for non-NULL values. On MySQL and PostgreSQL Prisma has already decoded the value and the decoder does nothing. Decoding applies only when `jsonGet` is a top-level selected expression. Nested inside another function, the dialect's native SQL type applies.
- Numbers decode as IEEE-754 doubles on all dialects, so integers above 2^53 lose precision. Store exact large integers as JSON strings.
- The existing `jsonExtract` helpers are not changed by this ADR. #214 later narrowed the SQLite result type to `string | number | bigint | null`, which is what SQLite returns.

### 7. Path existence

`jsonPathExists(col, path)` is a predicate typed `SQLExpr<boolean>`. It is true when a value exists at the path, including JSON `null`. It is false when the path is missing or the column is SQL NULL. It is never NULL.

| Dialect | SQL |
|---|---|
| SQLite | `(col -> ?) IS NOT NULL` |
| MySQL | `JSON_EXTRACT(col, ?) IS NOT NULL` |
| PostgreSQL | `jsonb_path_query_first(CAST(col AS jsonb), CAST($n AS jsonpath), '{}', true) IS NOT NULL` |

All three extraction expressions return a non-NULL value for JSON `null`: SQLite `->` returns the text `'null'`, and MySQL and PostgreSQL return a JSON-typed `null`, which is not SQL NULL. They return SQL NULL for a missing path and for a SQL NULL column. This was checked with the exact rendered SQL above and bound parameters (better-sqlite3 prepared statement, MySQL `PREPARE`, PostgreSQL `PREPARE`) against `{"a":null}`, `{}`, SQL NULL, a column holding JSON `null`, and `{"a":{"b":1}}`, using paths `$."a"` and the root. On all three dialects `$."a"` gave true, false, false, false, true, and the root gave true, true, false, true, true. Two other functions were rejected because they can return NULL. PostgreSQL `jsonb_path_exists(..., 'strict ...', '{}', true)` returns NULL, not false, for a missing key. MySQL `JSON_CONTAINS_PATH` returns NULL for a SQL NULL column.

Results. The raw value is `0n`/`1n` on SQLite and MySQL and `false`/`true` on PostgreSQL, on both Prisma 6.19 and 7.8. The existing `run()` coercion only knows `Boolean` model fields, so `jsonPathExists` carries a result decoder too: `0`, `0n`, `false` become `false`, and `1`, `1n`, `true` become `true`. It applies when the expression is selected at the top level under any alias. #150 must test the decoder with an aliased top-level select on every dialect.

The one dialect difference: on MySQL an index segment applied to a non-array selects the value itself (`$[0]` on `{"a":1}` returns `{"a": 1}`). SQLite and PostgreSQL treat it as missing. The first slice documents this and does not translate it.

### 8. Scope of the first slice

- #149 owns JSON equality (`=`, `!=`, `jsonNull`) on JSON columns and on `jsonGet` results.
- #150 owns `jsonGet` and `jsonPathExists`.
- JSON criteria (`=`, `!=`, `jsonNull`) apply to `.where()` only, in both forms: the criteria object and `where(fn)` expression pairs. `jsonGet` and `jsonPathExists` can be used in `.select()` and in `where(fn)` expression pairs.
- JSON criteria accept only the explicit `{ op, value }` form. The bare-value shorthand is rejected at type level for JSON columns, because a bare array already means `IN` and a bare `null` means `IS NULL`.

## Dialect-by-operation support

Legend: **supported** means the dialect has a native equivalent. **translated** means the builder renders dialect-specific SQL or post-processes results to meet the contract. **differs** means it is supported with a documented semantic difference. **excluded** means it is deliberately not in the portable API, whatever the dialect can do.

| Operation | SQLite | MySQL | PostgreSQL | Owner |
|---|---|---|---|---|
| `IS NULL` / `IS NOT NULL` (SQL NULL) | supported | supported | supported | exists today |
| Equality `=` / `!=` on a JSON column | differs (text, key order) | translated (`CAST AS JSON`) | translated (`CAST AS jsonb`) | #149 |
| Equality to `jsonNull` | translated | translated | translated | #149 |
| `jsonGet` path extraction (select) | translated (`->` + `JSON.parse`) | supported | translated (`strict`, silent) | #150 |
| Equality on a `jsonGet` result | differs (text, key order) | translated | translated | #149 / #150 |
| `jsonPathExists` | translated (+ boolean decoder) | differs (index auto-wrap; + boolean decoder) | translated | #150 |
| Containment (`@>`, `JSON_CONTAINS`) | excluded (no native op) | excluded | excluded | — |
| Text extraction (`->>`, `JSON_UNQUOTE`) | excluded | excluded | excluded | — |
| Array length | excluded | excluded | excluded | — |
| JSON type inspection (type names differ per dialect) | excluded | excluded | excluded | — |
| `<`, `>`, `LIKE`, `IN`, `BETWEEN` on JSON | excluded | excluded | excluded | — |
| JSON column-to-column comparison | excluded | excluded | excluded | — |
| JSON criteria in `having`, `joinWhere`, `ON` | excluded | excluded | excluded | — |
| Wildcards, filters, negative index, `last` in paths | excluded | excluded | excluded | — |
| Native-path `jsonExtract` (select) | exists, outside this contract | exists, outside this contract | exists, outside this contract | today's helpers: native path strings inlined with `esc()`, not parameter-safe, not portable; SQLite result typed as SQL values (#214) |

An excluded operation can only enter the portable API through a new ADR that defines its cross-dialect contract.

## Version requirements

| | Minimum | Why | Tested |
|---|---|---|---|
| Prisma | 6.2.0 | `Json` fields on SQLite | 6.19.x, 7.8.0 |
| SQLite | 3.38.0 | JSON functions built in by default; `->` operator | 3.46.0 (Prisma 6 engine), 3.53.1 (better-sqlite3 13) |
| MySQL | 8.0 | `CAST(... AS JSON)`, `JSON_EXTRACT` with bound paths; 5.7 is end-of-life | 8.0.46 |
| PostgreSQL | 12 | `jsonpath`, `jsonb_path_query_first(..., silent)` | 16 only |

- PostgreSQL columns are assumed to be `jsonb`, which is Prisma's default for `Json`. `@db.Json` columns still work through the cast in section 5.
- MariaDB servers are not supported or tested. `@prisma/adapter-mariadb` talking to a MySQL server is supported.
- SQLite JSON is assumed to be stored as text, which is how Prisma writes it.
- "Tested" lists the versions used to write this ADR. CI runs the `mysql:8.0` and `postgres:16` images and the SQLite builds bundled with the Prisma 6 engine and better-sqlite3. The minimums are feature floors taken from each database's documentation and are not tested.

## Consequences

- #149 and #150 cannot merge before the renderer binds parameters. JSON becomes the first feature that requires bound values.
- SQLite users get equality that depends on key order. The README must repeat the SQLite rows of the equality table next to the first equality example.
- Results cannot tell SQL NULL, JSON null and missing paths apart. Queries that need to separate them use `IS NULL`, `= jsonNull` and `jsonPathExists`.
- `run()` gains per-expression result decoders: JSON decoding for `jsonGet` on SQLite, and boolean decoding for `jsonPathExists` on SQLite and MySQL.
- Tests in #149, #150 and #156 must cover: nested objects and arrays; quotes, backslashes and Unicode in values and keys; empty and dotted keys; booleans versus `1`; `1` versus `1.0`; integers above 2^53; SQL NULL; JSON null; missing paths; MySQL index auto-wrap; and rejected serializer inputs.
