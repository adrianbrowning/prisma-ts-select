import assert from "node:assert/strict";
import { describe, test } from "node:test";
import transform from "../transforms/readme-sql-clean.ts";

const META = { file: "tests/core/example.spec.ts", region: "demo" };

/** The transform is declared as `string | Promise<string>`; normalise to a string. */
async function clean(
  code: string,
  tag = "sql",
  meta: { file?: string; region?: string; } = META
): Promise<string> {
  return transform({ tag, code, meta });
}

/**
 * Output lines with end-of-line whitespace removed.
 *
 * The keyword split currently leaves the space that preceded the keyword at the
 * end of the previous line. These characterization tests pin *what* the split
 * produces, so they deliberately ignore that trailing whitespace — it is the one
 * axis under repair, asserted on its own below.
 */
async function cleanLines(code: string): Promise<Array<string>> {
  const out = await clean(code);
  return out.split("\n").map(line => line.trimEnd());
}

const KEYWORD_SQL = `"SELECT Post.id, COUNT(*) AS c FROM Post LEFT JOIN User ON User.id = Post.authorId WHERE Post.published = 1 GROUP BY Post.id ORDER BY c DESC LIMIT 10 OFFSET 5;";`;

void describe("readme-sql-clean transform", () => {
  void test("unwraps a backtick template literal and unescapes \\`", async () => {
    assert.deepStrictEqual(
      await cleanLines("`SELECT \\`User\\`.\\`id\\` FROM \\`User\\` WHERE \\`User\\`.\\`id\\` = 1;`;"),
      [ "SELECT `User`.`id`", "FROM `User`", "WHERE `User`.`id` = 1;" ]
    );
  });

  void test("unwraps a double-quoted string literal", async () => {
    assert.deepStrictEqual(await cleanLines(`"SELECT * FROM User;";`), [ "SELECT *", "FROM User;" ]);
  });

  void test("splits before each SQL keyword", async () => {
    assert.deepStrictEqual(await cleanLines(KEYWORD_SQL), [
      "SELECT Post.id, COUNT(*) AS c",
      "FROM Post",
      "LEFT JOIN User ON User.id = Post.authorId",
      "WHERE Post.published = 1",
      "GROUP BY Post.id",
      "ORDER BY c DESC",
      "LIMIT 10",
      "OFFSET 5;",
    ]);
  });

  void test("splits case-insensitively, preserving the original keyword casing", async () => {
    assert.deepStrictEqual(await cleanLines(`"select id from User where id = 1;";`), [
      "select id",
      "from User",
      "where id = 1;",
    ]);
  });

  void test("transforms when only one of file/region is present", async () => {
    const code = `"SELECT * FROM User;";`;
    assert.deepStrictEqual(await cleanLines(code), [ "SELECT *", "FROM User;" ]);
    assert.deepStrictEqual(await clean(code, "sql", { region: "demo" }), await clean(code));
    assert.deepStrictEqual(await clean(code, "sql", { file: "a.spec.ts" }), await clean(code));
  });

  void test("emits no line ending in a space or tab", async () => {
    const out = await clean(KEYWORD_SQL);
    const offenders = out.split("\n").filter(line => /[ \t]$/.test(line));
    assert.deepStrictEqual(offenders, []);
  });

  void describe("pass-through", () => {
    void test("leaves non-sql blocks untouched", async () => {
      const code = `const x = "SELECT * FROM User";`;
      assert.equal(await clean(code, "ts"), code);
    });

    void test("leaves sql blocks without file/region metadata untouched", async () => {
      const code = `"SELECT * FROM User;";`;
      assert.equal(await clean(code, "sql", {}), code);
    });
  });
});
