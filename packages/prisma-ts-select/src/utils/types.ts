export type RemoveNullChar<str extends string> = str extends `?${infer s}` ? s : str;

export type DBType = Record<string, {
    fields: Record<string, string>;
    relations: Record<string, Record<string, Array<string>>>
}>;

export type TSExtract<T, U extends T> = T extends U ? T : never;
