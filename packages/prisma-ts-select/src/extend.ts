import {Prisma} from "@prisma/client/extension";
import type {PrismaClient} from "@prisma/client";
import {match, P} from "ts-pattern";

const DB: DBType = {} as const satisfies DBType;

type TDB = typeof DB;

/**
 * Recursively removes `readonly` modifiers from all properties of a type.
 *
 * This utility type transforms a deeply nested readonly type structure into a fully mutable one
 * by recursively applying the `-readonly` modifier to all properties at every level of nesting.
 *
 * @template T - The type to make writable
 *
 * @example
 * type ReadonlyUser = {
 *   readonly id: number;
 *   readonly profile: {
 *     readonly name: string;
 *   };
 * };
 *
 * type WritableUser = DeepWriteable<ReadonlyUser>;
 * // Result: {
 * //   id: number;
 * //   profile: {
 * //     name: string;
 * //   };
 * // }
 */
type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };

type _db = DeepWriteable<TDB>;

type DATABASE = {
    [k in keyof _db]: {
        table: k,
        fields: {
            [f in keyof _db[k]["fields"]]: StrTypeToTSType<_db[k]["fields"][f]>
        },
        relations: _db[k]["relations"]
    }
}[keyof TDB];


export type JSONPrimitive = string | number | boolean | null;
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;
export type JSONObject = { [member: string]: JSONValue; };
export type JSONArray = Array<JSONValue>;

/**
 * Converts a Prisma schema type string to its corresponding TypeScript type union.
 * Handles nullable types by extracting the base type and adding `null` if the type string starts with `?`.
 *
 * @template str - The Prisma type string (e.g., "String", "?Int", "Boolean")
 *
 * @example
 * // Non-nullable type
 * type A = StrTypeToTSType<"String">; // string
 *
 * @example
 * // Nullable type (prefixed with ?)
 * type B = StrTypeToTSType<"?Int">; // number | null
 */
type StrTypeToTSType<str> = str extends string ? (GetTSType<RemoveNullChar<str>> | IsNullable<str>) : never;

type SUPPORTED_TYPES =
    | string
    | bigint
    | number
    | boolean
    | Date
    | Buffer;
//TODO support for
// | JSONValue;

/**
 * Maps Prisma schema type names to their corresponding TypeScript types.
 * This type helper is used during code generation to convert Prisma DMMF type strings
 * into proper TypeScript type annotations.
 *
 * @template str - The Prisma type name as a string literal (e.g., "String", "Int", "DateTime")
 *
 * @returns The corresponding TypeScript type, or "Unknown type" if the type is not supported
 *
 * @example
 * type A = GetTSType<"String">;   // string
 * type B = GetTSType<"Int">;      // number
 * type C = GetTSType<"BigInt">;   // bigint
 * type D = GetTSType<"DateTime">; // Date
 * type E = GetTSType<"Json">;     // JSONValue
 */
type GetTSType<str extends string> =
    str extends `String` ? string
        : str extends `BigInt` ? bigint
            : str extends `Int` ? number
                : str extends `Float` ? number
                    : str extends `Decimal` ? number
                        : str extends `Boolean` ? boolean
                            : str extends `DateTime` ? Date
                                : str extends `Bytes` ? Buffer
                                    : str extends `Json` ? JSONValue
                                        : "Unknown type";

/**
 * Checks if a Prisma type string represents a nullable field.
 * Nullable fields are prefixed with `?` in the generated DB type.
 *
 * @template str - The type string to check (e.g., "?String", "Int")
 *
 * @returns `null` if the type string starts with `?`, otherwise `never`
 *
 * @example
 * type A = IsNullable<"?String">; // null
 * type B = IsNullable<"Int">;     // never
 * type C = IsNullable<"?DateTime">; // null
 */
type IsNullable<str extends string> = str extends `?${string}` ? null : never;


/**
 * Removes the nullable marker prefix (`?`) from a string type.
 *
 * This utility type is used to extract the base type name from Prisma field type strings
 * where nullable fields are prefixed with `?`. If no `?` prefix exists, returns the original string.
 *
 * @template str - The string type that may contain a `?` prefix
 *
 * @example
 * type NonNullable = RemoveNullChar<"?String">; // "String"
 * type AlreadyNonNull = RemoveNullChar<"Int">; // "Int"
 * type NullableDate = RemoveNullChar<"?DateTime">; // "DateTime"
 */
export type RemoveNullChar<str extends string> = str extends `?${infer s}` ? s : str;

export type DBType = Record<string, {
    fields: Record<string, string>;
    relations: Record<string, Record<string, Array<string>>>
}>;

/**
 * Filters type `a` to only include members that extend type `b`.
 *
 * This conditional type acts as a type-level filter, returning `a` if it extends `b`,
 * otherwise returning `never`. Useful for filtering union types or constraining generic types.
 *
 * @template a - The type to filter
 * @template b - The constraint type to check against
 *
 * @example
 * type Numbers = Filter<string | number | boolean, number>; // number
 * type Strings = Filter<1 | 2 | "hello" | "world", string>; // "hello" | "world"
 */
type Filter<a, b> = a extends b ? a : never;

/**
 * Filters type `T` to only include string types, returning `never` for non-string types.
 *
 * This is a specialized filter that ensures the type is a string literal or string union,
 * effectively removing any non-string members from a union type.
 *
 * @template T - The type to check
 *
 * @example
 * type OnlyStrings = IsString<"hello" | 123 | true>; // "hello"
 * type AllStrings = IsString<"foo" | "bar">; // "foo" | "bar"
 * type NoStrings = IsString<123>; // never
 */
type IsString<T> = T extends string ? T : never;

/**
 * Whitespace characters that can be trimmed from strings.
 */
type Whitespace = '\n' | ' ';

/**
 * Recursively removes leading and trailing whitespace from a string literal type.
 *
 * This utility type trims both newline and space characters from the beginning and end
 * of a string literal type, similar to the runtime `String.prototype.trim()` method.
 *
 * @template T - The string literal type to trim
 *
 * @example
 * type Trimmed1 = Trim<"  hello  ">; // "hello"
 * type Trimmed2 = Trim<"\nhello world\n">; // "hello world"
 * type Trimmed3 = Trim<"  \n  test  \n  ">; // "test"
 */
//@ts-expect-error will implement in another issue
type Trim<T> = T extends `${Whitespace}${infer U}` ? Trim<U> : T extends `${infer U}${Whitespace}` ? Trim<U> : T;

/**
 * Valid column selection patterns for SELECT clause.
 * Combines wildcard selection, individual columns, and table-specific wildcards.
 *
 * @template Tables - Array of table sources (table names or [table, alias] tuples)
 * @returns Union of valid selection patterns: "*" | column names | "Table.*" patterns
 *
 * @example
 * // For tables ["User", "Post"]
 * ValidSelect<["User", "Post"]>
 * // Returns: "*" | "id" | "name" | "Post.id" | "Post.title" | "User.*" | "Post.*"
 */
type ValidSelect<Tables extends TArrSources> =
    |"*"
    | GetOtherColumns<Tables>
    | GetTableStar<Tables>;// | GetColsFromTable<Tables[number]>; // TODO

/**
 * Extracts all available column names from base table and joined tables.
 * Returns column names from the base table (without prefix) and qualified column names
 * from all tables (with "Table.column" prefix).
 *
 * @template Tables - Array of table sources, first element is base table
 * @returns Union of column names: base table columns | "Table.column" for all tables
 *
 * @example
 * // For tables ["User", "Post"]
 * GetOtherColumns<["User", "Post"]>
 * // Returns: "id" | "name" | "User.id" | "User.name" | "Post.id" | "Post.title"
 */
//@ts-expect-error using a never version
type GetOtherColumns_old<Tables extends TArrSources> = Tables extends [infer T extends TTableSources, ...Array<TTableSources>]
    ? GetColsBaseTable<T> | GetJoinCols<Tables[number]>
    : never

/**
 * Generates "Table.*" patterns for all tables in the query.
 * Handles both simple table names and table aliases.
 *
 * @template Tables - Array of table sources (table names or [table, alias] tuples)
 * @returns Union of "Table.*" or "alias.*" patterns for all tables
 *
 * @example
 * // For tables ["User", ["Post", "p"]]
 * GetTableStar<["User", ["Post", "p"]]>
 * // Returns: "User.*" | "p.*"
 */
type GetTableStar<Tables extends TArrSources> = Tables extends [infer T extends TTableSources, ...Array<TTableSources>]
    ? T extends string
     ? `${T}.*` | GetTableStarJoined<Tables[number]>
      : `${T[1]}.*` | GetTableStarJoined<Tables[number]>
    : never

/**
 * Converts a single table source to its "Table.*" pattern.
 * Extracts the alias name if table source is a tuple, otherwise uses the table name.
 *
 * @template T - Table source (table name string or [table, alias] tuple)
 * @returns "Table.*" pattern using table name or alias
 *
 * @example
 * GetTableStarJoined<"User"> // Returns: "User.*"
 * GetTableStarJoined<["Post", "p"]> // Returns: "p.*"
 */
type GetTableStarJoined<T extends TTableSources> = T extends string ? `${T}.*`
    : `${T[1]}.*`

/**
 * Extracts the TypeScript type of a column for use in aliased selections.
 * Handles both qualified column names ("Table.column") and unqualified names (uses base table).
 *
 * @template Column - Column name, either "Table.column" or "column"
 * @template TSources - Array of table sources in the query
 * @template TFields - Map of table names to their field definitions
 * @returns TypeScript type of the specified column (number, string, Date, etc.)
 *
 * @example
 * ExtractColumnType<"User.id", ["User"], {User: {id: number, name: string}}>
 * // Returns: number
 *
 * @example
 * ExtractColumnType<"name", ["User"], {User: {id: number, name: string}}>
 * // Returns: string (from base table User)
 */
type ExtractColumnType<
    Column extends string,
    TSources extends TArrSources,
    TFields extends TFieldsType
> = Column extends `${infer T}.${infer F}`
    ? T extends keyof TFields
        ? F extends keyof TFields[T]
            ? TFields[T][F]
            : never
        : never
    : Column extends keyof TFields[TSources[0] extends string ? TSources[0] : `Come back to 1`]
        ? TFields[TSources[0] extends string ? TSources[0] : `Come back To 2`][Column]
        : never;


export type TTables = DATABASE["table"];
export type TTableSources = DATABASE["table"] | [table: DATABASE["table"], alias: string];
type TArrSources = [TTableSources, ...Array<TTableSources>];


class DbSelect {

    constructor(public db: PrismaClient) {
    }

    from<const TDBBase extends TTables,
        const TAlias extends string = never,
        TRT extends TArrSources = [TAlias] extends [never]  ? [TDBBase] : [[TDBBase, TAlias]]>(
        baseTable: TDBBase,
        alias?: TAlias
    ) {
        return new _fJoin<TRT,
            Record<GetAliasTableNames<TRT[0]>, GetFieldsFromTable<TDBBase>>>(this.db, {
            tables: [{
                table:baseTable,
                alias
            }],
            selects: []
        })
    }

}

type ClauseType = Array<string | WhereCriteria<TArrSources, Record<string, any>>>;

type Values = {
    //baseTable: TTables,
    //baseTableAlias?: string;
    selectDistinct?: true;
    selects: Array<string>;
    tables: [{ table: TTables, alias?: string }, ...Array<{ table: TTables, local: string, remote: string, alias?: string }>];
    limit?: number;
    offset?: number;
    where?: ClauseType;
    having?: ClauseType;
    groupBy?: Array<string>;
    orderBy?: Array<`${string}${ "" | " DESC" | " ASC"}`>;
};

/*
run
 */
class _fRun<TSources extends TArrSources, TFields extends TFieldsType, TSelectRT extends Record<string, any> = {}> {
    constructor(protected db: PrismaClient,
                protected values: Values) {
        this.values.limit = typeof this.values.limit === "number" ? this.values.limit : undefined;
        this.values.offset = typeof this.values.offset === "number" ? this.values.offset : undefined;
    }

    run() {
        return this.db.$queryRawUnsafe(
            this.getSQL()
        ) as unknown as Prisma.PrismaPromise<Array<TSelectRT>>
        //as Prisma.PrismaPromise<Array<Extract<DATABASE, { table: TDBBase }>["fields"]>>;
    }

    getTables() {
        return {} as TSources;
    }

    getFields() {
        return {} as TFields;
    }

    getResultType() {
        return {} as Array<TSelectRT>;
    }

    getSQL(formatted: boolean = false) {


        function processCondition(condition: BasicOpTypes, formatted: boolean): string {
            return "(" + Object.keys(condition).map((field) => {
                // @-ts-expect-error todo comeback too
                const value = condition[field];

                if (typeof value === 'object' && value !== null && !Array.isArray(value) && "op" in value) {
                    switch (value.op) {
                        case 'IN':
                        case 'NOT IN':
                            const valuesList = value.values.map(v => (typeof v === 'string' ? `'${v}'` : v)).join(", ");
                            return `${String(field)} ${value.op} (${valuesList})`;
                        case 'BETWEEN':
                            if (value.values.length > 2) throw new Error("Too many items supplied to op BETWEEN")
                            const [start, end] = value.values;
                            return `${String(field)} BETWEEN ${typeof start === 'string' ? `'${start}'` : start} AND ${typeof end === 'string' ? `'${end}'` : end}`;
                        case 'LIKE':
                        case 'NOT LIKE':
                            return `${String(field)} ${value.op} '${value.value}'`;
                        case 'IS NULL':
                        case 'IS NOT NULL':
                            return `${String(field)} ${value.op}`;
                        case '>':
                        case '>=':
                        case '<':
                        case '<=':
                        case '!=':
                            return `${String(field)} ${value.op} ${typeof value.value === 'string' ? `'${value.value}'` : value.value}`;
                        default:
                            //@ts-expect-error value.op should be never
                            throw new Error(`Unsupported operation: ${value.op}`);
                    }
                } else if (Array.isArray(value)) {
                    const valuesList = value.map(v => (typeof v === 'string' ? `'${v}'` : v)).join(", ");
                    return `${String(field)} IN (${valuesList})`;
                } else if (value === null) {
                    return `${String(field)} IS NULL`;
                } else {
                    return `${String(field)} = ${typeof value === 'string' ? `'${value}'` : value}`;
                }
            }).join(" AND " + (formatted ? "\n" : " ")) + " )";
        }

        function processCriteria(main: ClauseType, joinType: "AND" | "OR" = "AND", formatted: boolean = false): string {
            const results: Array<string> = [];
            for (const criteria of main) {
                if (typeof criteria === 'string') {
                    results.push(criteria);
                    continue;
                }
                for (const criterion in criteria) {
                    results.push(match(criterion)
                        .returnType<string>()
                        .with("$AND", (criterion) => {
                            return "(" +
                                //@ts-expect-error criterion
                                processCriteria(criteria[criterion], "AND", formatted)
                                + ")"
                        })
                        .with("$OR", (criterion) => {
                            return "(" +
                                //@ts-expect-error criterion
                                processCriteria(criteria[criterion], "OR", formatted)
                                + ")"
                        })
                        .with("$NOT", (criterion) => {
                            return "(NOT(" +
                                //@ts-expect-error criterion
                                processCriteria(criteria[criterion], "AND", formatted)
                                + "))"
                        })
                        .with("$NOR", (criterion) => {
                            return "(NOT(" +
                                //@ts-expect-error criterion
                                processCriteria(criteria[criterion], "OR", formatted)
                                + "))"
                        })
                        .with(P.string, () => {
                            //@ts-expect-error criterion
                            return processCondition(criteria);
                        })
                        .exhaustive());
                }
            }
            return results.join((formatted ? "\n" : " ") + joinType + (formatted ? "\n" : " "));

            // return main.map(criteria => {
            //     if (typeof criteria === 'string') return criteria;
            //     let last_op = "";
            //     return Object.keys(criteria).map((operator) => {
            //         last_op = operator;
            //         // return Object.keys(criteria).map((operator) => {
            //         debugger;
            //         if (operator !== 'AND' && operator !== 'OR') {
            //             throw new Error(`Operator '${operator}' is not supported`);
            //         }
            //         // console.log(operator);
            //         // return "";
            //         const subCriteria = (criteria as any)[operator] as (WhereCriteria<TSources, TFields> | WhereCriteria<TSources, TFields>)[];
            //         const subConditions = subCriteria.map(subCriterion => {
            //             debugger;
            //
            //             if ('AND' in subCriterion || 'OR' in subCriterion) return processCriteria(subCriterion as any);
            //             else return processCondition(subCriterion as any);
            //
            //         }).join(` ${operator} `);
            //         return `(${subConditions})`;
            //
            //     }).join(` ${last_op} `);
            // }).join(` AND `);
        }


        const whereClause = this.values.where !== undefined ? processCriteria(this.values.where,  "AND", formatted) : undefined;
        const havingClause = this.values.having !== undefined ? processCriteria(this.values.having,  "AND", formatted) : undefined;

        const [base, ...joins] = this.values.tables;

        const baseTable = base.alias
            ? `${base.table} AS \`${base.alias}\``
            : base.table;



        return [
            this.values.selects.length === 0
                ? ""
                : ("SELECT " +
                    (this.values.selectDistinct === true
                        ? "DISTINCT "
                        : "")
                    + this.values.selects.join(', ')),
            `FROM ${baseTable}`,
            joins.map(({
                                         table,
                                         local,
                                         remote,
                                         alias
                                     }) => {
                const tLocal = (alias || table) + "." + local;
                return `JOIN ${!!alias ? (table + " AS `" + alias + "`") : table} ON ${tLocal} = ${remote}`;
            }).join(formatted ? "\n" : " ") ?? "",
            !whereClause ? "" : `WHERE ${whereClause}`,
            !this.values.groupBy?.length ? "" : `GROUP BY ${this.values.groupBy.join(', ')}`,
            !havingClause ? "" : `HAVING ${havingClause}`,
            !(this.values.orderBy && this.values.orderBy.length > 0) ? "" : "ORDER BY " + this.values.orderBy.join(', '),
            !this.values.limit ? "" : `LIMIT ${this.values.limit}`,
            !this.values.offset ? "" : `OFFSET ${this.values.offset}`
        ]
            .filter(Boolean)
            .join(formatted ? "\n" : " ")
            .trim() + ";";
    }
}

/*
OFFSET -
run
*/

class _fOffset<TSources extends TArrSources, TFields extends TFieldsType, TSelectRT extends Record<string, any> = {}> extends _fRun<TSources, TFields, TSelectRT> {
    offset(offset: number) {
        return new _fRun<TSources, TFields, TSelectRT>(this.db, {...this.values, offset});
    }
}

/*
LIMIT - the returned data is limited to row count.
OFFSET -
run
*/

class _fLimit<TSources extends TArrSources, TFields extends TFieldsType, TSelectRT extends Record<string, any> = {}> extends _fRun<TSources, TFields, TSelectRT> {
    limit(limit: number) {
        return new _fOffset<TSources, TFields, TSelectRT>(this.db, {...this.values, limit});
    }
}



/**
 * Valid column names for ORDER BY clause.
 * Includes columns from base table, joined tables, and any aliased columns in the SELECT.
 *
 * @template Tables - Array of table sources in the query
 * @template TSelectRT - Result type from SELECT clause (contains aliases)
 * @returns Union of valid column names for ordering
 *
 * @example
 * OrderBy<["User", "Post"], {userCount: number}>
 * // Returns: "id" | "name" | "User.id" | "Post.id" | "Post.title" | "userCount"
 */
type OrderBy<Tables extends TArrSources, TSelectRT extends Record<string, any> = {}> = Tables extends [infer T extends TTableSources, ...Array<TTableSources>]
    ? GetColsBaseTable<T> | GetJoinCols<Tables[number]> | (keyof TSelectRT & string)
    : never;

/*
ORDER BY - the final data is sorted.
LIMIT - the returned data is limited to row count.
OFFSET -
run
*/

//Select extends GetOtherColumns<TSources>>(groupBy: Array<TSelect>

class _fOrderBy<TSources extends TArrSources, TFields extends TFieldsType, TSelectRT extends Record<string, any> = {}> extends _fLimit<TSources, TFields, TSelectRT> {
    orderBy(orderBy: Array<`${OrderBy<TSources, TSelectRT>}${ "" | " DESC" | " ASC"}`>) {
        return new _fLimit<TSources, TFields, TSelectRT>(this.db, {...this.values, orderBy});
    }
}


/*
SELECT - the final data is returned.
ORDER BY - the final data is sorted.
LIMIT - the returned data is limited to row count.
OFFSET -
run
*/
//@ts-expect-error yeah old version for comp
type MergeItemsOld<Field extends string,
    TSources extends [TTables,...Array<TTables>],
    TFields extends TFieldsType,
    IncTName extends boolean = false,
    TLTables = TSources[number]> =
    Field extends "*"
        ? Prettify<IterateTables<TSources, TFields, IncTName>>
        : Field extends `${infer T}.*`
            ? T extends keyof TFields
                ? [TSources] extends [[T]]
                    // Single table - no prefix
                    ? TFields[T]
                    // Multiple tables - with prefix
                    : T extends string ? IterateTablesFromFields<T, TFields[T], true> : never
                : never
            //@ts-expect-error T not a string?
            : Field extends `${infer T extends TLTables}.${infer F extends string}`
                //@ts-expect-error F is part of T, but can't tell TS that
                ? Pick<TFields[T], F>
                //@-ts-expect-error Field is part of the from, but can't tell TS that.
                : Pick<TFields[TSources[0]], Field>;

/**
 * Transforms a field selection pattern into its corresponding TypeScript type structure.
 * Handles different selection patterns: "*", "Table.*", "Table.column", and "column".
 * Controls whether table names are included as prefixes in the result type.
 *
 * @template Field - Selection pattern: "*" | "Table.*" | "Table.column" | "column"
 * @template TSources - Array of table sources, e.g., ["Table", ["Table2", "alias"]]
 * @template TFields - Map of table names to field definitions, e.g., Record<Table, Record<col, type>>
 * @template IncTName - Whether to include table name prefix in result keys (default: false)
 * @returns Type object representing the selected fields with their TypeScript types
 *
 * @example
 * // Select all from single table (no prefix)
 * MergeItems<"*", ["User"], {User: {id: number, name: string}}, false>
 * // Returns: {id: number, name: string}
 *
 * @example
 * // Select all from multiple tables (with prefix)
 * MergeItems<"*", ["User", "Post"], {...}, true>
 * // Returns: {"User.id": number, "User.name": string, "Post.id": number, ...}
 *
 * @example
 * // Select specific table columns
 * MergeItems<"User.*", ["User", "Post"], {...}>
 * // Returns: {"User.id": number, "User.name": string, ...}
 *
 * @example
 * // Select qualified column
 * MergeItems<"User.id", ["User", "Post"], {...}>
 * // Returns: {"User.id": number}
 */

type MergeItems<Field extends string,
    TSources extends TArrSources,
    TFields extends TFieldsType,
    IncTName extends boolean = false,
    TLTables extends string = TablesArray2Name<TSources>[number]> =
    Field extends "*"
      ? Prettify<IterateTables<TSources, TFields, IncTName>>
      : Field extends `${infer T}.*`
        ? T extends keyof TFields
          ? [TSources] extends [[T]]
            // Single table - no prefix
            ? TFields[T]
            // Multiple tables - with prefix
            : T extends string ? IterateTablesFromFields<T, TFields[T], true> : never
          : never
        : Field extends `${infer T extends TLTables}.${infer F extends string}`
          ? T extends keyof TFields
            ? F extends keyof TFields[T]
                    // Check if column is unique across all tables
              ? IsColumnUnique<F, TSources> extends true
                        // Unique column: strip table prefix
                ? Prettify<Pick<TFields[T], F>>
                        // Non-unique column: keep qualified name "Table.column"
                : Prettify<{[K in Field]: TFields[T][F]}>
              : never
            : never
          : FindColumnInFields<Field, TFields>//Pick<TFields[GetAliasTableNames<TSources[0]>], Field>;

type FindColumnInFields<Column extends string,
    TFields extends TFieldsType,
    Tables extends keyof TFields = keyof TFields
    > = Tables extends keyof TFields
         ? TFields[Tables] extends Record<Column, any>
             ? Pick<TFields[Tables], Column>
             : never
         : never



/**
 * Recursively iterates through an array of tables and accumulates their fields into a single type.
 * Optionally prefixes field names with table names based on the IncTName flag.
 *
 * @template Tables - Array of table sources to iterate through
 * @template TFields - Map of table names to their field definitions
 * @template IncTName - Whether to include table name prefix in field keys
 * @template acc - Accumulator for merging field types (default: empty object)
 * @returns Merged type containing all fields from all tables
 *
 * @example
 * // Without table name prefix
 * IterateTables<["User", "Post"], {...}, false>
 * // Returns: {id: number, name: string, title: string, ...} (may have conflicts!)
 *
 * @example
 * // With table name prefix
 * IterateTables<["User", "Post"], {...}, true>
 * // Returns: {"User.id": number, "User.name": string, "Post.id": number, "Post.title": string}
 */
type IterateTables<Tables extends Array<TTableSources>, TFields extends TFieldsType, IncTName extends boolean, acc extends Record<string, any> = {}> =
    Tables extends [infer T extends TTableSources, ...infer Rest extends Array<TTableSources>]
        ? [IncTName] extends [false]
            ? IterateTables<Rest, TFields, IncTName, acc & TFields[T extends string ? T : T[1]]>
            : IterateTables<Rest, TFields, IncTName, acc & IterateTablesFromFields<T, TFields[T extends string ? T : T[1]], IncTName>>
        : acc;

/**
 * Generates a field name with or without table prefix based on the IncName flag.
 * Used when transforming field names during type operations.
 *
 * @template T - Table name to use as prefix
 * @template F - Field name
 * @template IncName - Whether to include table name as prefix
 * @returns Field name as "field" or "Table.field" depending on IncName
 *
 * @example
 * GenName<"User", "id", false> // Returns: "id"
 * GenName<"User", "id", true>  // Returns: "User.id"
 */
type GenName<T extends string, F extends unknown, IncName extends boolean> = F extends string
    ? [IncName] extends [false]
        ? F
        : `${T}.${F}` : never;

/**
 * Transforms a table's field definitions by optionally prefixing field names with the table name.
 * Maps over all fields and applies the GenName transformation to each key.
 *
 * @template Table - Table source (table name or [table, alias] tuple)
 * @template TFields - Map of field names to their types for this table
 * @template IncTName - Whether to include table name prefix in field keys
 * @returns Type with transformed field keys
 *
 * @example
 * // Without prefix
 * IterateTablesFromFields<"User", {id: number, name: string}, false>
 * // Returns: {id: number, name: string}
 *
 * @example
 * // With prefix
 * IterateTablesFromFields<"User", {id: number, name: string}, true>
 * // Returns: {"User.id": number, "User.name": string}
 */
type IterateTablesFromFields<Table extends TTableSources, TFields extends Record<string, string>, IncTName extends boolean> = {
    [f in keyof TFields as GenName<Table extends string ? Table : `Come back to 6`, f, IncTName>]: TFields[f]
    // (f extends string
    //     ? [IncTName] extends [false]
    //         ? Record<f, TFields[f]>
    //         : Record<`${Table}.${f}`, TFields[f]> : never)
};


type TablesArray2Name<TSources extends Array<TTableSources>, acc extends Array<string> = []> =
    TSources extends [infer T extends TTableSources, ...infer Rest extends Array<TTableSources>]
    ? TablesArray2Name<Rest, [...acc, GetAliasTableNames<T>]>
    : acc;


// Helper to get column names from a single table (unqualified)
type GetColumnNamesFromTable<TDBBase extends TTableSources> = keyof GetFieldsFromTable<GetRealTableNames<TDBBase>>;

// Get all column names from an array of tables
type GetColumnsFromTables<Tables extends Array<TTableSources>> =
    Tables extends [infer T extends TTableSources, ...infer Rest extends Array<TTableSources>]
        ? GetColumnNamesFromTable<T> | GetColumnsFromTables<Rest>
        : never;

// Find columns that appear in multiple tables via pairwise intersection
type GetDuplicateColumnsPairwise<Tables extends TArrSources> =
    Tables extends [infer T1 extends TTableSources, infer T2 extends TTableSources, ...infer Rest extends Array<TTableSources>]
        ? (GetColumnNamesFromTable<T1> & GetColumnNamesFromTable<T2>)
        | GetDuplicateColumnsPairwise<[T1, ...Rest]>
        | GetDuplicateColumnsPairwise<[T2, ...Rest]>
        : never;

// Check if a column name is unique across all tables
type IsColumnUnique<Col extends string, Tables extends TArrSources> =
    Col extends GetDuplicateColumnsPairwise<Tables> ? false : true;

// Updated: Returns unique column names (unqualified) + all table.column syntax
type GetOtherColumns<Tables extends TArrSources> =
    Exclude<GetColumnsFromTables<Tables>, GetDuplicateColumnsPairwise<Tables>>
    | GetJoinCols<Tables[number]>;

class _fSelect<TSources extends TArrSources, TFields extends TFieldsType, TSelectRT extends Record<string, any> = {}> extends _fOrderBy<TSources, TFields, TSelectRT> {
    select<
        const TSelect extends ValidSelect<TSources>,
        TAlias extends string = never>
    (
        select: TSelect,
        alias?: TAlias
    ): [TAlias] extends [never]
        ? _fSelect<TSources, TFields, Prettify<TSelectRT & MergeItems<TSelect, TSources, TFields>>>
        : _fSelect<TSources, TFields, Prettify<TSelectRT & Record<TAlias, ExtractColumnType<TSelect, TSources, TFields>>>>
    {


        // Check if select is "Table.*" pattern
        const tableColMatch = select.match(/^(\w+)\.(.*?)$/);
        if (tableColMatch) {
            const [,tableName, colName] = tableColMatch;
            // Expand Table.* to all columns from that table
            const tableObject = this.values.tables.find(t => (t.alias || t.table) === tableName);
            if (!tableObject) throw new Error(`Table "${tableName}" not found in query`);
            const tableFields = DB[tableObject.table];
            if (!tableFields) {
                throw new Error(`Table "${tableName}" not found in database schema`);
            }


            if (colName === "*") {
                const hasMultipleTables = (this.values.tables && this.values.tables.length > 1) || false;

                const expandedSelects = Object.keys(tableFields.fields).map((field) => {
                    if (hasMultipleTables) {
                        return `${tableName}.${field} AS \`${tableName}.${field}\``;
                    }
                    return `${field}`;
                });

                return new _fSelect<TSources, TFields, Prettify<TSelectRT & MergeItems<TSelect, /*TablesArray2Name<TSources>*/TSources, TFields>>>(this.db, {
                    ...this.values,
                    selects: [...this.values.selects, ...expandedSelects]
                }) as any;
            }
            else if (!alias && !!colName) {  //table.column

                //Check if column is a unique
                // if is a unique strip table
                // else use table.column
                const currentTablesWithFields = this.values.tables.reduce<Record<string, number>>((acc, table) => {
                    const {table:real} = table;
                    for (const col in DB[real]!.fields) {
                        acc[col] = acc[col] ? acc[col] + 1 : 1;
                    }
                    return acc;
                }, {});

                if (!currentTablesWithFields[colName]) {
                    throw new Error(`Column "${colName}" not found in database schema`);
                }


                if (currentTablesWithFields[colName] > 1) {
                    return new _fSelect(this.db, {
                        ...this.values,
                        selects: [...this.values.selects, `${select} AS \`${select}\``]
                    }) as any;
                } else {
                    return new _fSelect(this.db, {
                        ...this.values,
                        selects: [...this.values.selects, `${colName}`]
                    }) as any;
                }
            }
        }

        // Check if alias is provided
        if (alias !== undefined) {
            return new _fSelect(this.db, {
                ...this.values,
                selects: [...this.values.selects, `${select} AS \`${alias}\``]
            }) as any;
        }

        return new _fSelect<TSources, TFields, Prettify<TSelectRT & MergeItems<TSelect, /*TablesArray2Name<TSources>*/TSources, TFields>>>(this.db, {
            ...this.values,
            selects: [...this.values.selects, select]
        }) as any;
    }
}

/**
 * Recursively counts the number of elements in a tuple of table sources.
 *
 * This utility type uses an accumulator pattern to count array/tuple length at the type level.
 * It's specifically used to determine the number of tables in a query, which affects whether
 * column names need to be prefixed with table names in the result set.
 *
 * @template T - The tuple of table sources to count, extends Array<TTableSources>
 * @template acc - Accumulator array for counting, defaults to empty array
 *
 * @example
 * type Count1 = CountKeys<["User"]>; // 1
 * type Count2 = CountKeys<["User", "Post"]>; // 2
 * type Count3 = CountKeys<["User", "Post", "Comment"]>; // 3
 */
type CountKeys<T extends Array<TTableSources>, acc extends Array<true> = []> = T extends [string, ...infer R extends Array<string>] ? CountKeys<R, [...acc, true]> : acc["length"];

class _fSelectDistinct<TSources extends TArrSources, TFields extends TFieldsType, TSelectRT extends Record<string, any> = {}> extends _fSelect<TSources, TFields, TSelectRT> {
    selectDistinct() {
        return new _fSelect<TSources, TFields, TSelectRT>(this.db, {...this.values, selectDistinct: true});
    }

    selectAll<TableCount = CountKeys<TSources>>() {
        //TODO
        // Need to loop through DATABASE object
        // if 1 table, no prefix
        // if more prefix with table name


        const selects = (function (values: Values) {
            if (values.tables && values.tables.length > 1) {
                return [/*values.baseTable,*/ ...values.tables.map(t => t.table)].reduce<Array<string>>((acc, table): Array<string> => {
                    //TODO review `!`
                    return acc.concat(Object.keys(DB[table]!.fields).map((field) => `${table}.${field} AS \`${table}.${field}\``))
                }, []);
            }
            //TODO review `!`
            return Object.keys(DB[values.tables[0].table]!.fields);
        }(this.values))

        return new _fOrderBy<TSources, TFields, MergeItems<"*", /*TablesArray2Name<TSources>*/TSources, TFields, TableCount extends 1 ? false : true>>(this.db, {
            ...this.values,
            selects
        });
    }

    //TODO
    // selectAllOmit() {
    //     throw new Error("Not implemented yet")
    // }
}


/*
HAVING - the grouped base data is filtered.
SELECT - the final data is returned.
ORDER BY - the final data is sorted.
LIMIT - the returned data is limited to row count.
OFFSET -
*/

class _fHaving<TSources extends TArrSources, TFields extends TFieldsType> extends _fSelectDistinct<TSources, TFields> {
    // TODO Allowed Fields
    //  - specified in groupBy
    having<const TCriteria extends WhereCriteria<TSources, TFields>>(criteria: TCriteria) {
        return new _fSelectDistinct<TSources, TFields>(this.db, {
            ...this.values,
            having: [criteria]
        });
    }
}

/*
GROUP BY - the filtered base data is grouped.
HAVING - the grouped base data is filtered.
SELECT - the final data is returned.
ORDER BY - the final data is sorted.
LIMIT - the returned data is limited to row count.
OFFSET -
*/

class _fGroupBy<TSources extends TArrSources, TFields extends TFieldsType> extends _fHaving<TSources, TFields> {

    //TODO this should only accept columns for tables in play
    groupBy<TSelect extends GetOtherColumns<TSources>>(groupBy: Array<TSelect>) {
        return new _fHaving<TSources, TFields>(this.db, {...this.values, groupBy: groupBy});
    }
}


/*
WHERE - the base data is filtered.
GROUP BY - the filtered base data is grouped.
HAVING - the grouped base data is filtered.
SELECT - the final data is returned.
ORDER BY - the final data is sorted.
LIMIT - the returned data is limited to row count.
OFFSET -
*/


/**
 * Creates a record type where all properties with key type K have optional values of type V.
 * This is used as a building block for SQL condition types where field matches are optional.
 *
 * @template K - The property key type (extends PropertyKey: string | number | symbol)
 * @template V - The value type for the properties
 *
 * @example
 * OptionalRecord<"id" | "name", string>
 * // Result: { id?: string; name?: string; }
 */
type OptionalRecord<K extends PropertyKey, V> = { [key in K]?: V; }

/**
 * Transforms all properties of a record type to optional properties.
 * Used to make field conditions optional in WHERE clauses.
 *
 * @template K - A record type with property keys and their corresponding value types
 *
 * @example
 * OptionalObject<{ id: number; name: string }>
 * // Result: { id?: number; name?: string; }
 */
type OptionalObject<K extends Record<PropertyKey, unknown>> = { [key in keyof K]?: K[key]; }

/**
 * Defines all valid SQL condition patterns for numeric types (number, bigint).
 * Supports equality, IN/NOT IN, BETWEEN, and comparison operators (>, >=, <, <=, !=).
 *
 * @template key - The property key for the field being queried
 * @template keyType - The numeric type (number or bigint)
 *
 * @example
 * COND_NUMERIC<"User.age", number>
 * // Allows: { "User.age": 25 }
 * // Or: { "User.age": { op: 'BETWEEN', values: [18, 65] } }
 * // Or: { "User.age": { op: '>=', value: 18 } }
 */
type COND_NUMERIC<key extends PropertyKey, keyType> =
    | OptionalRecord<key, keyType>
    | OptionalRecord<key, { op: 'IN' | 'NOT IN'; values: Array<keyType> }>
    | OptionalRecord<key, { op: 'BETWEEN'; values: [keyType, keyType] }>
    | OptionalRecord<key, { op: '>' | '>=' | '<' | '<=' | '!='; value: keyType }>;

/**
 * Defines all valid SQL condition patterns for string types.
 * Supports equality, IN/NOT IN, LIKE/NOT LIKE pattern matching, and inequality.
 *
 * @template key - The property key for the field being queried
 *
 * @example
 * COND_STRING<"User.email">
 * // Allows: { "User.email": "user@example.com" }
 * // Or: { "User.email": { op: 'LIKE', value: '%@example.com' } }
 * // Or: { "User.email": { op: 'IN', values: ['a@test.com', 'b@test.com'] } }
 */
type COND_STRING<key extends PropertyKey> =
    | OptionalRecord<key, string>
    | OptionalRecord<key, { op: 'IN' | 'NOT IN'; values: Array<string> }>
    | OptionalRecord<key, { op: 'LIKE' | 'NOT LIKE'; value: string }>
    | OptionalRecord<key, { op: '!='; value: string }>;

/**
 * Defines all valid SQL condition patterns for DateTime/Date types.
 * Supports equality, IN/NOT IN, BETWEEN for date ranges, and comparison operators.
 *
 * @template key - The property key for the field being queried
 * @template keyType - The Date type
 *
 * @example
 * COND_DATETIME<"Post.createdAt", Date>
 * // Allows: { "Post.createdAt": new Date('2024-01-01') }
 * // Or: { "Post.createdAt": { op: 'BETWEEN', values: [startDate, endDate] } }
 * // Or: { "Post.createdAt": { op: '>=', value: new Date('2024-01-01') } }
 */
type COND_DATETIME<key extends PropertyKey, keyType> =
    | OptionalRecord<key, keyType>
    | OptionalRecord<key, { op: 'IN' | 'NOT IN'; values: Array<keyType> }>
    | OptionalRecord<key, { op: 'BETWEEN'; values: [keyType, keyType] }>
    | OptionalRecord<key, { op: '>' | '>=' | '<' | '<=' | '!='; value: keyType }>;

/**
 * Defines all valid SQL condition patterns for boolean types.
 * Supports only equality and inequality checks (booleans cannot use range operations).
 *
 * @template key - The property key for the field being queried
 * @template keyType - The boolean type
 *
 * @example
 * COND_BOOLEAN<"User.isActive", boolean>
 * // Allows: { "User.isActive": true }
 * // Or: { "User.isActive": { op: '!=', value: false } }
 */
type COND_BOOLEAN<key extends PropertyKey, keyType> =
    | OptionalRecord<key, keyType>
    | OptionalRecord<key, { op: '!='; value: keyType }>;

/**
 * Defines SQL NULL checking conditions (IS NULL / IS NOT NULL).
 * Only allows these operators when the field type includes null in its union.
 *
 * @template key - The property key for the field being queried
 * @template keyType - The field type (must include null to use this condition)
 *
 * @example
 * COND_NULL<"User.middleName", string | null>
 * // Allows: { "User.middleName": { op: 'IS NULL' } }
 * // Or: { "User.middleName": { op: 'IS NOT NULL' } }
 *
 * COND_NULL<"User.email", string>
 * // Result: never (cannot use NULL checks on non-nullable fields)
 */
type COND_NULL<key extends PropertyKey, keyType> = keyType extends null ? OptionalRecord<key, {
    op: 'IS NULL' | 'IS NOT NULL'
}> : never;


/**
 * Maps each field in a record type to its appropriate SQL condition type based on the field's TypeScript type.
 * This is the main conditional type that routes to COND_NUMERIC, COND_STRING, COND_DATETIME, COND_BOOLEAN, or COND_NULL.
 * Used to generate type-safe WHERE clause conditions.
 *
 * @template T - A record type mapping field names to their TypeScript types
 *
 * @example
 * SQLCondition<{ "User.id": number; "User.name": string; "User.email": string | null }>
 * // Allows conditions like:
 * // { "User.id": 1 } | { "User.id": { op: '>', value: 100 } }
 * // { "User.name": "Alice" } | { "User.name": { op: 'LIKE', value: 'A%' } }
 * // { "User.email": { op: 'IS NULL' } }
 */
type SQLCondition<T> = Prettify<{
    [K in keyof T]?:
    (Exclude<T[K], null> extends number ? COND_NUMERIC<K, Exclude<T[K], null>> :
        Exclude<T[K], null> extends bigint ? COND_NUMERIC<K, Exclude<T[K], null>> :
            Exclude<T[K], null> extends string ? COND_STRING<K> :
                Exclude<T[K], null> extends boolean ? COND_BOOLEAN<K, Exclude<T[K], null>> :
                    Exclude<T[K], null> extends Date ? COND_DATETIME<K, Exclude<T[K], null>> :
                        "Unsupported Data Type") | COND_NULL<K, T[K]>
}[keyof T]>


type BasicOpTypes =
    | OptionalRecord<PropertyKey, SUPPORTED_TYPES>
    | OptionalRecord<PropertyKey, { op: 'IN' | 'NOT IN'; values: Array<SUPPORTED_TYPES> }>
    | OptionalRecord<PropertyKey, { op: 'BETWEEN'; values: [SUPPORTED_TYPES, SUPPORTED_TYPES] }>
    | OptionalRecord<PropertyKey, { op: 'LIKE' | 'NOT LIKE'; value: string }>
    | OptionalRecord<PropertyKey, { op: 'IS NULL' | 'IS NOT NULL' }>
    | OptionalRecord<PropertyKey, { op: '>' | '>=' | '<' | '<=' | '!='; value: SUPPORTED_TYPES }>;

/**
 * Transforms a table's fields into a record where keys are prefixed with the table name ("Table.field").
 * This creates fully-qualified column references needed for joins and multi-table queries.
 *
 * @template Table - The table name (string)
 * @template Fields - A record mapping field names to their TypeScript types
 *
 * @example
 * TableFieldType<"User", { id: number; email: string }>
 * // Result: { "User.id": number; "User.email": string }
 */
type TableFieldType<Table extends string, Fields extends Record<string, any>> = {
    [f in keyof Fields as CombineToString<f, Table>]: Fields[f];
}

type LogicalOperator = '$AND' | '$OR' | '$NOT' | "$NOR";

/**
 * Defines the complete structure for WHERE clause criteria, supporting both field conditions and logical operators.
 * This is the main type used by the `.where()` method to ensure type-safe filtering across all joined tables.
 *
 * @template T - Array of table sources currently in the query (e.g., ["User", ["Post", "p"]])
 * @template TFields - Record mapping table names to their field types
 * @template F - The generated field conditions type (defaults to WhereCriteria_Fields)
 *
 * @example
 * WhereCriteria<["User", "Post"], { User: {...}, Post: {...} }>
 * // Allows conditions like:
 * // { "User.id": 1, "Post.authorId": 1 }
 * // { $AND: [{ "User.id": 1 }, { "Post.published": true }] }
 * // { $OR: [{ "User.email": "a@test.com" }, { "User.name": "Alice" }] }
 */
type WhereCriteria<
    T extends TArrSources,
    TFields extends TFieldsType,
    F = WhereCriteria_Fields<T, TFields>
> = F & {
    [k in LogicalOperator]?: [WhereCriteria<T, TFields, F>, ...Array<WhereCriteria<T, TFields, F>>];
};

/**
 * Recursively builds the field condition types for all tables in the query.
 * Handles both regular table sources (strings) and aliased sources ([table, alias] tuples).
 * Accumulates all qualified field names and their condition types.
 *
 * @template T - Array of table sources to process
 * @template TFields - Record mapping table names to their field types
 * @template acc - Accumulator for building up the combined field conditions (defaults to {})
 *
 * @example
 * WhereCriteria_Fields<["User", ["Post", "p"]], { User: { id: number }, Post: { id: number, authorId: number } }>
 * // Result: { "User.id"?: number | COND_NUMERIC<...>, "p.id"?: number | COND_NUMERIC<...>, "p.authorId"?: ... }
 */
type WhereCriteria_Fields<T extends Array<TTableSources>, TFields extends TFieldsType, acc = {}> =
    T extends readonly [infer HEAD, ...infer Rest]
        ? HEAD extends string
            ? Rest extends Array<TTableSources>
                ? WhereCriteria_Fields<Rest, TFields, OptionalObject<acc & (TableFieldType<HEAD, TFields[HEAD]> | SQLCondition<TableFieldType<HEAD, TFields[HEAD]>>)>>
                : WhereCriteria_Fields<[], TFields, OptionalObject<acc & (TableFieldType<HEAD, TFields[HEAD]> | SQLCondition<TableFieldType<HEAD, TFields[HEAD]>>)>>
            : HEAD extends [infer R_NAME extends string, infer A_NAME extends string]
                ? Rest extends Array<TTableSources>
                    ? WhereCriteria_Fields<Rest, TFields, OptionalObject<acc & (TableFieldType<A_NAME, TFields[R_NAME]> | SQLCondition<TableFieldType<A_NAME, TFields[R_NAME]>>)>>
                    : WhereCriteria_Fields<[], TFields, OptionalObject<acc & (TableFieldType<A_NAME, TFields[R_NAME]> | SQLCondition<TableFieldType<A_NAME, TFields[R_NAME]>>)>>
: never
        : acc;


/**
 * Conditional type that returns R only if T is exactly null, otherwise returns never.
 * Used as a filter to identify nullable fields for NULL checking operations.
 *
 * @template T - The type to check for null
 * @template R - The type to return if T is null
 *
 * @example
 * OnlyNull<null, "nullable"> // "nullable"
 * OnlyNull<string, "nullable"> // never
 * OnlyNull<string | null, "nullable"> // never (not exactly null)
 */
type OnlyNull<T, R> = T extends null ? R : never;

/**
 * Finds all qualified column names ("Table.column") that have nullable types across all tables.
 * Used by `.whereNotNull()` and `.whereIsNull()` to restrict which columns can use NULL checks.
 *
 * @template TFields - Record mapping table names to their field types
 *
 * @example
 * FindColsWithNull<{ User: { id: number, email: string | null }, Post: { content: string } }>
 * // Result: "User.email" (only nullable field)
 */
type FindColsWithNull<TFields extends TFieldsType> = Prettify<{
    [Table in keyof TFields]: {
        [Field in keyof TFields[Table]]: OnlyNull<TFields[Table][Field], CombineToString<Field, Table>>
    }[keyof TFields[Table]]
}[keyof TFields]>

/**
 * Type guard that ensures raw SQL strings for `.whereRaw()` do not start with "WHERE".
 * Returns the input string if valid, otherwise returns an error message type.
 *
 * @template RAW - The raw SQL string to validate
 *
 * @example
 * NO_START_WITH_WHERE<"id > 10"> // "id > 10" (valid)
 * NO_START_WITH_WHERE<"WHERE id > 10"> // "Please do not start with `WHERE`" (error)
 * NO_START_WITH_WHERE<"  where id > 10"> // "Please do not start with `WHERE`" (error - case insensitive)
 */
type NO_START_WITH_WHERE<RAW extends string> = Uppercase<TRIM<RAW>> extends `WHERE ${string}` ? "Please do not start with `WHERE`" : RAW;

/**
 * Recursively removes leading spaces from a string type.
 * Used to normalize raw SQL strings before validation.
 *
 * @template S - The string type to trim
 *
 * @example
 * TRIM<"  hello"> // "hello"
 * TRIM<"hello"> // "hello"
 * TRIM<"  hello  "> // "hello  " (only trims left side)
 */
type TRIM<S extends string> = S extends ` ${infer S2}` ? TRIM<S2> : S;
class _fWhere<TSources extends TArrSources, TFields extends TFieldsType> extends _fGroupBy<TSources, TFields> {


    whereNotNull<const TColWithNull extends FindColsWithNull<TFields>>(col: TColWithNull) {


        type RemoveNullFromField<T extends unknown, TFields extends TFieldsType> = T extends `${infer table}.${infer col}` ?
            Prettify<Omit<TFields, table> & Prettify<Record<table, Omit<Pick<TFields, table>[table], col> & Record<col, Exclude<Pick<TFields, table>[table][col], null>>>>>
            : never;

        return new _fWhere<TSources, RemoveNullFromField<TColWithNull, TFields>>(this.db, {
            ...this.values,
            where: [
                ...(this.values.where || []),
                {

                    $AND:
                    //@ts-expect-error todo comeback to, col is a string or never
                        [{[col]: {op: "IS NOT NULL"}}]
                }
            ],
        });
    }

    whereIsNull<const TColWithNull extends FindColsWithNull<TFields>>(col: TColWithNull) {

        type RemoveNonNullFromField<T extends unknown, TFields extends TFieldsType> = T extends `${infer table}.${infer col}` ?
            Prettify<Omit<TFields, table> & Prettify<Record<table, Omit<Pick<TFields, table>[table], col> & Record<col, null>>>>
            : never;

        return new _fWhere<TSources, RemoveNonNullFromField<TColWithNull, TFields>>(this.db, {
            ...this.values,
            where: [
                ...(this.values.where || []),
                {

                    $AND:
                    //@ts-expect-error todo comeback to, col is a string or never
                        [{[col]: {op: "IS NULL"}}]
                }
            ],
        });
    }

    where<const TCriteria extends WhereCriteria<TSources, TFields>>(criteria: TCriteria) {

        return new _fGroupBy<TSources, TFields>(this.db, {
            ...this.values,
            where: [...this.values.where || [], criteria],
        });
    }

    whereRaw<RAW extends string >(where:NO_START_WITH_WHERE<RAW>) {

        return new _fGroupBy<TSources, TFields>(this.db, {
            ...this.values,
            where: [...(this.values.where || []), where.replace(/^\s*where\s*/i, "").trim()],
        });
    }

}

/*function processCriteria(criteria: WhereCriteria<T>): string {
    if ('AND' in criteria || 'OR' in criteria) {
        return Object.keys(criteria).map((operator) => {
            const subCriteria = (criteria as any)[operator] as WhereCriteria<T>[];
            const subConditions = subCriteria.map(subCriterion => processCriteria(subCriterion)).join(` ${operator} `);
            return `(${subConditions})`;
        }).join(" ");
    } else {
        return processCondition(criteria as WhereCondition<T>);
    }
}
function processCondition(condition: WhereCondition<T>): string {
    return Object.keys(condition).map((key) => {
        const value = condition[key as keyof T];
        if (Array.isArray(value)) {
            const valuesList = value.map((v) => (typeof v === 'string' ? `'${v}'` : v)).join(", ");
            return `${key} IN (${valuesList})`;
        } else if (value === null) {
            return `${key} IS NULL`;
        } else {
            return `${key} = ${typeof value === 'string' ? `'${value}'` : value}`;
        }
    }).join(" AND ");
}*/

/*
JOIN -
WHERE - the base data is filtered.
GROUP BY - the filtered base data is grouped.
HAVING - the grouped base data is filtered.
SELECT - the final data is returned.
ORDER BY - the final data is sorted.
LIMIT - the returned data is limited to row count.
OFFSET -
*/


/**
 * Extracts the fields object from a table source.
 *
 * This type helper extracts the database field definitions for a given table,
 * handling both simple table names and table alias tuples.
 *
 * @template TDBBase - The table source, either a string table name or a [table, alias] tuple
 * @returns The fields object containing all column definitions and their types for the table
 *
 * @example
 * // For a simple table name:
 * type UserFields = GetFieldsFromTable<"User">;
 * // Returns: { id: number, name: string, email: string, ... }
 *
 * @example
 * // For a table with alias:
 * type UserFields = GetFieldsFromTable<["User", "u"]>;
 * // Returns: { id: number, name: string, email: string, ... }
 */
type GetFieldsFromTable<TDBBase extends TTableSources> = Extract<DATABASE, { table: GetRealTableNames<TDBBase> }>["fields"];

/**
 * Extracts column names from a table source.
 *
 * This type helper returns the keys (column names) from a table's field definitions,
 * handling both simple table names and table alias tuples.
 *
 * @template TDBBase - The table source, either a string table name or a [table, alias] tuple
 * @returns Union of column names as strings
 *
 * @example
 * // For a simple table name:
 * type UserCols = GetColsBaseTable<"User">;
 * // Returns: "id" | "name" | "email" | ...
 *
 * @example
 * // For a table with alias:
 * type UserCols = GetColsBaseTable<["User", "u"]>;
 * // Returns: "id" | "name" | "email" | ...
 */
type GetColsBaseTable<TDBBase extends TTableSources> = TDBBase extends string
    ? keyof GetFieldsFromTable<TDBBase>
    : keyof GetFieldsFromTable<TDBBase[0]>;

/**
 * Generates fully-qualified column references for join operations.
 *
 * This type helper creates table-prefixed column references (e.g., "User.id", "Post.authorId")
 * for use in join operations. It uses the alias if provided, otherwise uses the table name.
 *
 * @template TDBBase - The table source, either a string table name or a [table, alias] tuple
 * @returns Union of fully-qualified column references in the format "TableOrAlias.columnName"
 *
 * @example
 * // For a simple table name:
 * type UserJoinCols = GetJoinCols<"User">;
 * // Returns: "User.id" | "User.name" | "User.email" | ...
 *
 * @example
 * // For a table with alias:
 * type UserJoinCols = GetJoinCols<["User", "u"]>;
 * // Returns: "u.id" | "u.name" | "u.email" | ...
 */
type GetJoinCols<TDBBase extends TTableSources> = TDBBase extends string
    ? IterateFields<TDBBase, IsString<GetColsBaseTable<TDBBase>>>
    : IterateFields<TDBBase[1], IsString<GetColsBaseTable<TDBBase[0]>>>;

/**
 * Creates fully-qualified column references by prefixing field names with table/alias.
 *
 * This utility type takes a table source and field names and combines them into
 * fully-qualified references (e.g., "User.id", "u.name").
 *
 * @template TDBBase - The table source, either a string table name or a [table, alias] tuple
 * @template F - Union of field names as strings
 * @returns Union of fully-qualified column references in the format "TableOrAlias.field"
 *
 * @example
 * type QualifiedCols = IterateFields<"User", "id" | "name">;
 * // Returns: "User.id" | "User.name"
 *
 * @example
 * type QualifiedCols = IterateFields<["User", "u"], "id" | "name">;
 * // Returns: "u.id" | "u.name"
 */
type IterateFields<TDBBase extends TTableSources, F extends string> = `${TDBBase extends string ? TDBBase : TDBBase[1]}.${F}`;

/**
 * Extracts the relations object for a given table, mapping foreign key columns to their target table columns.
 *
 * @template Table - The table source, either a table name string or a tuple of [table, alias]
 * @returns The relations object from the DATABASE type for the specified table
 *
 * @example
 * // For a table with relations:
 * Relations<"Post"> // { User: { authorId: ["id"] }, Category: { categoryId: ["id"] } }
 * Relations<["Post", "p"]> // Same as above, ignores alias
 */
type Relations<Table extends TTableSources> = Extract<DATABASE, { table: GetRealTableNames<Table> }>["relations"];

// type UnionToIntersection<U> =
//     (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
//
// type LastOf<T> =
//     UnionToIntersection<T extends any ? (x: T) => void : never> extends (x: infer Last) => void ? Last : never;
//
// type Push<T extends any[], V> = [...T, V];
//
// type UnionToTuple<T, L = LastOf<T>, N = [T] extends [never] ? true : false> =
//     true extends N ? [] : Push<UnionToTuple<Exclude<T, L>>, L>;
//
// type a = "1" | "2";
// type b = UnionToTuple<a>; // ["1", "2"]
//
// type c = UnionToTuple<keyof Relations<"LikedPosts">>
// //   ^?

/**
 * Recursively collects all available table names that can be joined from a set of source tables.
 * Iterates through each table in the array and unions the keys of their relations (i.e., tables they can join to).
 *
 * @template Tables - Array of table sources currently in the query (table names or [table, alias] tuples)
 * @template acc - Accumulator that builds up the union of available join targets (defaults to never)
 * @returns A union type of all table names that can be joined based on the relations of the source tables
 *
 * @example
 * // Given Post has relations to User and Category:
 * AvailableJoins<["Post"]> // "User" | "Category"
 * AvailableJoins<["Post", "User"]> // "User" | "Category" | "Post" | "Profile"
 */
type AvailableJoins<Tables extends Array<TTableSources>, acc extends TTableSources = never> =
    Tables extends [infer T extends TTableSources, ...infer Rest extends Array<TTableSources>]
        ? AvailableJoins<Rest,
            //@ts-expect-error todo come back to
            acc | keyof Relations<T>>
        : acc;


// type MapAliasToTable<
//     TAliasMap extends TTableAliases,
//     Join extends TArrSources
// > = Join[number] extends string ? [`${TAliasMap[Join[number]]}`] : [`${TAliasMap[Join[number]]}`]

/**
 * Extracts the real table name from a table source, whether it's a plain string or a [table, alias] tuple.
 * This is used throughout the type system to get the actual database table name for schema lookups.
 *
 * @template Tables - A table source, either a table name string or a [table, alias] tuple
 * @returns The real table name (string), ignoring any alias
 *
 * @example
 * GetRealTableNames<"User"> // "User"
 * GetRealTableNames<["User", "u"]> // "User"
 * GetRealTableNames<"User" | ["Post", "p"]> // "User" | "Post"
 */
type GetRealTableNames<Tables extends TTableSources> = Tables extends any
    ? Tables extends string
        ? Tables
        : Tables[0]
    : never;

/**
 * Extracts the alias or table name from a table source for use in queries.
 * If the source is a [table, alias] tuple, returns the alias; otherwise returns the table name itself.
 *
 * @template Tables - A table source, either a table name string or a [table, alias] tuple
 * @returns The alias name if provided, otherwise the table name
 *
 * @example
 * GetAliasTableNames<"User"> // "User"
 * GetAliasTableNames<["User", "u"]> // "u"
 * GetAliasTableNames<"User" | ["Post", "p"]> // "User" | "p"
 */
type GetAliasTableNames<Tables extends TTableSources> = Tables extends any
    ? Tables extends string
        ? Tables
        : Tables[1]
    : never;

/*

returns {
  <Table>: {
        //eg readonly authorId: ["id"];
        readonly remoteCol: ["localCol"];
    }>;
}
}
 */
/**
 * Filters a table's relations to only include those that are present in the current query's joined tables.
 * This ensures that only valid, known table joins are suggested based on the schema's foreign key relationships.
 *
 * @template TNewJoin - The new table being joined (must be a known table name)
 * @template TJoins - The array of tables currently in the query (including the base table)
 * @template TRelations - The relations object for TNewJoin (automatically inferred)
 * @returns A filtered relations object containing only relations to tables already in the query
 *
 * @example
 * // Given: Post has relations to User and Category, and we're joining from User:
 * SafeJoins<"Post", ["User"]> // { User: { authorId: ["id"] } }
 * // Category is excluded because it's not in the current query
 */
export type SafeJoins<TNewJoin extends TTables,
    TJoins extends TArrSources,
    TRelations = Relations<TNewJoin>
> = { [k in keyof TRelations as Filter<k,GetRealTableNames<TJoins[number]>>]: TRelations[k] };

/**
 * Converts an array type to a union of its element types.
 * This is a helper for accessing all table sources as a union rather than an array.
 *
 * @template TJoins - An array of table sources
 * @returns A union type of all elements in the array
 *
 * @example
 * ToUnion<["User", "Post"]> // "User" | "Post"
 * ToUnion<[["User", "u"], "Post"]> // ["User", "u"] | "Post"
 */
type ToUnion<TJoins extends TArrSources> = TJoins[number];

/**
 * Maps safe joins to use aliases (or table names) as keys instead of real table names.
 * This transformation enables type-safe queries using the alias names that appear in the SQL.
 *
 * @template TSafeJoins - The safe joins object (filtered relations from SafeJoins)
 * @template TJoins - The array of table sources with their aliases
 * @returns A record mapping alias names to their corresponding join relations
 *
 * @example
 * // Given: User table aliased as "u" with a relation to Post
 * MapJoinsToKnownTables<{ User: { posts: ["userId"] } }, [["User", "u"]]>
 * // Result: { u: { posts: ["userId"] } }
 */
export type MapJoinsToKnownTables<TSafeJoins extends Record<string, unknown>, TJoins extends TArrSources> = {
    [k in ToUnion<TJoins> as GetAliasTableNames<k> ]: TSafeJoins[GetRealTableNames<k>]
};

/**
 * Combines a field name (A) with a table name (T) to create a qualified column reference string.
 * Used throughout the type system to create "Table.column" formatted strings for SQL queries.
 *
 * @template A - The field/column name
 * @template T - The table name
 * @returns A template literal string in the format "Table.column"
 *
 * @example
 * CombineToString<"id", "User"> // "User.id"
 * CombineToString<"email", "User"> // "User.email"
 * CombineToString<123, "User"> // never (A must be string)
 */
type CombineToString<A extends unknown, T extends unknown> = A extends string
    ? T extends string
        ? `${T}.${A}`
        : never
    : never;

/**
 * Transforms a safe joins object into a union of tuple pairs representing valid join columns.
 * Each tuple contains the local column name and the fully-qualified remote column reference.
 *
 * @template TSafe - A safe joins object (usually from MapJoinsToKnownTables)
 * @returns A union of [localColumn, "RemoteTable.remoteColumn"] tuples
 *
 * @example
 * // Given: LikedPosts has userId -> User.id and postId -> Posts.id
 * GetUnionOfRelations<SafeJoins<"LikedPosts", ["User", "Posts"]>>
 * // Returns: ["userId", "User.id"] | ["postId", "Posts.id"]
 */
export type GetUnionOfRelations<TSafe> = {
    [T in keyof TSafe]: {
        [TLocal in keyof TSafe[T]]:
        [
            TLocal,
            T extends string
                ? TSafe[T][TLocal] extends Array<string>
                    ? CombineToString<TSafe[T][TLocal][number], T>
                    : never
                : never
        ]
    }[keyof TSafe[T]];
}[keyof TSafe];

/**
 * Validates that a type is a tuple of exactly two strings.
 *
 * This type guard ensures that the input type is a two-element tuple where both elements
 * are strings. Returns the tuple if valid, otherwise returns `never`. Used for validating
 * join column pairs in SQL operations.
 *
 * @template T - The type to validate as a string tuple
 *
 * @example
 * type Valid = ValidStringTuple<["userId", "User.id"]>; // ["userId", "User.id"]
 * type Invalid1 = ValidStringTuple<[1, 2]>; // never
 * type Invalid2 = ValidStringTuple<["only one"]>; // never
 * type Invalid3 = ValidStringTuple<["one", "two", "three"]>; // never
 */
type ValidStringTuple<T> = T extends [string, string] ? T : never;

/**
 * Searches a union of [column, reference] tuples to find the matching reference for a given column.
 * This is used during type-safe joins to determine the valid target column based on the source column.
 *
 * @template TJoinCols - A union of [string, string] tuples representing valid join column pairs
 * @template toFind - The column name to search for in the first position of each tuple
 * @returns The matching reference column (second element of tuple) if found, otherwise never
 *
 * @example
 * // Given join columns: ["userId", "User.id"] | ["postId", "Post.id"]
 * find<["userId", "User.id"] | ["postId", "Post.id"], "userId"> // "User.id"
 * find<["userId", "User.id"] | ["postId", "Post.id"], "postId"> // "Post.id"
 * find<["userId", "User.id"] | ["postId", "Post.id"], "invalid"> // never
 */
type find<TJoinCols extends [string, string], toFind extends string> =
    TJoinCols extends [infer col1, infer col2]
        ? col1 extends toFind
            ? col2
            : never
        : never;

// type CleanUpFromNames<TFromTable extends TTableSources, TCols extends string> = TCols extends `${TFromTable}.${infer Col}` ? Col : TCols;

/**
 * Removes the nullable marker prefix (`?`) from a string type.
 *
 * This is similar to `RemoveNullChar` but used in different contexts for type manipulation.
 * If the string starts with `?`, it returns the remaining string; otherwise returns the original.
 *
 * @template T - The string type to process, expected to extend string
 *
 * @example
 * type Result1 = RemoveNullable<"?optional">; // "optional"
 * type Result2 = RemoveNullable<"required">; // "required"
 */
type RemoveNullable<T extends string> = T extends `?${infer R}` ? R : T;

/**
 * Swaps the keys and values of a record type, removing nullable markers (`?`) from the new keys.
 * This is used to create reverse lookup types that map TypeScript types back to their field names.
 *
 * @template T - A record type where values are string types (potentially with nullable markers)
 *
 * @returns A new record type where the original values become keys (with `?` removed) and the original keys become values
 *
 * @example
 * type Original = { id: "Int", name: "?String", age: "Int" };
 * type Swapped = SwapKeysAndValues<Original>;
 * // Result: { Int: "id" | "age", String: "name" }
 */
type SwapKeysAndValues<T extends Record<string, any>> = {
    [K in keyof T as RemoveNullable<T[K]>]: K;
};


/**
 * Flattens a complex intersection type into a single object type for better IDE display.
 *
 * This utility type improves TypeScript's type display in IDE tooltips by expanding
 * intersection types and nested type references into a single, readable object structure.
 * It doesn't change the type's behavior, only how it's displayed.
 *
 * @template T - The type to prettify
 *
 * @example
 * type Complex = { a: string } & { b: number } & { c: boolean };
 * type Pretty = Prettify<Complex>;
 * // Displays as: { a: string; b: number; c: boolean; }
 * // Instead of: { a: string } & { b: number } & { c: boolean }
 */
type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

/**
 * Extracts the table name from a string that may contain an inline alias.
 *
 * Parses table source strings that follow the pattern "TableName alias" and extracts
 * just the table name portion. If no alias is present, returns the entire string.
 *
 * @template T - The input string, potentially in the format "TableName alias"
 * @returns The table name portion before any whitespace
 *
 * @example
 * type TableOnly = ExtractTableName<"User u">;
 * // Returns: "User"
 *
 * @example
 * type TableOnly = ExtractTableName<"Post">;
 * // Returns: "Post"
 */
type ExtractTableName<T extends string> =
    T extends `${infer Table} ${string}` ? Table : T;

/**
 * Extracts the alias from a string that contains an inline table alias.
 *
 * Parses table source strings that follow the pattern "TableName alias" and extracts
 * just the alias portion. If no alias is present, returns never.
 *
 * @template T - The input string, potentially in the format "TableName alias"
 * @returns The alias portion after the whitespace, or never if no alias exists
 *
 * @example
 * type AliasOnly = ExtractAlias<"User u">;
 * // Returns: "u"
 *
 * @example
 * type AliasOnly = ExtractAlias<"Post">;
 * // Returns: never
 */
type ExtractAlias<T extends string> =
    T extends `${string} ${infer Alias}` ? Alias : never;


/**
 * Creates a reverse mapping from tables to their field types.
 * For each table, swaps keys (field names) and values (type strings like "Int", "String")
 * to enable lookup of fields by their types.
 *
 * @example
 * // Given: User table with fields { id: "Int", name: "String", age: "Int" }
 * // Result: { User: { Int: "id" | "age", String: "name" } }
 */
type FieldsByTableByType = Prettify<{
    [Table in TTables]: SwapKeysAndValues<_db[Table]["fields"]>;
}>

/**
 * Extracts all unique Prisma type strings used across all tables.
 * Creates a union of all type strings (Int, String, Boolean, etc.) found in the database schema.
 *
 * @example
 * // If database has fields with types "Int", "String", "Boolean"
 * // Result: { Int: {}, String: {}, Boolean: {} }
 */
type GetTypes = {
    [Type in keyof FieldsByTableByType as keyof FieldsByTableByType[Type]]: {};
};

/**
 * Creates a nested mapping from type strings to tables to field names.
 * For each type (Int, String, etc.), lists which tables have fields of that type
 * and what those field names are.
 *
 * @example
 * // Result structure:
 * // {
 * //   Int: { User: "id" | "age", Post: "id" | "views" },
 * //   String: { User: "name" | "email", Post: "title" }
 * // }
 */
type FieldsByTypeByTable = Prettify<{
    [Type in keyof GetTypes]: {
        [Table in keyof FieldsByTableByType as [FieldsByTableByType[Table][Filter<keyof FieldsByTableByType[Table], Type>]] extends [never] ? never : Table]: FieldsByTableByType[Table][Filter<keyof FieldsByTableByType[Table], Type>]
    };
}>;

/**
 * Retrieves the TypeScript type of a specific column from a table.
 *
 * This type helper looks up a column's type definition from the database schema,
 * handling both simple table names and table alias tuples, and removes nullable markers.
 *
 * @template Table - The table source, either a string table name or a [table, alias] tuple
 * @template Col1 - The column name as a key of the table's fields
 * @returns The TypeScript type of the column (string, number, Date, etc.) with nullable markers removed
 *
 * @example
 * type UserIdType = GetColumnType<"User", "id">;
 * // Returns: number
 *
 * @example
 * type PostTitleType = GetColumnType<["Post", "p"], "title">;
 * // Returns: string
 */
type GetColumnType<Table extends TTableSources, Col1 extends keyof _db[Table extends string ? Table : `Come back to 8`]["fields"]> = RemoveNullChar<IsString<_db[Table extends string ? Table : `Come back to 9`]["fields"][Col1]>>

// type FieldsByTableByType<TFields extends TFieldsType> = Prettify<{
//     [Table in  TTableSources] : SwapKeysAndValues<TFields[Table]>;
// }>

// type GetTypes<TFields extends TFieldsType> = {
//     [Type in keyof FieldsByTableByType<TFields> as keyof FieldsByTableByType<TFields>[Type]]: {
//     };
// };
// type FieldsByTypeByTable<TFields extends TFieldsType> = Prettify<{
//     [Type in keyof GetTypes<TFields>]: {
//         [Table in keyof FieldsByTableByType<TFields> as [FieldsByTableByType<TFields>[Table][Filter<keyof FieldsByTableByType<TFields>[Table], Type>]] extends [never] ? never : Table]:  FieldsByTableByType<TFields>[Table][Filter<keyof FieldsByTableByType<TFields>[Table], Type>]
//     };
// }>;

//type GetColumnType<Table extends TTableSources, TFields extends TFieldsType, Col1 extends keyof TFields[Table]> = RemoveNullChar<IsString<TFields[Table][Col1]>>

/**
 * Finds all columns across source tables that match a specific TypeScript type.
 *
 * Used in type-safe joins to find compatible columns across tables based on their
 * TypeScript types. Returns fully-qualified column references for all matching columns.
 *
 * @template Type - The TypeScript type to search for (e.g., "number", "string", "Int")
 * @template TSources - Array of table sources currently in the query
 * @returns Union of fully-qualified column references that match the specified type
 *
 * @example
 * // Find all number columns across User and Post tables:
 * type NumberCols = GetJoinOnColsType<"Int", [["User", "u"], ["Post", "p"]]>;
 * // Returns: "u.id" | "u.age" | "p.id" | "p.views" | ...
 */
type GetJoinOnColsType<Type extends string, TSources extends TArrSources> =
// GetColsFromTableType<TDBBase, Type>
    GetJoinColsType<TSources[number], Type>;

/**
 * Extracts columns of a specific type from a single table source.
 *
 * Looks up all columns in a table that match a specific Prisma type (e.g., "Int", "String"),
 * using the global FieldsByTypeByTable mapping.
 *
 * @template TDBBase - The table source, either a string table name or a [table, alias] tuple
 * @template Type - The Prisma type string to search for (e.g., "Int", "String", "DateTime")
 * @returns Union of column names from the table that match the specified type
 *
 * @example
 * type UserStringCols = GetColsFromTableType<"User", "String">;
 * // Returns: "name" | "email" | ...
 *
 * @example
 * type PostIntCols = GetColsFromTableType<["Post", "p"], "Int">;
 * // Returns: "id" | "views" | ...
 */
type GetColsFromTableType<TDBBase extends TTableSources, Type extends string> =
//@ts-expect-error Try and come back to
    FieldsByTypeByTable[Loop<keyof FieldsByTypeByTable, Type>][GetRealTableNames<TDBBase>];

/**
 * Filters a union of keys to find those that match a specific type string.
 *
 * A utility type that iterates through a union of keys and returns only those
 * that match the target type. Used as part of the type-based column lookup system.
 *
 * @template Keys - Union of string keys to filter
 * @template Type - The target type string to match against
 * @returns The keys from the union that match the type, or never if none match
 *
 * @example
 * type Match = Loop<"Int" | "String" | "Boolean", "Int">;
 * // Returns: "Int"
 *
 * @example
 * type NoMatch = Loop<"String" | "Boolean", "Int">;
 * // Returns: never
 */
type Loop<Keys extends string, Type extends string> = Keys extends Type ? Type : never;


/**
 * Generates fully-qualified column references for columns of a specific type from a table source.
 *
 * Combines GetColsFromTableType with IterateFields to produce fully-qualified references
 * (e.g., "Table.column") for all columns of a specific type.
 *
 * @template TDBBase - The table source, either a string table name or a [table, alias] tuple
 * @template Type - The Prisma type string to search for (e.g., "Int", "String", "DateTime")
 * @returns Union of fully-qualified column references in the format "TableOrAlias.column"
 *
 * @example
 * type UserIntCols = GetJoinColsType<"User", "Int">;
 * // Returns: "User.id" | "User.age" | ...
 *
 * @example
 * type PostStringCols = GetJoinColsType<["Post", "p"], "String">;
 * // Returns: "p.title" | "p.content" | ...
 */
type GetJoinColsType<TDBBase extends TTableSources, Type extends string> = IterateFields<TDBBase, IsString<GetColsFromTableType<TDBBase, Type>>>;//, Type];

/**
 * Base type constraint for field type mappings.
 * Represents a mapping from table names to their field definitions,
 * where each field definition is a record of field names to their types.
 *
 * @example
 * const fields: TFieldsType = {
 *   User: { id: number, name: string },
 *   Post: { id: number, title: string }
 * };
 */
type TFieldsType = Record<string, Record<string, any>>;

class _fJoin<
    TSources extends TArrSources,
    TFields extends TFieldsType
> extends _fWhere<TSources, TFields> {

    // Overload 1: Object syntax
    join<const Table extends AvailableJoins<TSources>,
        TJoinCols extends [string, string] = ValidStringTuple<GetUnionOfRelations<MapJoinsToKnownTables<SafeJoins<Table,  TSources>,TSources>>>,
        TCol1 extends TJoinCols[0] = never,
        TAlias extends string = never
    >(options: {
        table: Table,
        src: TCol1,
        on: find<TJoinCols, TCol1>,
        alias?: TAlias
    }): _fJoin<[...TSources, [TAlias] extends [undefined] ? Table : [Table, TAlias]], Prettify<TFields & Record<[TAlias] extends [undefined] ? Table : TAlias, GetFieldsFromTable<Table>>>>;

    // Overload 2: Positional syntax with inline alias (e.g., "User u")
    join<const TableInput extends `${AvailableJoins<TSources>}` | `${AvailableJoins<TSources>} ${string}`,
        Table extends AvailableJoins<TSources> = ExtractTableName<TableInput> & AvailableJoins<TSources>,
        TAlias extends string | never = ExtractAlias<TableInput>,
        TJoinCols extends [string, string] = ValidStringTuple<GetUnionOfRelations<MapJoinsToKnownTables<SafeJoins<Table, TSources>, TSources>>>,
        TCol1 extends TJoinCols[0] = never
    >(table: TableInput, field: TCol1, reference: find<TJoinCols, TCol1>):
        _fJoin<[...TSources, [TAlias] extends [never] ? Table : [Table, TAlias]],
            Prettify<TFields & Record<[TAlias] extends [never] ? Table : TAlias, GetFieldsFromTable<Table>>>>;

    // Implementation
    join<const TableInput extends `${AvailableJoins<TSources>}` | `${AvailableJoins<TSources>} ${string}`,
        Table extends AvailableJoins<TSources> = ExtractTableName<TableInput> & AvailableJoins<TSources>,
        //TAlias extends string | never = ExtractAlias<TableInput>,
        TJoinCols extends [string, string] = ValidStringTuple<GetUnionOfRelations<MapJoinsToKnownTables<SafeJoins<Table, TSources>, TSources>>>,
        TCol1 extends TJoinCols[0] = never
    >(
        tableOrOptions: TableInput | {table: TableInput, src: TCol1, on: find<TJoinCols, TCol1>, alias?: string},
        field?: TCol1,
        reference?: find<TJoinCols, TCol1>
    ) {
        let table: string;
        let local: string;
        let remote: string;
        let tableAlias: string | undefined;

        if (typeof tableOrOptions === 'object' && 'table' in tableOrOptions) {
            // Object syntax
            table = tableOrOptions.table.trim();
            local = tableOrOptions.src;
            remote = tableOrOptions.on;
            tableAlias = tableOrOptions.alias?.trim();
        } else {
            // Positional syntax with inline alias (e.g., "User u")
            const parts = tableOrOptions.split(' ');
            table = parts[0]!;
            tableAlias = parts[1]?.trim();
            local = field!;
            remote = reference!;
        }

        return new _fJoin(this.db, {
            ...this.values,
            tables: [...this.values.tables || [], {
                table: table,
                local,
                remote,
                alias: tableAlias
            }]
        });
    }

    // Overload 1: Object syntax
joinUnsafeTypeEnforced<const Table extends AvailableJoins<TSources>,
        TCol1 extends GetColsBaseTable<Table>,
        TCol2 extends GetJoinOnColsType<GetColumnType<Table, TCol1>, [...TSources, Table]>,
        TAlias extends string = never
    >(options: {
        table: Table,
        src: TCol1,
        on: TCol2,
        alias?: TAlias
    }): _fJoin<[...TSources, [TAlias] extends [undefined] ? Table : [Table, TAlias]], Prettify<TFields & Record<[TAlias] extends [undefined] ? Table : TAlias, GetFieldsFromTable<Table>>>>;

    // Overload 2: Positional syntax with inline alias (e.g., "User u2")
    joinUnsafeTypeEnforced<const TableInput extends `${AvailableJoins<TSources>}` | `${AvailableJoins<TSources>} ${string}`,
        Table extends AvailableJoins<TSources> = ExtractTableName<TableInput> & AvailableJoins<TSources>,
        TAlias extends string | never = ExtractAlias<TableInput>,
        TCol1 extends GetColsBaseTable<Table> = GetColsBaseTable<Table>,
        TCol2 extends GetJoinOnColsType<GetColumnType<Table, TCol1>, [...TSources, Table]> =
                      GetJoinOnColsType<GetColumnType<Table, TCol1>, [...TSources, Table]>
    >(table: TableInput, field: TCol1, reference: TCol2): _fJoin<[...TSources, [TAlias] extends [never] ? Table : [Table, TAlias]], Prettify<TFields & Record<[TAlias] extends [undefined] ? Table : TAlias, GetFieldsFromTable<Table>>>>;

    // Implementation
    joinUnsafeTypeEnforced<const TableInput extends `${AvailableJoins<TSources>}` | `${AvailableJoins<TSources>} ${string}`,
        Table extends AvailableJoins<TSources> = ExtractTableName<TableInput> & AvailableJoins<TSources>,
        TCol1 extends GetColsBaseTable<Table> = GetColsBaseTable<Table>,
        TCol2 extends GetJoinOnColsType<GetColumnType<Table, TCol1>, [...TSources, Table]> =
                      GetJoinOnColsType<GetColumnType<Table, TCol1>, [...TSources, Table]>
    >(
        tableOrOptions: TableInput | {table: TableInput, src: TCol1, on: TCol2, alias?: string},
        field?: TCol1,
        reference?: TCol2
    ) {
        //@ts-expect-error call normal join function
        return this.join(tableOrOptions, field, reference) as any;

        /*
                let table: string;
                let local: string;
                let remote: string;
                let tableAlias: string | undefined;

                if (typeof tableOrOptions === 'object' && 'table' in tableOrOptions) {
                    // Object syntax
                    table = tableOrOptions.table;
                    local = `${table}.${tableOrOptions.src}`;
                    remote = tableOrOptions.on;
                    tableAlias = tableOrOptions.alias || tableOrOptions.table;
                } else {
                    // Positional syntax with inline alias (e.g., "User u2")
                    const parts = tableOrOptions.split(' ');
                    table = parts[0]!;
                    tableAlias = parts[1] || table;
                    local = `${table}.${field!}`;
                    remote = reference!;
                }

                return new _fJoin(this.db, {
                    ...this.values,
                    tables: [...this.values.tables || [], {
                        table: table,
                        local,
                        remote,
                        alias: tableAlias
                    }]
                });*/
    }

    // Overload 1: Object syntax
    joinUnsafeIgnoreType<const Table extends AvailableJoins<TSources>,
        TCol1 extends GetColsBaseTable<Table>,
        TCol2 extends GetJoinCols<TSources[number]>,
        TAlias extends string = never
    >(options: {
        table: Table,
        src: TCol1,
        on: TCol2,
        alias?: TAlias
    }): _fJoin<[...TSources, [TAlias] extends [never] ? Table : [Table, TAlias]], TFields & Record<Table, GetFieldsFromTable<Table>>>;

    // Overload 2: Positional syntax with inline alias (e.g., "User u2")
    joinUnsafeIgnoreType<const TableInput extends `${AvailableJoins<TSources>}` | `${AvailableJoins<TSources>} ${string}`,
        Table extends AvailableJoins<TSources> = ExtractTableName<TableInput> & AvailableJoins<TSources>,
        TAlias extends string | never = ExtractAlias<TableInput>,
        TCol1 extends GetColsBaseTable<Table> = GetColsBaseTable<Table>,
        TCol2 extends GetJoinCols<TSources[number]> = GetJoinCols<TSources[number]>
    >(table: TableInput, field: TCol1, reference: TCol2): _fJoin<[...TSources, [TAlias] extends [never] ? Table : [Table, TAlias]], TFields & Record<Table, GetFieldsFromTable<Table>>>;

    // Implementation
    joinUnsafeIgnoreType<const TableInput extends `${AvailableJoins<TSources>}` | `${AvailableJoins<TSources>} ${string}`,
        Table extends AvailableJoins<TSources> = ExtractTableName<TableInput> & AvailableJoins<TSources>,
        TCol1 extends GetColsBaseTable<Table> = GetColsBaseTable<Table>,
        TCol2 extends GetJoinCols<TSources[number]> = GetJoinCols<TSources[number]>
    >(
        tableOrOptions: TableInput | {table: TableInput, src: TCol1, on: TCol2, alias?: string},
        field?: TCol1,
        reference?: TCol2
    ) {
        //@ts-expect-error call normal join function
        return this.join(tableOrOptions, field, reference) as any;
        /*let table: string;
        let local: string;
        let remote: string;
        let tableAlias: string | undefined;

        if (typeof tableOrOptions === 'object' && 'table' in tableOrOptions) {
            // Object syntax
            table = tableOrOptions.table;
            local = `${table}.${tableOrOptions.src}`;
            remote = tableOrOptions.on;
            tableAlias = tableOrOptions.alias || tableOrOptions.table;
        } else {
            // Positional syntax with inline alias (e.g., "User u2")
            const parts = tableOrOptions.split(' ');
            table = parts[0]!;
            tableAlias = parts[1] || table;
            local = `${table}.${field!}`;
            remote = reference!;
        }

        return new _fJoin(this.db, {
            ...this.values,
            tables: [...this.values.tables || [], {
                table: table,
                local,
                remote,
                alias: tableAlias
            }]
        });*/
    }

    // innerJoin(table: TTableSources, col1:string, col2:string){
    //     return new _fJoin<TDBBase>(this.db, {...this.values, tables: [...this.values.tables || [], table]});
    // }
    // leftJoin(table: TTableSources, col1:string, col2:string){
    //     return new _fJoin<TDBBase>(this.db, {...this.values, tables: [...this.values.tables || [], table]});
    // }
    // rightJoin(table: TTableSources, col1:string, col2:string){
    //     return new _fJoin<TDBBase>(this.db, {...this.values, tables: [...this.values.tables || [], table]});
    // }
    // fullJoin(table: TTableSources, col1:string, col2:string){
    //     return new _fJoin<TDBBase>(this.db, {...this.values, tables: [...this.values.tables || [], table]});
    // }
    // crossJoin(table: TTableSources, col1:string, col2:string){
    //     return new _fJoin<TDBBase>(this.db, {...this.values, tables: [...this.values.tables || [], table]});
    // }
    // outerJoin(table: TTableSources, col1:string, col2:string){
    //     return new _fJoin<TDBBase>(this.db, {...this.values, tables: [...this.values.tables || [], table]});
    // }
}


/* ALL
FROM - tables are joined to get the base data.
JOIN
WHERE - the base data is filtered.
GROUP BY - the filtered base data is grouped.
HAVING - the grouped base data is filtered.
SELECT - the final data is returned.
ORDER BY - the final data is sorted.
LIMIT - the returned data is limited to row count.
OFFSET -
 */



export default {
    client: {
        $from<const T extends TTables | `${TTables} ${string}`,
            Table extends TTables = ExtractTableName<T>,
            TAlias extends string | never = ExtractAlias<T>,
        >(table: T) {
            const client = Prisma.getExtensionContext(this) as unknown as PrismaClient;

            const [base, ...aliases] = table.split(' ');


            return new DbSelect(client)
                .from(base!.trim() as Table, (aliases.join().trim() || undefined) as TAlias)
        },
    },
};
