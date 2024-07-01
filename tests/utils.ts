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
