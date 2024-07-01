export type Expect<T extends true> = T;
export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <
        T
    >() => T extends Y ? 1 : 2
    ? IsUnionEqual<X,Y>
    : false;

export type IsUnionEqual<A, B> = (
    A extends B ? (B extends A ? true : false) : false
    );

//@ts-expect-error ignore unused
export function typeCheck(...args: Array<any>){}
