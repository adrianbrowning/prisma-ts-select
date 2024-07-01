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
            lastModifiedBy: "number",
        },
        //safeJoin
        relations: {
            "User": {
                "authorId": ["id"],
                "lastModifiedBy": ["id"]
            },
            "PostsImages": {"id": ["postId"]}
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


type ValidSelect = "*" | Array<string>; // TODO

type TTables = DATABASE["table"];


export class DbSelect {

    constructor(private db: PrismaClient) {
    }

    from<TDBBase extends TTables>(database: TDBBase) {
        return new _fJoin<TDBBase>(this.db, {database, selects: []})
    }

}

/*
run
 */
class _fRun<TDBBase extends TTables> {
    constructor(protected db: PrismaClient,
                protected values: {
                    database: string,
                    selects: Array<string>;
                    tables?: Array<string>;
                    limit?: number;
                    offset?: number;
                    where?: Array<{ col: string; operator: string; value: unknown }>;
                    having?: Array<{ col: string; operator: string; value: unknown }>;
                    groupBy?: Array<string>;
                    orderBy?: Array<`${string}} ${"DESC" | "ASC"}`>;
                }) {
        this.values.limit = typeof this.values.limit === "number" ? this.values.limit : undefined;
        this.values.offset = typeof this.values.offset === "number" ? this.values.offset : undefined;
    }

    run() {
        return this.db.$queryRawUnsafe(
            this.getSQL()
        ) as unknown as Prisma.PrismaPromise<Array<Extract<DATABASE, { table: TDBBase }>["fields"]>>;
    }
    getSQL() {
        return [
            `select ${this.values.selects.join(', ')}`,
            `from ${this.values.database}`,
            this.values.tables?.join(" ") ?? "",
            this.values.limit === undefined ? "" : `limit ${this.values.limit}`,
            this.values.offset === undefined ? "" : `offset ${this.values.offset}`].join(" ").trim()+ ";";
    }
}

/*
OFFSET -
run
*/

class _fOffset<TDBBase extends TTables> extends _fRun<TDBBase> {
    offset(offset: number) {
        return new _fRun<TDBBase>(this.db, {...this.values, offset});
    }
}

/*
LIMIT - the returned data is limited to row count.
OFFSET -
run
*/

class _fLimit<TDBBase extends TTables> extends _fOffset<TDBBase> {
    limit(limit: number) {
        return new _fRun(this.db, {...this.values, limit});
    }
}


/*
ORDER BY - the final data is sorted.
LIMIT - the returned data is limited to row count.
OFFSET -
run
*/
class _fOrderBy<TDBBase extends TTables> extends _fLimit<TDBBase> {
    orderBy(orderBy: Array<`${string}} ${"DESC" | "ASC"}`>) {
        return new _fLimit<TDBBase>(this.db, {...this.values, orderBy});
    }
}


/*
SELECT - the final data is returned.
ORDER BY - the final data is sorted.
LIMIT - the returned data is limited to row count.
OFFSET -
run
*/

class _fSelect<TDBBase extends TTables> extends _fOrderBy<TDBBase> {
    select(select: ValidSelect) {
        return new _fOrderBy<TDBBase>(this.db, {...this.values, selects: Array.isArray(select) ? select : [select]});
    }
}

class _fSelectDistinct<TDBBase extends TTables> extends _fSelect<TDBBase> {
    selectDistinct() {
        return new _fSelect<TDBBase>(this.db, {...this.values, selects: ["DISTINCT"]});
    }
}


/*
HAVING - the grouped base data is filtered.
SELECT - the final data is returned.
ORDER BY - the final data is sorted.
LIMIT - the returned data is limited to row count.
OFFSET -
*/

class _fHaving<TDBBase extends TTables> extends _fSelectDistinct<TDBBase> {
    having(col: string, operator: string, value: unknown) {
        return new _fHaving<TDBBase>(this.db, {
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

class _fGroupBy<TDBBase extends TTables> extends _fHaving<TDBBase> {

    groupBy(groupBy: Array<string>) {
        return new _fHaving<TDBBase>(this.db, {...this.values, groupBy: groupBy});
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

class _fWhere<TDBBase extends TTables> extends _fGroupBy<TDBBase> {

    //TODO
    // Not null - remove null from type
    // - column_name IS NOT NULL
    //
    // TODO
    //  Is NULL - remove non-null type


    where(col: string, operator: string, value: unknown) {
        return new _fWhere<TDBBase>(this.db, {
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


type GetColsFromTable<TDBBase extends TTables> = keyof Extract<DATABASE, { table: TDBBase }>["fields"];
type GetJoinCols<TDBBase extends TTables> = TDBBase extends any ? IterateFields<TDBBase, IsString<GetColsFromTable<TDBBase>>> : never;
type IterateFields<TDBBase extends TTables, F extends string> = `${TDBBase}.${F}`;

type Relations<Table extends TTables> = Extract<DATABASE, { table: Table }>["relations"];

type SafeJoins<TNewJoin extends TTables, TJoins extends Array<TTables>, TRelations = Relations<TNewJoin>> =
    {[k in keyof TRelations as Filter<k,TJoins[number]>]: TRelations[k]};

type ArrayToString<A extends string, T extends string> = A extends string ? `${T}.${A}` : never;

/**
 * @example
 *  //returns ["userId", "User.id"] | ["postId", "Posts.id"]
 *  GetUnionOfRelations<SafeJoins<"LikedPosts", ["User", "Posts"]>>;
 */
type GetUnionOfRelations<TSafe> = {
    [ T in keyof TSafe] : {
        [TLocal in keyof TSafe[T]]:
        [
            TLocal,
            T extends string ? TSafe[T][TLocal] extends Array<string> ? ArrayToString<TSafe[T][TLocal][number], T> : never : never
    ]
    }[keyof TSafe[T]];
}[keyof TSafe]

type find<T extends [string, string], toFind extends string> = T extends [infer col1, infer col2] ? col1 extends toFind ? col2 : never : never;

type CleanUpFromNames<TFromTable extends TTables, TCols extends string> = TCols extends `${TFromTable}.${infer Col}` ? Col : TCols;

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
    GetColsFromTableType<TDBBase, Type>
    | GetJoinColsType<TJoins[number],Type>;

type GetColsFromTableType<TDBBase extends TTables, Type extends string> =
    //@ts-expect-error Try and come back to
    FieldsByTypeByTable[Loop<keyof FieldsByTypeByTable, Type>][TDBBase];
type Loop<Keys extends string, Type extends string>=  Keys extends Type ? Type : never;


type GetJoinColsType<TDBBase extends TTables, Type extends string> = IterateFields<TDBBase, IsString<GetColsFromTableType<TDBBase, Type>>>;//, Type];


class _fJoin<TDBBase extends TTables, TJoins extends Array<TTables> = []> extends _fWhere<TDBBase> {

    joinUnsafe<Table extends TTables,
        TCol1 extends GetColsFromTable<Table>,
        TCol2 extends  GetJoinOnColsType<
            //@ts-expect-error TODO come back too
            GetColumnType<Table, TCol1>
            , TDBBase, [...TJoins, Table]>
        >(table: Table, field: TCol1, reference: TCol2) {
        return new _fJoin<TDBBase, [...TJoins, Table]>(this.db, {
            ...this.values,
            tables: [...this.values.tables || [], `join ${table} ${table}.${String(field)} on ${String(reference)}`]
        });
    }

    joinUnsafeAllFields<Table extends TTables,
        TCol2 extends GetJoinCols< [...TJoins, TDBBase][number]> >(table: Table, field: GetColsFromTable<Table>, reference: TCol2) {
        return new _fJoin<TDBBase, [...TJoins, Table]>(this.db, {
            ...this.values,
            tables: [...this.values.tables || [], `join ${table} ${table}.${String(field)} on ${String(reference)}`]
        });
    }

    join<Table extends TTables,
        //@ts-expect-error this does work TODO comeback to
        TJoinCols extends [string, string] = GetUnionOfRelations<SafeJoins<Table, [TDBBase, ...TJoins]>>,
        TCol1 extends TJoinCols[0] = never
    >(table: Table, field: TCol1, reference: CleanUpFromNames<TDBBase, find<TJoinCols, TCol1>> ) {
        return new _fJoin<TDBBase, [...TJoins, Table]>(this.db, {
            ...this.values,
            tables: [...this.values.tables || [], `join ${table} ${String(field)} on ${this.values.database}.${String(reference)}`]
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


















