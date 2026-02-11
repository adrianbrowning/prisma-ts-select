
type ArrayToString<A extends string, T extends string> = A extends string ? `${T}.${A}` : never;
export type GetUnionOfRelations<TSafe> = {
    [ T in keyof TSafe] : {
        [TLocal in keyof TSafe[T]]:
        [
            TLocal,
            T extends string ? TSafe[T][TLocal] extends Array<string> ? ArrayToString<TSafe[T][TLocal][number], T> : never : never
        ]
    }[keyof TSafe[T]];
}[keyof TSafe];

export type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

export type Expect<T extends true> = T;
export type EqualWithUnionCheck<X, Y> = (<T>() => T extends X ? 1 : 2) extends <
        T
    >() => T extends Y ? 1 : 2
    ? IsUnionEqual<X,Y>
    : false;

export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <
        T
    >() => T extends Y ? 1 : 2
    ? true
    : false;

export type IsUnionEqual<A, B> = OnlyBoolean<(
    A extends B ? (B extends A ? true : false) : false
    )>;



type OnlyBoolean<T> = T extends Boolean ? true : false;

// export type IsSubset<T, U> = T extends U ? U extends T ? true : false : false;
export type IsSubset<T, U> = T extends U ? [true] : [false];
export type TestUnion<T, U> = IsSubset<T, U> extends [true] ? true : false;

//@ts-expect-error ignore unused
export function typeCheck(...args: Array<any>){}
