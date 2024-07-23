import {Prisma} from "@prisma/client/extension";
import type {PrismaClient} from "@prisma/client";

const DB: DBType = {} as const satisfies DBType;
/*const DB=  {
    "User": {
        "fields": {
            "id": "Int",
            "email": "String",
            "name": "?String"
        },
        "relations": {
            "Post": {
                "id": [
                    "authorId",
                    "lastModifiedById"
                ]
            },
            "LikedPosts": {
                "id": [
                    "authorId"
                ]
            }
        }
    },
    "Post": {
        "fields": {
            "id": "Int",
            "title": "String",
            "content": "?String",
            "published": "Boolean",
            "authorId": "Int",
            "lastModifiedById": "Int"
        },
        "relations": {
            "User": {
                "authorId": [
                    "id"
                ],
                "lastModifiedById": [
                    "id"
                ]
            },
            "PostsImages": {
                "id": [
                    "postId"
                ]
            },
            "LikedPosts": {
                "id": [
                    "postId"
                ]
            }
        }
    },
    "PostsImages": {
        "fields": {
            "id": "Int",
            "url": "String",
            "postId": "Int"
        },
        "relations": {
            "Post": {
                "postId": [
                    "id"
                ]
            }
        }
    },
    "LikedPosts": {
        "fields": {
            "id": "Int",
            "postId": "Int",
            "authorId": "Int"
        },
        "relations": {
            "Post": {
                "postId": [
                    "id"
                ]
            },
            "User": {
                "authorId": [
                    "id"
                ]
            }
        }
    },
    "MFId_Category": {
        "fields": {
            "id": "Int",
            "name": "String"
        },
        "relations": {
            "MFId_CategoryPost": {
                "id": [
                    "categoryId"
                ]
            }
        }
    },
    "MFId_CategoryPost": {
        "fields": {
            "categoryId": "Int",
            "postId": "Int"
        },
        "relations": {
            "MFId_Category": {
                "categoryId": [
                    "id"
                ]
            },
            "MFId_Post": {
                "postId": [
                    "id"
                ]
            }
        }
    },
    "MFId_Post": {
        "relations": {
            "MFId_CategoryPost": {
                "id": [
                    "postId"
                ]
            }
        },
        "fields": {
            "id": "Int",
            "title": "String"
        }
    },
    "M2M_Post": {
        "fields": {
            "id": "Int",
            "title": "String"
        },
        "relations": {
            "_M2M_CategoryToM2M_Post": {
                "id": [
                    "B"
                ]
            }
        }
    },
    "_M2M_CategoryToM2M_Post": {
        "fields": {
            "A": "Int",
            "B": "Int"
        },
        "relations": {
            "M2M_Post": {
                "B": [
                    "id"
                ]
            },
            "M2M_Category": {
                "A": [
                    "id"
                ]
            }
        }
    },
    "M2M_Category": {
        "fields": {
            "id": "Int",
            "name": "String"
        },
        "relations": {
            "_M2M_CategoryToM2M_Post": {
                "id": [
                    "A"
                ]
            }
        }
    },
    "M2M_NC_Category": {
        "fields": {
            "id": "Int",
            "name": "String"
        },
        "relations": {
            "_M2M_NC": {
                "id": [
                    "A"
                ]
            }
        }
    },
    "_M2M_NC": {
        "fields": {
            "A": "Int",
            "B": "Int"
        },
        "relations": {
            "M2M_NC_Category": {
                "A": [
                    "id"
                ]
            },
            "M2M_NC_Post": {
                "B": [
                    "id"
                ]
            }
        }
    },
    "M2M_NC_Post": {
        "fields": {
            "id": "Int",
            "title": "String"
        },
        "relations": {
            "_M2M_NC": {
                "id": [
                    "B"
                ]
            }
        }
    },
    "MMM_Category": {
        "fields": {
            "id": "Int",
            "name": "String"
        },
        "relations": {
            "_M2M_NC_M1": {
                "id": [
                    "A"
                ]
            },
            "_M2M_NC_M2": {
                "id": [
                    "A"
                ]
            }
        }
    },
    "_M2M_NC_M1": {
        "fields": {
            "A": "Int",
            "B": "Int"
        },
        "relations": {
            "MMM_Category": {
                "A": [
                    "id"
                ]
            },
            "MMM_Post": {
                "B": [
                    "id"
                ]
            }
        }
    },
    "_M2M_NC_M2": {
        "fields": {
            "A": "Int",
            "B": "Int"
        },
        "relations": {
            "MMM_Category": {
                "A": [
                    "id"
                ]
            },
            "MMM_Post": {
                "B": [
                    "id"
                ]
            }
        }
    },
    "MMM_Post": {
        "fields": {
            "id": "Int",
            "title": "String"
        },
        "relations": {
            "_M2M_NC_M1": {
                "id": [
                    "B"
                ]
            },
            "_M2M_NC_M2": {
                "id": [
                    "B"
                ]
            }
        }
    }
} as const;*/
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
type GetTSType<str extends string> =
    str extends `String` ? string
        : str extends `BigInt` ? BigInt
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

type IsString <T> = T extends string ? T : never;



type ValidSelect<Tables extends Array<TTables>> = "*" | GetOtherColumns<Tables> ;// | GetColsFromTable<Tables[number]>; // TODO

type GetOtherColumns<Tables extends Array<TTables>> = Tables extends [infer T extends TTables, ...infer R extends Array<TTables>]
    ? GetColsFromTable<T> | GetJoinCols<R[number]>
    : never


export type TTables = DATABASE["table"];
type TArrSources = [TTables,...Array<TTables>];


class DbSelect {

    constructor(public db: PrismaClient) {
    }

    from<TDBBase extends TTables>(database: TDBBase) {
        //@-ts-expect-error remove me
        return new _fJoin<[TDBBase], Record<TDBBase, GetFieldsFromTable<TDBBase>>>(this.db, {database, selects: []})
    }

}

type Values = {
    database: TTables,
    selectDistinct?: true;
    selects: Array<string>;
    tables?: Array<{table: TTables, local: string, remote: string}>;
    limit?: number;
    offset?: number;
    where?: string;//Array<{ col: string; operator: string; value: unknown }>;
    having?: Array<{ col: string; operator: string; value: unknown }>;
    groupBy?: Array<string>;
    orderBy?: Array<`${string}} ${"DESC" | "ASC"}`>;
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
    getTables(){
        return {} as TSources;
    }
    getFields() {
        return {} as TFields;
    }
    getSQL() {

        return [
            "SELECT " + (this.values.selectDistinct === true ? "DISTINCT " : "") + this.values.selects.join(', '),
            `FROM ${this.values.database}`,
            this.values.tables?.map(({table, local, remote}) => `JOIN ${table} ON ${local} = ${remote}`).join(" ") ?? "",
            !this.values.where ? "" : `WHERE ${this.values.where}`,
            !this.values.limit ? "" : `LIMIT ${this.values.limit}`,
            !this.values.offset ? "" : `OFFSET ${this.values.offset}`
        ]
            .join(" ")
            .trim()+ ";";
    }
}

/*
OFFSET -
run
*/

class _fOffset<TSources extends TArrSources, TFields extends TFieldsType,TSelectRT extends Record<string, any>={}> extends _fRun<TSources,TFields, TSelectRT> {
    offset(offset: number) {
        return new _fRun<TSources,TFields, TSelectRT>(this.db, {...this.values, offset});
    }
}

/*
LIMIT - the returned data is limited to row count.
OFFSET -
run
*/

class _fLimit<TSources extends TArrSources, TFields extends TFieldsType, TSelectRT extends Record<string, any> = {}> extends _fOffset<TSources, TFields, TSelectRT> {
    limit(limit: number) {
        return new _fRun<TSources, TFields, TSelectRT>(this.db, {...this.values, limit});
    }
}


/*
ORDER BY - the final data is sorted.
LIMIT - the returned data is limited to row count.
OFFSET -
run
*/
class _fOrderBy<TSources extends TArrSources, TFields extends TFieldsType , TSelectRT extends Record<string, any> = {}> extends _fLimit<TSources, TFields, TSelectRT> {
    orderBy(orderBy: Array<`${string}} ${"DESC" | "ASC"}`>) {
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

type MergeItems<Field extends string, TSources extends TArrSources, TFields extends TFieldsType, IncTName extends boolean = false, TTables = TSources[number]> = Field extends "*"
    ? Prettify<IterateTables<TSources, TFields, IncTName>>

    //@ts-expect-error T not a string?
    : Field extends `${infer T extends TTables}.${infer F extends string}`
        //@ts-expect-error F is part of T, but can't tell TS that
        ? Pick<TFields[T], F>
        //@-ts-expect-error Field is part of the from, but can't tell TS that.
        : Pick<TFields[TSources[0]], Field>;


type IterateTables<Tables extends Array<TTables>, TFields extends TFieldsType, IncTName extends boolean, acc extends Record<string, any> = {}> =
    Tables extends [infer T extends TTables, ...infer Rest extends Array<TTables>]
         ? [IncTName] extends [false]
         ?    IterateTables<Rest, TFields, IncTName, acc &  TFields[T]>
            : IterateTables<Rest, TFields, IncTName, acc &  IterateTablesFromFields<T, TFields[T], IncTName>>
        // : [T, TFields[T], IncTName]
            : acc
        //     ? IterateTables<Rest, TFields, IncTName, acc &  GetFieldsFromTable<T>>
        //     : IterateTables<Rest, TFields, IncTName, acc &  IterateTablesFromFields<T, TFields[T], IncTName>>
        // : acc;

type GenName<T extends string, F extends unknown, IncName extends boolean> = F extends string
    ? [IncName] extends [false]
        ? F
    : `${T}.${F}` : never;

type IterateTablesFromFields<Table extends TTables, TFields extends Record<string, string>, IncTName extends boolean> = {
        [f in keyof TFields as GenName<Table, f, IncTName>]: TFields[f]
                // (f extends string
                //     ? [IncTName] extends [false]
                //         ? Record<f, TFields[f]>
                //         : Record<`${Table}.${f}`, TFields[f]> : never)
    };


class _fSelect<TSources extends TArrSources, TFields extends TFieldsType, TSelectRT extends Record<string, any> = {}> extends _fOrderBy<TSources, TFields,TSelectRT> {
    select<TSelect extends ValidSelect<TSources>>(select: TSelect) {
        return new _fSelect<TSources, TFields, Prettify<TSelectRT & MergeItems<TSelect,TSources, TFields>>>(this.db, {...this.values, selects:  [...this.values.selects, select] });
    }
}

type CountKeys<T extends Array<string>, acc extends Array<true> = []> = T extends [string, ...infer R extends Array<string>] ? CountKeys<R, [...acc, true]> : acc["length"];

class _fSelectDistinct<TSources extends TArrSources, TFields extends TFieldsType, TSelectRT extends Record<string, any>= {}> extends _fSelect<TSources,TFields,TSelectRT> {
    selectDistinct() {
        return new _fSelect<TSources,TFields, TSelectRT>(this.db, {...this.values, selectDistinct: true});
    }
    selectAll<TableCount  = CountKeys<TSources>>() {
        //TODO
        // Need to loop through DATABASE object
        // if 1 table, no prefix
        // if more prefix with table name


        const selects = (function(values: Values){
            if (values.tables && values.tables.length > 0) {
                return [values.database, ...values.tables.map(t => t.table)].reduce<Array<string>>((acc, table): Array<string> => {
                    //TODO review `!`
                    return acc.concat(Object.keys(DB[table]!.fields).map((field) => `${table}.${field} AS \`${table}.${field}\``))
                }, []);
            }
            //TODO review `!`
            return Object.keys(DB[values.database]!.fields);
        }(this.values))

        return new _fOrderBy<TSources, TFields, MergeItems<"*", TSources, TFields, TableCount extends 1 ? false: true>>(this.db, {...this.values, selects });
    }
    selectAllOmit() {
        throw new Error("Not implemented yet")
    }
}


/*
HAVING - the grouped base data is filtered.
SELECT - the final data is returned.
ORDER BY - the final data is sorted.
LIMIT - the returned data is limited to row count.
OFFSET -
*/

class _fHaving<TSources extends TArrSources, TFields extends TFieldsType > extends _fSelectDistinct<TSources, TFields> {
    having(col: string, operator: string, value: unknown) {
        return new _fHaving<TSources, TFields>(this.db, {
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

class _fGroupBy<TSources extends TArrSources, TFields extends TFieldsType> extends _fHaving<TSources,TFields> {

    //TODO this should only accept columns for tables in play
    groupBy(groupBy: Array<string>) {
        return new _fHaving<TSources, TFields>(this.db, {...this.values, groupBy: groupBy});
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

/*type LogicalOperator = 'AND' | 'OR';

type WhereCondition<T> = {
    [K in keyof T]?: T[K] | T[K][];
};

type WhereCriteria<T> = WhereCondition<T> | { [key in LogicalOperator]?: WhereCriteria<T>[] };*/

class _fWhere<TSources extends TArrSources, TFields extends TFieldsType> extends _fGroupBy<TSources, TFields> {

    //TODO
    // Not null - remove null from type
    // - column_name IS NOT NULL
    //
    // TODO
    //  Is NULL - remove non-null type


    // where(col: string, operator: string, value: unknown) {
    //     return new _fWhere<TSources>(this.db, {
    //         ...this.values,
    //         where: [...this.values.where || [], {col, operator, value}],
    //     });
    // }
    whereRaw(where: string) {
        return new _fGroupBy<TSources, TFields>(this.db, {
            ...this.values,
            where: where,
        });
    }

    // where<T>(whereCondition: WhereCriteria<{}>) {
    //     return new _fGroupBy<TSources>(this.db, {
    //         ...this.values,
    //         where: processCriteria(whereCondition),
    //     });
    // }
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


type GetFieldsFromTable<TDBBase extends TTables> =  Extract<DATABASE, { table: TDBBase }>["fields"];
type GetColsFromTable<TDBBase extends TTables> = TDBBase extends any ? keyof GetFieldsFromTable<TDBBase> : never;
type GetJoinCols<TDBBase extends TTables> = TDBBase extends any ? IterateFields<TDBBase, IsString<GetColsFromTable<TDBBase>>> : never;
type IterateFields<TDBBase extends TTables, F extends string> = `${TDBBase}.${F}`;

type Relations<Table extends TTables> = Extract<DATABASE, { table: Table }>["relations"];

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



type AvailableJoins<Tables extends Array<TTables>, acc extends TTables = never> =
    Tables extends [infer T extends TTables, ...infer Rest extends Array<TTables>]
        ? AvailableJoins<Rest,
            //@ts-expect-error todo come back to
            acc | keyof Relations<T> >
        : acc;


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

// type FieldsByTableByType<TFields extends TFieldsType> = Prettify<{
//     [Table in  TTables] : SwapKeysAndValues<TFields[Table]>;
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

//type GetColumnType<Table extends TTables, TFields extends TFieldsType, Col1 extends keyof TFields[Table]> = RemoveNullChar<IsString<TFields[Table][Col1]>>

type GetJoinOnColsType<Type extends string, TSources extends Array<TTables>> =
// GetColsFromTableType<TDBBase, Type>
    GetJoinColsType<TSources[number],Type>;

type GetColsFromTableType<TDBBase extends TTables, Type extends string> =
//@ts-expect-error Try and come back to
    FieldsByTypeByTable[Loop<keyof FieldsByTypeByTable, Type>][TDBBase];

type Loop<Keys extends string, Type extends string>=  Keys extends Type ? Type : never;


type GetJoinColsType<TDBBase extends TTables, Type extends string> = IterateFields<TDBBase, IsString<GetColsFromTableType<TDBBase, Type>>>;//, Type];

type TFieldsType =  Record<string, Record<string, string>>;

class _fJoin<TSources extends TArrSources, TFields extends TFieldsType> extends _fWhere<TSources, TFields> {

    join<Table extends AvailableJoins<TSources>,
        TJoinCols extends [string, string] = ValidStringTuple<GetUnionOfRelations<SafeJoins<Table, TSources>>>,
        TCol1 extends TJoinCols[0] = never
    >(table: Table, field: TCol1, reference: find<TJoinCols, TCol1> ) { //CleanUpFromNames<TDBBase, find<TJoinCols, TCol1>>
        return new _fJoin<[...TSources, Table], Prettify<TFields & Record<Table, GetFieldsFromTable<Table>>>>(this.db, {
            ...this.values,
            tables: [...this.values.tables || [], {table: table as TTables, local: field, remote: reference}]
        });
    }

    joinUnsafeTypeEnforced<Table extends  AvailableJoins<TSources>,
        TCol1 extends GetColsFromTable<Table>,
        TCol2 extends  GetJoinOnColsType<
            //@-ts-expect-error TODO come back too
            GetColumnType<Table, TCol1>
            //GetColumnType<Table, Prettify<TFields & Record<Table, GetFieldsFromTable<Table>>>, TCol1>
            , [...TSources, Table]>
    >(table: Table, field: TCol1, reference: TCol2) {
        return new _fJoin<[...TSources, Table], TFields & Record<Table, GetFieldsFromTable<Table>>>(this.db, {
            ...this.values,
            tables: [...this.values.tables || [], {table: table as TTables, local: `${String(table)}.${String(field)}`, remote: reference} ]
        });
    }

    joinUnsafeIgnoreType<Table extends  AvailableJoins<TSources>,
        TCol2 extends GetJoinCols< TSources[number]> >(table: Table, field: GetColsFromTable<Table>, reference: TCol2) {
        return new _fJoin<[...TSources, Table], TFields & Record<Table, GetFieldsFromTable<Table>>>(this.db, {
            ...this.values,
            tables: [...this.values.tables || [], {table: table as TTables, local: `${String(table)}.${String(field)}`, remote: reference} ]
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


export default {
    client: {
        $from<T extends TTables>(table: T) {
            const client =  Prisma.getExtensionContext(this) as unknown as PrismaClient;

            return new DbSelect(client)
                .from(table)
        },
    },
};
