export const DB: DBType = {} as const satisfies DBType;

export type DBType = Record<string, {
    fields: Record<string, string>;
    relations: Record<string, Record<string, Array<string>>>
}>;
