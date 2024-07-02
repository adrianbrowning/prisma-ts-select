import type {PrismaClient} from "@prisma/client";
import {Prisma} from "@prisma/client/extension";

const DB = {
    "User": {
        fields: {
            id: "number",
            email: "string",
            name: "?string"
        },
        //safeJoin
        relations: {
            "Post": {id: ["authorId", "lastModifiedBy"]},//[["id", "authorId"], ["id", "lastModifiedBy"]]
            "LikedPosts": {id: ["userId"]}
        },
    },
    "Post": {
        fields: {
            id: "number",
            title: "string",
            content: "?string",
            published: "boolean",
            authorId: "number",
            lastModifiedById: "number",
        },
        //safeJoin
        relations: {
            "User": {
                "authorId": ["id"],
                "lastModifiedBy": ["id"]
            },
            "PostsImages": {"id": ["postId"]},
            "LikedPosts": {"id": ["postId"]},
        },
    },
    "PostsImages": {
        fields: {
            id: "number",
            url: "string",
            postId: "number",
        },
        //safeJoin
        relations: {
            "Post": {"postId": ["id"]}
        },
    },
    "LikedPosts": {
        fields: {
            id: "number",
            postId: "number",
            userId: "number",
        },
        relations: {
            "Post": {"postId": ["id"]},
            "User": {"userId": ["id"]}
        }
    }
} as const satisfies Record<string, {
    fields: Record<string, string>;
    relations: Record<string, Record<string, Array<string>>>
}>;

type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };

type _db = DeepWriteable<typeof DB>;

type DATABASE = {
    [k in keyof _db]: {
        table: k,
        fields: {
            [f in keyof _db[k]["fields"]]: StrTypeToTSType<_db[k]["fields"][f]>
        },
        relations: _db[k]["relations"]
    }
}[keyof typeof DB];


type Filter<a, b> = a extends b ? a : never;
type StrTypeToTSType<str> = str extends string ? (GetTSType<RemoveNullChar<str>> | IsNullable<str>) : never;
type RemoveNullChar<str extends string> = str extends `?${infer s}` ? s : str;
type IsNullable<str extends string> = str extends `?${string}` ? null : never;
type IsString <T> = T extends string ? T : never;
type GetTSType<str extends string> = str extends `string` ? string
    : str extends `number` ? number
        : str extends `boolean` ? boolean
            : str extends `date` ? Date
                : "Unknown type";


type ValidSelect = "*" ; // TODO

type TTables = DATABASE["table"];


export class DbSelect {

    constructor(private db: PrismaClient) {
    }

    from<TDBBase extends TTables>(database: TDBBase) {
        return new _fJoin<TDBBase>(this.db, {database, selects: []})
    }

}

type Values = {
    database: TTables,
    selectDistinct?: true;
    selects: Array<string>;
    tables?: Array<{table: TTables, local: string, remote: string}>;
    limit?: number;
    offset?: number;
    where?: Array<{ col: string; operator: string; value: unknown }>;
    having?: Array<{ col: string; operator: string; value: unknown }>;
    groupBy?: Array<string>;
    orderBy?: Array<`${string}} ${"DESC" | "ASC"}`>;
};

/*
run
 */
class _fRun<TDBBase extends TTables, TJoins extends Array<TTables> = [], TSelectRT extends Record<string, any> = {}> {
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
    getTables(){
        return {} as [TDBBase, ...TJoins];
    }
    getSQL() {

        return [
            "select " + (this.values.selectDistinct === true ? "DISTINCT " : "") + this.values.selects.join(', '),
            `from ${this.values.database}`,
            this.values.tables?.map(({table, local, remote}) => `JOIN ${table} ON ${local} = ${remote}`).join(" ") ?? "",
            this.values.limit === undefined ? "" : `limit ${this.values.limit}`,
            this.values.offset === undefined ? "" : `offset ${this.values.offset}`].join(" ").trim()+ ";";
    }
}

/*
OFFSET -
run
*/

class _fOffset<TDBBase extends TTables, TJoins extends Array<TTables> = [],TSelectRT extends Record<string, any>={}> extends _fRun<TDBBase, TJoins, TSelectRT> {
    offset(offset: number) {
        return new _fRun<TDBBase,TJoins, TSelectRT>(this.db, {...this.values, offset});
    }
}

/*
LIMIT - the returned data is limited to row count.
OFFSET -
run
*/

class _fLimit<TDBBase extends TTables, TJoins extends Array<TTables> = [], TSelectRT extends Record<string, any> = {}> extends _fOffset<TDBBase,TJoins, TSelectRT> {
    limit(limit: number) {
        return new _fRun<TDBBase, TJoins, TSelectRT>(this.db, {...this.values, limit});
    }
}


/*
ORDER BY - the final data is sorted.
LIMIT - the returned data is limited to row count.
OFFSET -
run
*/
class _fOrderBy<TDBBase extends TTables, TJoins extends Array<TTables> = [], TSelectRT extends Record<string, any> = {}> extends _fLimit<TDBBase, TJoins, TSelectRT> {
    orderBy(orderBy: Array<`${string}} ${"DESC" | "ASC"}`>) {
        return new _fLimit<TDBBase, TJoins, TSelectRT>(this.db, {...this.values, orderBy});
    }
}


/*
SELECT - the final data is returned.
ORDER BY - the final data is sorted.
LIMIT - the returned data is limited to row count.
OFFSET -
run
*/

// type MergeItems<T, Tables extends Array<TTables>, IncTName extends boolean = false> = T extends "*" ? Prettify<IterateTables<Tables, IncTName>> : never;
// type IterateTables<Tables extends Array<TTables>, IncTName extends boolean, acc extends Record<string, any> = {}> =
//     Tables extends [infer T extends TTables, ...infer Rest extends Array<TTables>]
//     ? IterateTables<Rest, IncTName, acc & IncTName extends false
//             ? Extract<DATABASE, { table: T }>["fields"]
//             : never/*{
//                [f in keyof Extract<DATABASE, { table: T }>["fields"] as `${T}.${IsString<f>}`]: Extract<DATABASE, { table: T }>["fields"][f]
//                 }*/
//             >
//     : acc;


type MergeItems<T, Tables extends Array<TTables>, IncTName extends boolean = false> = T extends "*" ? Prettify<IterateTables<Tables, IncTName>> : never;
type IterateTables<Tables extends Array<TTables>, IncTName extends boolean, acc extends Record<string, any> = {}> =
    Tables extends [infer T extends TTables, ...infer Rest extends Array<TTables>]
        ? [IncTName] extends [false]
            ? IterateTables<Rest, IncTName, acc &  GetFieldsFromTable<T>>
            : IterateTables<Rest, IncTName, acc &  IterateFieldsOfTable<T>>
        : acc;

type IterateFieldsOfTable<T extends TTables, Fields = Extract<DATABASE, { table: T }>["fields"]> = {
    [f in keyof Fields as `${T}.${IsString<f>}`]: Fields[f]
}

class _fSelect<TDBBase extends TTables, TJoins extends Array<TTables> = [], TSelectRT extends Record<string, any> = {}> extends _fOrderBy<TDBBase,TJoins,TSelectRT> {
    select<TSelect extends ValidSelect>(select: TSelect) {
        /*TODO
            if "", omit any previous with same name, add new ones
        */

        return new _fSelect<TDBBase,TJoins,TSelectRT & MergeItems<TSelect,[TDBBase, ...TJoins]>>(this.db, {...this.values, selects:  [...this.values.selects, select] });
    }
}

class _fSelectDistinct<TDBBase extends TTables, TJoins extends Array<TTables> = [], TSelectRT extends Record<string, any>= {}> extends _fSelect<TDBBase,TJoins,TSelectRT> {
    selectDistinct() {
        return new _fSelect<TDBBase, TJoins,TSelectRT>(this.db, {...this.values, selectDistinct: true});
    }
    selectAll() {
        //TODO
        //Need to loop through DATABASE object
        //if 1 table, no prefix
        // if more prefix with table name


        const selects = (function(values: Values){
            if (values.tables && values.tables.length > 0) {
                return [values.database, ...values.tables.map(t => t.table)].reduce<Array<string>>((acc, table): Array<string> => {
                    return acc.concat(Object.keys(DB[table].fields).map((field) => `${table}.${field} AS \`${table}.${field}\``))
                }, []);
            }

            return Object.keys(DB[values.database].fields);
        }(this.values))

        return new _fOrderBy<TDBBase,TJoins,MergeItems<"*", [TDBBase, ...TJoins] ,TJoins extends [TTables,...Array<TTables> ] ? true: false>>(this.db, {...this.values, selects });
    }
}


/*
HAVING - the grouped base data is filtered.
SELECT - the final data is returned.
ORDER BY - the final data is sorted.
LIMIT - the returned data is limited to row count.
OFFSET -
*/

class _fHaving<TDBBase extends TTables, TJoins extends Array<TTables> = []> extends _fSelectDistinct<TDBBase,TJoins> {
    having(col: string, operator: string, value: unknown) {
        return new _fHaving<TDBBase,TJoins>(this.db, {
            ...this.values,
            having: [...this.values.having || [], {col, operator, value}]
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

class _fGroupBy<TDBBase extends TTables, TJoins extends Array<TTables> = []> extends _fHaving<TDBBase,TJoins> {

    groupBy(groupBy: Array<string>) {
        return new _fHaving<TDBBase,TJoins>(this.db, {...this.values, groupBy: groupBy});
    }

    /**
     * @deprecated Please call groupBy first
     */
    //@ts-expect-error we want this to error
    override having() {
        throw new Error("Having can only be used after groupBy has been called first.")
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

class _fWhere<TDBBase extends TTables, TJoins extends Array<TTables> = []> extends _fGroupBy<TDBBase, TJoins> {

    //TODO
    // Not null - remove null from type
    // - column_name IS NOT NULL
    //
    // TODO
    //  Is NULL - remove non-null type


    where(col: string, operator: string, value: unknown) {
        return new _fWhere<TDBBase, TJoins>(this.db, {
            ...this.values,
            where: [...this.values.where || [], {col, operator, value}],
        });
    }
}

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


type GetFieldsFromTable<TDBBase extends TTables> =  Extract<DATABASE, { table: TDBBase }>["fields"];
type GetColsFromTable<TDBBase extends TTables> = keyof GetFieldsFromTable<TDBBase>;
type GetJoinCols<TDBBase extends TTables> = TDBBase extends any ? IterateFields<TDBBase, IsString<GetColsFromTable<TDBBase>>> : never;
type IterateFields<TDBBase extends TTables, F extends string> = `${TDBBase}.${F}`;

type Relations<Table extends TTables> = Extract<DATABASE, { table: Table }>["relations"];

export type SafeJoins<TNewJoin extends TTables, TJoins extends Array<TTables>, TRelations = Relations<TNewJoin>> =
    {[k in keyof TRelations as Filter<k,TJoins[number]>]: TRelations[k]};

type ArrayToString<A extends string, T extends string> = A extends string ? `${T}.${A}` : never;

/**
 * @example
 *  //returns ["userId", "User.id"] | ["postId", "Posts.id"]
 *  GetUnionOfRelations<SafeJoins<"LikedPosts", ["User", "Posts"]>>;
 */
export type GetUnionOfRelations<TSafe> = {
    [ T in keyof TSafe] : {
        [TLocal in keyof TSafe[T]]:
        [
            TLocal,
            T extends string ? TSafe[T][TLocal] extends Array<string> ? ArrayToString<TSafe[T][TLocal][number], T> : never : never
    ]
    }[keyof TSafe[T]];
}[keyof TSafe];

type ValidStringTuple<T> = T extends [string, string] ? T : never;

type find<T extends [string, string], toFind extends string> = T extends [infer col1, infer col2] ? col1 extends toFind ? col2 : never : never;

// type CleanUpFromNames<TFromTable extends TTables, TCols extends string> = TCols extends `${TFromTable}.${infer Col}` ? Col : TCols;

type RemoveNullable<T extends string> = T extends `?${infer R}` ? R : T;

type SwapKeysAndValues<T extends Record<string, any>> = {
    [K in keyof T as RemoveNullable<T[K]>]: K;
};


type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

type FieldsByTableByType = Prettify<{
    [Table in  TTables] : SwapKeysAndValues<_db[Table]["fields"]>;
}>

type GetTypes = {
    [Type in keyof FieldsByTableByType as keyof FieldsByTableByType[Type]]: {
    };
};

type FieldsByTypeByTable = Prettify<{
    [Type in keyof GetTypes]: {
        [Table in keyof FieldsByTableByType as [FieldsByTableByType[Table][Filter<keyof FieldsByTableByType[Table], Type>]] extends [never] ? never : Table]:  FieldsByTableByType[Table][Filter<keyof FieldsByTableByType[Table], Type>]
    };
}>;




type GetColumnType<Table extends TTables, Col1 extends keyof _db[Table]["fields"]> = RemoveNullChar<IsString<_db[Table]["fields"][Col1]>>

type GetJoinOnColsType<Type extends string, TDBBase extends TTables, TJoins extends Array<TTables>> =
    // GetColsFromTableType<TDBBase, Type>
    GetJoinColsType<[TDBBase, ...TJoins][number],Type>;

type GetColsFromTableType<TDBBase extends TTables, Type extends string> =
    //@ts-expect-error Try and come back to
    FieldsByTypeByTable[Loop<keyof FieldsByTypeByTable, Type>][TDBBase];
type Loop<Keys extends string, Type extends string>=  Keys extends Type ? Type : never;


type GetJoinColsType<TDBBase extends TTables, Type extends string> = IterateFields<TDBBase, IsString<GetColsFromTableType<TDBBase, Type>>>;//, Type];


class _fJoin<TDBBase extends TTables, TJoins extends Array<TTables> = []> extends _fWhere<TDBBase, TJoins> {

    join<Table extends TTables,
        TJoinCols extends [string, string] = ValidStringTuple<GetUnionOfRelations<SafeJoins<Table, [TDBBase, ...TJoins]>>>,
        TCol1 extends TJoinCols[0] = never
    >(table: Table, field: TCol1, reference: find<TJoinCols, TCol1> ) { //CleanUpFromNames<TDBBase, find<TJoinCols, TCol1>>
        return new _fJoin<TDBBase, [...TJoins, Table]>(this.db, {
            ...this.values,
            tables: [...this.values.tables || [], {table, local: field, remote: reference}]
        });
    }

    joinUnsafe<Table extends TTables,
        TCol1 extends GetColsFromTable<Table>,
        TCol2 extends  GetJoinOnColsType<
            //@ts-expect-error TODO come back too
            GetColumnType<Table, TCol1>
            , TDBBase, [...TJoins, Table]>
        >(table: Table, field: TCol1, reference: TCol2) {
        return new _fJoin<TDBBase, [...TJoins, Table]>(this.db, {
            ...this.values,
            tables: [...this.values.tables || [], {table, local: `${table}.${String(field)}`, remote: reference} ]
        });
    }

    joinUnsafeAllFields<Table extends TTables,
        TCol2 extends GetJoinCols< [...TJoins, TDBBase][number]> >(table: Table, field: GetColsFromTable<Table>, reference: TCol2) {
        return new _fJoin<TDBBase, [...TJoins, Table]>(this.db, {
            ...this.values,
            tables: [...this.values.tables || [], {table, local: `${table}.${String(field)}`, remote: reference} ]
        });
    }

    // innerJoin(table: TTables, col1:string, col2:string){
    //     return new _fJoin<TDBBase>(this.db, {...this.values, tables: [...this.values.tables || [], table]});
    // }
    // leftJoin(table: TTables, col1:string, col2:string){
    //     return new _fJoin<TDBBase>(this.db, {...this.values, tables: [...this.values.tables || [], table]});
    // }
    // rightJoin(table: TTables, col1:string, col2:string){
    //     return new _fJoin<TDBBase>(this.db, {...this.values, tables: [...this.values.tables || [], table]});
    // }
    // fullJoin(table: TTables, col1:string, col2:string){
    //     return new _fJoin<TDBBase>(this.db, {...this.values, tables: [...this.values.tables || [], table]});
    // }
    // crossJoin(table: TTables, col1:string, col2:string){
    //     return new _fJoin<TDBBase>(this.db, {...this.values, tables: [...this.values.tables || [], table]});
    // }
    // outerJoin(table: TTables, col1:string, col2:string){
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


















