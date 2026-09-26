import { describe, test } from "node:test";
import type { ValidateAggregateColumn } from "../src/dialects/shared.ts";

type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type Expect<T extends true> = T;
const typeCheck = (_: true) => {};

// Shape of ColEntries for `$from("User").join("Post", ...)`: every qualified column, plus the bare
// names that are unambiguous across the join (`id` is on both tables, so it has no bare entry).
type Entries =
  | [ "User.id", number ] | [ "User.email", string ] | [ "email", string ]
  | [ "Post.id", number ] | [ "Post.title", string ] | [ "title", string ];

type TopLevel = "email" | "title" | "User." | "Post.";

// The validator's result is both the accepted type and the IDE suggestion list, so pinning it
// pins what `.orderBy("…")` autocompletes at each step of `Table.` → `Table.column`.
describe("ValidateAggregateColumn", () => {
  test("empty input suggests table prefixes and unambiguous bare columns", () => {
    typeCheck({} as Expect<Equal<ValidateAggregateColumn<Entries, "">, TopLevel>>);
  });

  test("a table prefix narrows suggestions to that table's columns", () => {
    typeCheck({} as Expect<Equal<ValidateAggregateColumn<Entries, "Post.">, "Post.id" | "Post.title">>);
  });

  test("valid qualified and bare columns validate to themselves", () => {
    typeCheck({} as Expect<Equal<ValidateAggregateColumn<Entries, "Post.title">, "Post.title">>);
    typeCheck({} as Expect<Equal<ValidateAggregateColumn<Entries, "email">, "email">>);
  });

  test("an unknown column on a known table falls back to that table's columns", () => {
    typeCheck({} as Expect<Equal<ValidateAggregateColumn<Entries, "Post.*">, "Post.id" | "Post.title">>);
  });

  test("unknown tables and ambiguous bare columns fall back to the top level", () => {
    typeCheck({} as Expect<Equal<ValidateAggregateColumn<Entries, "Nope.x">, TopLevel>>);
    typeCheck({} as Expect<Equal<ValidateAggregateColumn<Entries, "id">, TopLevel>>);
  });
});
