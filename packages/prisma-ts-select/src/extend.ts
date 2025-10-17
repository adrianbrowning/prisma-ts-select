import {Prisma} from "@prisma/client/extension";
import type {PrismaClient} from "@prisma/client";
import {match, P} from "ts-pattern";

const DB: DBType = {} as const satisfies DBType;

type TDB = typeof DB;

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

type IsNullable<str extends string> = str extends `?${string}` ? null : never;


export type RemoveNullChar<str extends string> = str extends `?${infer s}` ? s : str;

export type DBType = Record<string, {
    fields: Record<string, string>;
    relations: Record<string, Record<string, Array<string>>>
}>;

type Filter<a, b> = a extends b ? a : never;

type IsString<T> = T extends string ? T : never;


type ValidSelect<Tables extends TArrSources> =
    |"*"
    | GetOtherColumns<Tables>
    | GetTableStar<Tables>;// | GetColsFromTable<Tables[number]>; // TODO

type GetOtherColumns<Tables extends TArrSources> = Tables extends [infer T extends TTableSources, ...Array<TTableSources>]
    ? GetColsBaseTable<T> | GetJoinCols<Tables[number]>
    : never

type GetTableStar<Tables extends TArrSources> = Tables extends [infer T extends TTableSources, ...Array<TTableSources>]
    ? T extends string
     ? `${T}.*` | GetTableStarJoined<Tables[number]>
      : `${T[1]}.*` | GetTableStarJoined<Tables[number]>
    : never

type GetTableStarJoined<T extends TTableSources> = T extends string ? `${T}.*`
    : `${T[1]}.*`

// Helper type to extract column type for aliasing
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
            Record<TRT[0] extends [string] ? TRT[0][0] : TRT[0][1], GetFieldsFromTable<TDBBase>>>(this.db, {
            baseTable,
            baseTableAlias: alias,
            selects: []
        })
    }

}

type ClauseType = Array<string | WhereCriteria<TArrSources, Record<string, any>>>;

type Values = {
    baseTable: TTables,
    baseTableAlias?: string;
    selectDistinct?: true;
    selects: Array<string>;
    tables?: Array<{ table: TTables, local: string, remote: string, alias?: string }>;
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

        return [
            this.values.selects.length === 0
                ? ""
                : ("SELECT " +
                    (this.values.selectDistinct === true
                        ? "DISTINCT "
                        : "")
                    + this.values.selects.join(', ')),
            `FROM ${this.values.baseTable}`,
            this.values.tables?.map(({
                                         table,
                                         local,
                                         remote
                                     }) => `JOIN ${table} ON ${local} = ${remote}`).join(formatted ? "\n" : " ") ?? "",
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
/**
 * Field - call from select * | Table.* | Table.col | col
 * TSources - ["Table", ['Table2', 'alias']]
 * TFields - Record<Table, Record<col, type>>
 */
type MergeItems<Field extends string, TSources extends TArrSources,
    TFields extends TFieldsType,
    IncTName extends boolean = false> =
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

        : Field extends `${infer T extends string}.${infer F extends string}`
            ? Record<`${T}.${F}`, Pick<TFields[T], F>[F] >
                : Field extends string
                    ? Pick<TFields[TSources[0] extends string
                      ? TSources[0]
                      : TSources[0][1]], Field>
                    : never;

type IterateTables<Tables extends Array<TTableSources>, TFields extends TFieldsType, IncTName extends boolean, acc extends Record<string, any> = {}> =
    Tables extends [infer T extends TTableSources, ...infer Rest extends Array<TTableSources>]
        ? [IncTName] extends [false]
            ? IterateTables<Rest, TFields, IncTName, acc & TFields[T extends string ? T : T[1]]>
            : IterateTables<Rest, TFields, IncTName, acc & IterateTablesFromFields<T, TFields[T extends string ? T : T[1]], IncTName>>
        : acc;

type GenName<T extends string, F extends unknown, IncName extends boolean> = F extends string
    ? [IncName] extends [false]
        ? F
        : `${T}.${F}` : never;

type IterateTablesFromFields<Table extends TTableSources, TFields extends Record<string, string>, IncTName extends boolean> = {
    [f in keyof TFields as GenName<Table extends string ? Table : `Come back to 6`, f, IncTName>]: TFields[f]
    // (f extends string
    //     ? [IncTName] extends [false]
    //         ? Record<f, TFields[f]>
    //         : Record<`${Table}.${f}`, TFields[f]> : never)
};


class _fSelect<TSources extends TArrSources, TFields extends TFieldsType, TSelectRT extends Record<string, any> = {}> extends _fOrderBy<TSources, TFields, TSelectRT> {
    select<TSelect extends ValidSelect<TSources>, TAlias extends string = never>(
        select: TSelect,
        alias?: TAlias
    ): [TAlias] extends [never]
        ? _fSelect<TSources, TFields, Prettify<TSelectRT & MergeItems<TSelect, TSources, TFields>>>
        : _fSelect<TSources, TFields, Prettify<TSelectRT & Record<TAlias, ExtractColumnType<TSelect, TSources, TFields>>>> {


        // Check if select is "Table.*" pattern
        const tableStarMatch = select.match(/^(\w+)\.\*$/);
        if (tableStarMatch) {
            const tableName = tableStarMatch[1];
            // Expand Table.* to all columns from that table
            const tableFields = DB[tableName as keyof typeof DB];
            if (!tableFields) {
                throw new Error(`Table "${tableName}" not found in database schema`);
            }

            const hasMultipleTables = (this.values.tables && this.values.tables.length > 0) || false;

            const expandedSelects = Object.keys(tableFields.fields).map((field) => {
                if (hasMultipleTables) {
                    return `${tableName}.${field} AS \`${tableName}.${field}\``;
                }
                return `${tableName}.${field}`;
            });

            return new _fSelect<TSources, TFields, Prettify<TSelectRT & MergeItems<TSelect, TSources, TFields>>>(this.db, {
                ...this.values,
                selects: [...this.values.selects, ...expandedSelects]
            }) as any;
        }

        // Check if alias is provided
        if (alias !== undefined) {
            return new _fSelect(this.db, {
                ...this.values,
                selects: [...this.values.selects, `${select} AS \`${alias}\``]
            }) as any;
        }

        return new _fSelect<TSources, TFields, Prettify<TSelectRT & MergeItems<TSelect, TSources, TFields>>>(this.db, {
            ...this.values,
            selects: [...this.values.selects, select]
        }) as any;
    }
}

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
            if (values.tables && values.tables.length > 0) {
                return [values.baseTable, ...values.tables.map(t => t.table)].reduce<Array<string>>((acc, table): Array<string> => {
                    //TODO review `!`
                    return acc.concat(Object.keys(DB[table]!.fields).map((field) => `${table}.${field} AS \`${table}.${field}\``))
                }, []);
            }
            //TODO review `!`
            return Object.keys(DB[values.baseTable]!.fields);
        }(this.values))

        return new _fOrderBy<TSources, TFields, MergeItems<"*", TSources, TFields, TableCount extends 1 ? false : true>>(this.db, {
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


type OptionalRecord<K extends PropertyKey, V> = { [key in K]?: V; }
type OptionalObject<K extends Record<PropertyKey, unknown>> = { [key in keyof K]?: K[key]; }

type COND_NUMERIC<key extends PropertyKey, keyType> =
    | OptionalRecord<key, keyType>
    | OptionalRecord<key, { op: 'IN' | 'NOT IN'; values: Array<keyType> }>
    | OptionalRecord<key, { op: 'BETWEEN'; values: [keyType, keyType] }>
    | OptionalRecord<key, { op: '>' | '>=' | '<' | '<=' | '!='; value: keyType }>;

type COND_STRING<key extends PropertyKey> =
    | OptionalRecord<key, string>
    | OptionalRecord<key, { op: 'IN' | 'NOT IN'; values: Array<string> }>
    | OptionalRecord<key, { op: 'LIKE' | 'NOT LIKE'; value: string }>
    | OptionalRecord<key, { op: '!='; value: string }>;

type COND_DATETIME<key extends PropertyKey, keyType> =
    | OptionalRecord<key, keyType>
    | OptionalRecord<key, { op: 'IN' | 'NOT IN'; values: Array<keyType> }>
    | OptionalRecord<key, { op: 'BETWEEN'; values: [keyType, keyType] }>
    | OptionalRecord<key, { op: '>' | '>=' | '<' | '<=' | '!='; value: keyType }>;

type COND_BOOLEAN<key extends PropertyKey, keyType> =
    | OptionalRecord<key, keyType>
    | OptionalRecord<key, { op: '!='; value: keyType }>;

type COND_NULL<key extends PropertyKey, keyType> = keyType extends null ? OptionalRecord<key, {
    op: 'IS NULL' | 'IS NOT NULL'
}> : never;


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

type TableFieldType<Table extends string, Fields extends Record<string, any>> = {
    [f in keyof Fields as CombineToString<f, Table>]: Fields[f];
}

type LogicalOperator = '$AND' | '$OR' | '$NOT' | "$NOR";

type WhereCriteria<
    T extends TArrSources,
    TFields extends TFieldsType,
    F = WhereCriteria_Fields<T, TFields>
> = F & {
    [k in LogicalOperator]?: [WhereCriteria<T, TFields, F>, ...Array<WhereCriteria<T, TFields, F>>];
};

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


type OnlyNull<T, R> = T extends null ? R : never;

type FindColsWithNull<TFields extends TFieldsType> = Prettify<{
    [Table in keyof TFields]: {
        [Field in keyof TFields[Table]]: OnlyNull<TFields[Table][Field], CombineToString<Field, Table>>
    }[keyof TFields[Table]]
}[keyof TFields]>

type NO_START_WITH_WHERE<RAW extends string> = Uppercase<TRIM<RAW>> extends `WHERE ${string}` ? "Please do not start with `WHERE`" : RAW;

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


type GetFieldsFromTable<TDBBase extends TTableSources> = Extract<DATABASE, { table: TDBBase extends string ? TDBBase : TDBBase[0] }>["fields"];
type GetColsBaseTable<TDBBase extends TTableSources> = TDBBase extends string
    ? keyof GetFieldsFromTable<TDBBase>
    : keyof GetFieldsFromTable<TDBBase[0]>;
type GetJoinCols<TDBBase extends TTableSources> = TDBBase extends string
    ? IterateFields<TDBBase, IsString<GetColsBaseTable<TDBBase>>>
    : IterateFields<TDBBase[1], IsString<GetColsBaseTable<TDBBase[0]>>>;
type IterateFields<TDBBase extends TTableSources, F extends string> = `${TDBBase extends string ? TDBBase : TDBBase[1]}.${F}`;

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

type GetRealTableNames<Tables extends TTableSources> = Tables extends any
    ? Tables extends string
        ? Tables
        : Tables[0]
    : never;

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
export type SafeJoins<TNewJoin extends TTables,
    TJoins extends TArrSources,
    TRelations = Relations<TNewJoin>
> = { [k in keyof TRelations as Filter<k,GetRealTableNames<TJoins[number]>>]: TRelations[k] };

type ToUnion<TJoins extends TArrSources> = TJoins[number];

export type MapJoinsToKnownTables<TSafeJoins extends Record<string, unknown>, TJoins extends TArrSources> = {
    [k in ToUnion<TJoins> as GetAliasTableNames<k> ]: TSafeJoins[GetRealTableNames<k>]
};

type CombineToString<A extends unknown, T extends unknown> = A extends string
    ? T extends string
        ? `${T}.${A}`
        : never
    : never;

/**
 * @example
 *  //returns ["userId", "User.id"] | ["postId", "Posts.id"]
 *  GetUnionOfRelations<SafeJoins<"LikedPosts", ["User", "Posts"]>>;
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

type ValidStringTuple<T> = T extends [string, string] ? T : never;

type find<TJoinCols extends [string, string], toFind extends string> =
    TJoinCols extends [infer col1, infer col2]
        ? col1 extends toFind
            ? col2
            : never
        : never;

// type CleanUpFromNames<TFromTable extends TTableSources, TCols extends string> = TCols extends `${TFromTable}.${infer Col}` ? Col : TCols;

type RemoveNullable<T extends string> = T extends `?${infer R}` ? R : T;

type SwapKeysAndValues<T extends Record<string, any>> = {
    [K in keyof T as RemoveNullable<T[K]>]: K;
};


type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

// Type helpers for parsing inline table aliases (e.g., "User u")
type ExtractTableName<T extends string> =
    T extends `${infer Table} ${string}` ? Table : T;

type ExtractAlias<T extends string> =
    T extends `${string} ${infer Alias}` ? Alias : never;


type FieldsByTableByType = Prettify<{
    [Table in TTables]: SwapKeysAndValues<_db[Table]["fields"]>;
}>
type GetTypes = {
    [Type in keyof FieldsByTableByType as keyof FieldsByTableByType[Type]]: {};
};
type FieldsByTypeByTable = Prettify<{
    [Type in keyof GetTypes]: {
        [Table in keyof FieldsByTableByType as [FieldsByTableByType[Table][Filter<keyof FieldsByTableByType[Table], Type>]] extends [never] ? never : Table]: FieldsByTableByType[Table][Filter<keyof FieldsByTableByType[Table], Type>]
    };
}>;
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

type GetJoinOnColsType<Type extends string, TSources extends Array<TTableSources>> =
// GetColsFromTableType<TDBBase, Type>
    GetJoinColsType<TSources[number], Type>;

type GetColsFromTableType<TDBBase extends TTableSources, Type extends string> =
//@ts-expect-error Try and come back to
    FieldsByTypeByTable[Loop<keyof FieldsByTypeByTable, Type>][TDBBase];

type Loop<Keys extends string, Type extends string> = Keys extends Type ? Type : never;


type GetJoinColsType<TDBBase extends TTableSources, Type extends string> = IterateFields<TDBBase, IsString<GetColsFromTableType<TDBBase, Type>>>;//, Type];

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
    }): _fJoin<[...TSources, [TAlias] extends [undefined] ? Table : [Table, TAlias]], Prettify<TFields & Record<Table, GetFieldsFromTable<Table>>>>;

    // Overload 2: Positional syntax with inline alias (e.g., "User u")
    join<const TableInput extends `${AvailableJoins<TSources>}` | `${AvailableJoins<TSources>} ${string}`,
        Table extends AvailableJoins<TSources> = ExtractTableName<TableInput> & AvailableJoins<TSources>,
        TAlias extends string | never = ExtractAlias<TableInput>,
        TJoinCols extends [string, string] = ValidStringTuple<GetUnionOfRelations<MapJoinsToKnownTables<SafeJoins<Table, TSources>, TSources>>>,
        TCol1 extends TJoinCols[0] = never
    >(table: TableInput, field: TCol1, reference: find<TJoinCols, TCol1>): _fJoin<[...TSources, [TAlias] extends [never] ? Table : [Table, TAlias]], Prettify<TFields & Record<Table, GetFieldsFromTable<Table>>>>;

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
            table = tableOrOptions.table;
            local = tableOrOptions.src;
            remote = tableOrOptions.on;
            tableAlias = tableOrOptions.alias || tableOrOptions.table;
        } else {
            // Positional syntax with inline alias (e.g., "User u")
            const parts = tableOrOptions.split(' ');
            table = parts[0]!;
            tableAlias = parts[1] || table;
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

    joinUnsafeTypeEnforced<const Table extends AvailableJoins<TSources>,
        TCol1 extends GetColsBaseTable<Table>,
        TCol2 extends GetJoinOnColsType<
            //@-ts-expect-error TODO come back too
            GetColumnType<Table, TCol1>
            //GetColumnType<Table, Prettify<TFields & Record<Table, GetFieldsFromTable<Table>>>, TCol1>
            , [...TSources, Table]>,
        TAlias extends string = never
    >(table: Table, field: TCol1, reference: TCol2, alias?: TAlias) {
        // type NewUseAliases = TUseAliases extends true ? true : (TAlias extends string ? true : false);
        return new _fJoin<[...TSources, [TAlias] extends [undefined] ? Table : [Table, TAlias]], TFields & Record<Table, GetFieldsFromTable<Table>>>(this.db, {
            ...this.values,
            tables: [...this.values.tables || [], {
                table: table,
                local: `${String(table)}.${String(field)}`,
                remote: reference,
                alias
            }]
        });
    }

    joinUnsafeIgnoreType<const Table extends AvailableJoins<TSources>,
        TCol2 extends GetJoinCols<TSources[number]>,
        TAlias extends string = never
    >(table: Table, field: GetColsBaseTable<Table>, reference: TCol2, alias?: TAlias) {
        // type NewUseAliases = TUseAliases extends true ? true : (TAlias extends string ? true : false);
        return new _fJoin<[...TSources, [TAlias] extends [undefined] ? Table : [Table, TAlias]], TFields & Record<Table, GetFieldsFromTable<Table>>>(this.db, {
            ...this.values,
            tables: [...this.values.tables || [], {
                table: table,
                local: `${String(table)}.${String(field)}`,
                remote: reference,
                alias
            }]
        });
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
                .from(base as Table, (aliases.join() || undefined) as TAlias)
        },
    },
};
