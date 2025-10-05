# prisma-ts-select

![npm version](https://img.shields.io/npm/v/prisma-ts-select)
![build](https://github.com/adrianbrowning/prisma-ts-select/actions/workflows/CI.yml/badge.svg)
![license](https://img.shields.io/github/license/adrianbrowning/prisma-ts-select)

<!-- toc -->

  * [Summary](#summary)
  * [Installation](#installation)
  * [Supported DBs](#supported-dbs)
  * [Usage](#usage)
    + [Generator](#generator)
  * [API](#api)
    + [`.$from`](#from)
    + [Joins](#joins)
      - [`.join`](#join)
        * [Example](#example)
        * [SQL](#sql)
        * [Parameters](#parameters)
      - [`.joinUnsafeTypeEnforced`](#joinunsafetypeenforced)
        * [Example](#example-1)
        * [SQL](#sql-1)
        * [Parameters](#parameters-1)
      - [`.joinUnsafeIgnoreType`](#joinunsafeignoretype)
        * [Example](#example-2)
        * [SQL](#sql-2)
        * [Parameters](#parameters-2)
    + [Where](#where)
      - [`.where`](#where)
        * [TypeSyntax](#typesyntax)
        * [Operation types](#operation-types)
        * [Examples](#examples)
          + [Columns](#columns)
          + [$AND](#and)
          + [$OR](#or)
          + [$NOT](#not)
          + [$NOR](#nor)
      - [`.whereNotNull`](#wherenotnull)
        * [Example](#example-3)
        * [SQL](#sql-3)
      - [`.whereIsNull`](#whereisnull)
        * [Example](#example-4)
        * [SQL](#sql-4)
      - [`.whereRaw`](#whereraw)
        * [Example](#example-5)
        * [SQL](#sql-5)
    + [Group By](#group-by)
      - [Example](#example-6)
      - [SQL](#sql-6)
    + [Selecting](#selecting)
      - [`.selectDistinct`](#selectdistinct)
      - [Example](#example-7)
      - [SQL](#sql-7)
      - [`.selectAll`](#selectall)
      - [Example - Single Table](#example---single-table)
        * [SQL](#sql-8)
      - [Example - Join table](#example---join-table)
        * [SQL](#sql-9)
      - [`.select`](#select)
      - [Example - `*`](#example---)
        * [SQL](#sql-10)
      - [Example - Chained](#example---chained)
        * [SQL](#sql-11)
      - [Example - Join + Chained](#example---join--chained)
        * [SQL](#sql-12)
    + [Having](#having)
      - [Example](#example-8)
        * [SQL](#sql-13)
    + [Order By](#order-by)
      - [Example](#example-9)
        * [SQL](#sql-14)
    + [Limit](#limit)
      - [Example](#example-10)
        * [SQL](#sql-15)
    + [Offset](#offset)
      - [Example](#example-11)
        * [SQL](#sql-16)
  * [Future updates](#future-updates)
  * [Changelog / Versioning](#changelog--versioning)
  * [License](#license)
- [prisma-ts-select](#prisma-ts-select)
  * [Install](#install)
  * [Setup](#setup)
    + [Extract](#extract)
  * [Usage](#usage-1)

<!-- tocstop -->

## Summary

**prisma-ts-select** is a TypeScript utility for enhancing the Prisma ORM. 
It simplifies the selection of fields in Prisma queries, ensuring type safety and reducing boilerplate when working with nested fields. 
Ideal for developers seeking an efficient, type-safe way to select data with Prisma in TypeScript.

[!NOTE]
> This has been built mostly around MySQL. Most methods should work across the board.<br/>
> Known exceptions include:
> - HAVING
>   - SQLite 
>     - Requires you to have either an aggregate function in the `SELECT` or make use of `GROUP BY`
>     - Can only use columns that are specified in `SELECT` or `GROUP BY`


## Installation

Install via:

```bash
npm install prisma-ts-select
pnpm add prisma-ts-select
```

## Supported DBs
 
I have tested this currently on the following databases.

- SQLite
- MySQL

Most items should also work for

- PostgreSQL

Other DBs will be added when I have chance.

## Usage

### Generator

Set up the needed generator.

```prisma

generator prisma-ts-select {
  provider = "prisma-ts-select"
}

```

Run the prisma generator to build the needed files

```shell
pnpm exec prisma generate --generator prisma-ts-select
```

After that is done, we can extend the PrismaClient:

```typescript
import { PrismaClient } from "@prisma/client";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);
```

Then we can use it like:

```typescript
const results = await prisma.$from("<table>")
    .select("<column>")
    .run()
console.log(results);
```

## API

The way the methods are chained, are heavily inspired by [Dr Milan Milanović](https://substack.com/@techworldwithmilan) with his [How To Learn SQL? > Queries Execution Order](https://newsletter.techworld-with-milan.com/i/112786032/sql-queries-execution-order) post.

1. Sources
   1. `from`
   2. `join`(s)
2. `where`
3. `groupBy`
4. `select`
5. `having`
6. `orderBy`
7. `limit`
8. `offset`

### `.$from`
This takes the `base` table to work from.

### Joins
#### `.join`

Using the defined links (foreign keys) defined in the schema, provides a type-safe way of joining on tables.

##### Example
```typescript
prisma.$from("User")
      .join("Post", "authorId", "User.id");
```

![Type-safe join](./assets/typesafe-join.gif)

##### SQL

The resulting SQL will look like:

```sql
FROM User
JOIN Post ON authorId = User.id;
```

##### Parameters
| column      | Description                                                                                                                          |
|-------------|--------------------------------------------------------------------------------------------------------------------------------------|
| `table`     | The table to join on. <br/>TS autocomplete will show tables that can join with previously defined tables on.                         | 
| `field`     | Column on table. <br/>TS autocomplete will show known columns that this table, can join with previously defined tables on.           | 
| `reference` | `Table.Column` to a previously defined table (either the base, or another join), with a FK that is defined in the schema definition. | 

#### `.joinUnsafeTypeEnforced`

Unlike the `.join` command, this will allow you to join on columns that are not explicitly linked by a FK, but have the same type.

##### Example
```typescript
prisma.$from("User")
      .joinUnsafeTypeEnforced("Post", "title", "User.name");
```
![joinUnsafeTypeEnforced](./assets/joinUnsafeTypeEnforced.gif)

##### SQL
The resulting SQL will look like:

```sql
FROM User 
JOIN Post ON Post.title = User.name;
```

##### Parameters
| column      | Description                                                                                                                |
|-------------|----------------------------------------------------------------------------------------------------------------------------|
| `table`     | The table to join on. <br/>TS autocomplete will show tables that can join with previously defined tables on.               | 
| `field`     | Column on table. <br/>TS autocomplete will show known columns that this table, can join with previously defined tables on. | 
| `reference` | `Table.Column` to a previously defined table (either the base, or another join), with a column that is of the same type.   |

#### `.joinUnsafeIgnoreType`

Unlike the `.joinUnsafeIgnoreType` command, this will allow you to join on columns that are not explicitly linked by a FK, and do not have the same type.

##### Example
```typescript
prisma.$from("User")
      .joinUnsafeIgnoreType("Post", "id", "User.name");
```
![joinUnsafeIgnoreType](./assets/joinUnsafeIgnoreType.gif)

##### SQL
The resulting SQL will look like:

```sql
FROM User 
JOIN Post ON Post.id = User.name
```

##### Parameters
| column      | Description                                                                                                                |
|-------------|----------------------------------------------------------------------------------------------------------------------------|
| `table`     | The table to join on. <br/>TS autocomplete will show tables that can join with previously defined tables on.               | 
| `field`     | Column on table. <br/>TS autocomplete will show known columns that this table, can join with previously defined tables on. | 
| `reference` | `Table.Column` to a previously defined table (either the base, or another join). Referencing any column, of any type.      |

### Where

#### `.where`

The `where` syntax takes inspiration from how mongoDB does queries.

##### TypeSyntax
```TypeScript
type WhereClause = {
  "Table.Column": <value> | { "op": "<condition>", "value": <value> }
  "$AND": [WhereClause, ...Array<WhereClause>],
  "$OR": [WhereClause, ...Array<WhereClause>],
  "$NOT": [WhereClause, ...Array<WhereClause>],
  "$NOR": [WhereClause, ...Array<WhereClause>]
}
```

##### Operation types
| Op          | Description | Supported Types       |
|-------------|-------------|-----------------------|
| IN          |             | Numbers, String, Date |
| NOT IN      |             | Numbers, String, Date |
| BETWEEN     |             | Numbers, Date         |
| LIKE        |             | String                |
| NOT LIKE    |             | String                |
| IS NULL     |             | *                     |
| IS NOT NULL |             | *                     |
| \>          |             | Numbers, Date         |
| \>=         |             | Numbers, Date         |
| <           |             | Numbers, Date         |
| <=          |             | Numbers, Date         |
| !=          |             | Numbers, String, Date |


##### Examples
| Type         | Description                                                              | Example                                                                                                                                                          | SQL                                                               | 
|--------------|--------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------|
| Table.Column | A particular Table.Column name                                           | <pre>.where({ <br />  "User.age": 20,<br />  "User.name": {op: "LIKE", value:"Stuart%"},<br />})                                                                 | `(User.age = 20 AND User.name LIKE "Stuart%")`                    |
| $AND         | Will join all items with a `AND`                                         | <pre>.where({ <br /> $AND:[<br />  {"User.age": {op: ">", value:20}},<br />  {"User.age": {op: "<", value:60}},<br />]})</pre>                                   | `(User.age > 20 AND User.age < 60)`                               |
| $OR          | Will join all items with a `OR`                                          | <pre>.where({ <br /> $OR:[<br />  {"User.name": {op: "LIKE", value:"a%"}},<br />  {"User.name": {op: "LIKE", value:"d%"}},<br />]})</pre>                        | `(User.name LIKE "a%" OR User.name LIKE "d%")`                    |
| $NOT         | Will wrap statement in a `NOT (/*...*/)` and join any items with a `AND` | <pre>.where({ <br /> $NOT:[<br />  {"User.age": 20 },<br />  {<br />    "User.age": {op: "=", value:60},<br />    "User.name": "Bob",<br />   },<br />]})</pre>  | `(NOT (User.age = 20 AND (User.age = 60 AND User.name = "Bob")))` |
| $NOR         | Will wrap statement in a `NOT (/*...*/)` and join any items with a `OR`  | <pre>.where({ <br /> $NOR:[<br />  {"User.age": 20 },<br />  {<br />    "User.age": {op: "!=", value:60},<br />    "User.name": "Bob",<br />   },<br />]})</pre> | `(NOT (User.age = 20 OR (User.age != 60 AND User.name = "Bob")))` |


###### Columns
```typescript
prisma.$from("User")
        .join("Post", "id", "User.name")
        .where({
          "User.age": 20,
          "User.name": {op: "LIKE", value: "Stuart%"},
        });
```

###### $AND
```typescript
prisma.$from("User")
        .join("Post", "id", "User.name")
        .where({
          $AND: [
            {"User.age": {op: ">", value: 20}},
            {"User.age": {op: "<", value: 60}},
          ]
        });
```

###### $OR
```typescript
prisma.$from("User")
        .join("Post", "id", "User.name")
        .where({
          $OR: [
            {"User.name": {op: "LIKE", value: "a%"}},
            {"User.name": {op: "LIKE", value: "d%"}},
          ]
        });
```

###### $NOT
```typescript
prisma.$from("User")
        .join("Post", "id", "User.name")
        .where({
          $NOT: [
            {"User.age": 20},
            {
              "User.age": {op: "=", value: 60},
              "User.name": "Bob",
            },
          ]
        });
```

###### $NOR
```typescript
prisma.$from("User")
        .join("Post", "id", "User.name")
        .where({
          $NOR: [
            {"User.age": 20},
            {
              "User.age": {op: "!=", value: 60},
              "User.name": "Bob",
            },
          ]
        });
```

#### `.whereNotNull`

This will remove the `null` type from the union of types of the current table column.
To use `.whereNotNull`, you need to add it before a `.where`.  

##### Example
```typescript
prisma.$from("User")
        .join("Post", "authorId", "User.id")
        .whereNotNull("User.name");
```
![whereNotNull](./assets/whereNotNull.gif)

##### SQL
The resulting SQL will look like:

```sql
FROM User 
JOIN Post ON authorId = User.id
WHERE User.name IS NOT NULL;
```

#### `.whereIsNull`

This will remove the NonNull type from the union of types of the current table column.
To use `.whereIsNull`, you need to add it before a `.where`.

##### Example
```typescript
prisma.$from("User")
        .join("Post", "authorId", "User.id")
        .whereIsNull("Post.content");
```
![whereIsNull](./assets/whereIsNull.gif)

##### SQL
The resulting SQL will look like:

```sql
FROM User 
JOIN Post ON authorId = User.id
WHERE Post.content IS NULL;
```

#### `.whereRaw`

When you want to write a complex `where`, or you just don't want the TypeSafety offered by the other methods, you can use `.whereRaw`. 

##### Example
```typescript
prisma.$from("User")
        .join("Post", "authorId", "User.id")
        .whereRaw("this is a raw where statement");
```

##### SQL
The resulting SQL will look like:

```sql
FROM User 
JOIN Post ON authorId = User.id
WHERE this is a raw where statement;
```


### Group By

Will allow you to pass a list of columns, that haven been specified from the `.$from` and any `.join` methods. 

#### Example
```typescript
prisma.$from("User")
        .join("Post", "authorId", "User.id")
        .groupBy(["name", "Post.content"]);
```
![groupBy](./assets/groupBy.gif)

#### SQL
The resulting SQL will look like:

```sql
FROM User 
JOIN Post ON authorId = User.id
GROUP BY name, Post.content;
```

### Selecting

#### `.selectDistinct`

Will add the keyword `DISTINCT` after the select.

#### Example
```typescript
prisma.$from("User")
       .selectDistinct();
```

#### SQL
The resulting SQL will look like:

```sql
SELECT DISTINCT
FROM User;
```

#### `.selectAll`

Works slightly differently to `*`. The limitation of `*` in JS, is that if you have 2 tables with the same name, you will only get back the last, based on a join.
This method will explicitly list all the tables from the `$from` and `.join`. So you get the `table.column` in the respose.


#### Example - Single Table
```typescript
prisma.$from("User")
       .selectAll();
```

##### SQL
The resulting SQL will look like:

```sql
SELECT id, email, name
FROM User 
```

#### Example - Join table
```typescript
prisma.$from("User")
       .join("Post", "authorId", "User.id") 
       .selectAll();
```

##### SQL
The resulting SQL will look like:

```sql
SELECT User.id, User. email, User.name, Post.id, Post.title, Post.content, Post.published, Post.author, Post.authorId, Post.LastModifiedBy, Post.lastModifiedById
FROM User 
JOIN Post ON authorId = User.id
```

[//]: # (#### `.selectAllOmit`)

#### `.select`

You can supply either; `*`, `Table.*` OR `table.field` and then chain them together.

#### Example - `*`
```typescript
prisma.$from("User")
       .select("*");
```

##### SQL
The resulting SQL will look like:

```sql
SELECT *
FROM User;
```

#### Example - `Table.*` (Single Table)
```typescript
prisma.$from("User")
       .select("User.*");
```

##### SQL
The resulting SQL will look like:

```sql
SELECT User.id, User.email, User.name
FROM User;
```

#### Example - `Table.*` (With Join)
```typescript
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .select("User.*")
      .select("Post.*");
```

##### SQL
The resulting SQL will look like:

```sql
SELECT User.id AS `User.id`,
       User.email AS `User.email`,
       User.name AS `User.name`,
       Post.id AS `Post.id`,
       Post.title AS `Post.title`,
       Post.content AS `Post.content`,
       Post.published AS `Post.published`
FROM User
JOIN Post ON authorId = User.id;
```

[!NOTE]
> When using `Table.*` with joins, all columns are automatically aliased with the table name prefix to avoid column name conflicts.

#### Example - Chained
```typescript
prisma.$from("User")
       .select("name")
       .select("email");
```

##### SQL
The resulting SQL will look like:

```sql
SELECT name, email
FROM User;
```

#### Example - Join + Chained
```typescript
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .select("name")
      .select("Post.title");
```

##### SQL
The resulting SQL will look like:

```sql
SELECT name, Post.title
FROM User
JOIN Post ON authorId = User.id;
```

### Having

`.having` uses the same syntax as [`.where`](#where). Please see the previous section for details.

#### Example

```typescript
prisma.$from("User")
       .join("Post", "authorId", "User.id")
       .groupBy(["name", "Post.content"])
       .having({
           "User.name": {
               "op": "LIKE",
               "value": "bob%"
           }
       });
```

```typescript
prisma.$from("User")
       .join("Post", "authorId", "User.id")
       .having({
           "User.name": {
               "op": "LIKE",
               "value": "stuart%"
           }
       });
```


##### SQL

```SQL
FROM User
JOIN Post ON authorId = User.id
GROUP BY name, Post.content
HAVING (User.name LIKE 'bob%');
```

```SQL
FROM User
JOIN Post ON authorId = User.id
HAVING (User.name LIKE 'stuart%');
```

### Order By

`.orderBy`, takes an array of column names, with the optional suffix of `ASC` or `DESC`.

#### Example

```typescript
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .orderBy(["name", "Post.content DESC"]); 
```

##### SQL

```sql
FROM User
JOIN Post ON authorId = User.id
ORDER BY name, Post.content DESC;
```

### Limit

`.limit`, takes the number of rows you would like to return.

#### Example

```typescript
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .limit(1);
```

##### SQL

```SQL
FROM User
JOIN Post ON authorId = User.id
LIMIT 1;
```

### Offset

`.offSet`, the number of rows to skip. Requires `.limit` to have been used first.

#### Example
```typescript
prisma.$from("User")
        .join("Post", "authorId", "User.id")
        .limit(1)
        .offset(1);
```

##### SQL

```SQL
FROM User
JOIN Post ON authorId = User.id
LIMIT 1
OFFSET 1
```

## Future updates

- Support specifying `JOIN` type [issue#2](https://github.com/adrianbrowning/prisma-ts-select/issues/2)
- Support Select Functions
  - [Aggregation #4](https://github.com/adrianbrowning/prisma-ts-select/issues/4)
  - [String #5](https://github.com/adrianbrowning/prisma-ts-select/issues/5)
  - [Date & Time #6](https://github.com/adrianbrowning/prisma-ts-select/issues/6)
  - [Math #7](https://github.com/adrianbrowning/prisma-ts-select/issues/7)
  - [Control Flow #8](https://github.com/adrianbrowning/prisma-ts-select/issues/8)
  - [JSON #9](https://github.com/adrianbrowning/prisma-ts-select/issues/9)
- [Support a `Many-To-Many` join #19](https://github.com/adrianbrowning/prisma-ts-select/issues/19)
- [Select column alias #27](https://github.com/adrianbrowning/prisma-ts-select/issues/27)
- [Table name alias #28](https://github.com/adrianbrowning/prisma-ts-select/issues/28)
- [whereRaw supporting Prisma.sql](https://github.com/adrianbrowning/prisma-ts-select/issues/29)

## Changelog / Versioning
Changelog is available [here](https://github.com/adrianbrowning/prisma-ts-select/releases). We use [semantic versioning](https://semver.org/) for versioning.

## License
This project is licensed under the MIT License. See the LICENSE file for details.

Things of note!!!!

- remove typeof from 
  - `type _db = DeepWriteable<typeof DB>;`
  - `}[keyof typeof DB];`
- Merge Items missing //@ts-expect-error - might not be needed
- groupBy -> having, 
  - missing @deprecated
  - ts-exptect-error  - might not be needed
- GetColsFromTableType missing ts-expect-error - might not be needed
- DB needs to be in the same file.



# prisma-ts-select

## Install

```shell
npm i prisma-ts-select
pnpm add prisma-ts-select
```

## Setup

### Extract


## Usage


