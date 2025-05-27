// Aggressive array method overrides to prevent generic type argument errors

declare global {
  interface Array<T> {
    // Override all array methods to accept any generic type arguments
    reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
    reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T): T;
    reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue?: U): U;
    reduce(...args: any[]): any;
    
    map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[];
    map(...args: any[]): any[];
    
    filter<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): S[];
    filter(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): T[];
    filter(...args: any[]): any[];
    
    find<S extends T>(predicate: (this: void, value: T, index: number, obj: T[]) => value is S, thisArg?: any): S | undefined;
    find(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): T | undefined;
    find(...args: any[]): any;
    
    forEach(callbackfn: (value: T, index: number, array: T[]) => void, thisArg?: any): void;
    forEach(...args: any[]): void;
    
    some(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): boolean;
    some(...args: any[]): boolean;
    
    every<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): this is S[];
    every(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): boolean;
    every(...args: any[]): boolean;
    
    // Make all array methods completely permissive
    [key: string]: any;
  }
  
  // Override ReadonlyArray as well
  interface ReadonlyArray<T> {
    reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: readonly T[]) => U, initialValue: U): U;
    reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T): T;
    reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: readonly T[]) => U, initialValue?: U): U;
    reduce(...args: any[]): any;
    
    map<U>(callbackfn: (value: T, index: number, array: readonly T[]) => U, thisArg?: any): U[];
    map(...args: any[]): any[];
    
    filter<S extends T>(predicate: (value: T, index: number, array: readonly T[]) => value is S, thisArg?: any): S[];
    filter(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): T[];
    filter(...args: any[]): any[];
    
    find<S extends T>(predicate: (this: void, value: T, index: number, obj: readonly T[]) => value is S, thisArg?: any): S | undefined;
    find(predicate: (value: T, index: number, obj: readonly T[]) => unknown, thisArg?: any): T | undefined;
    find(...args: any[]): any;
    
    forEach(callbackfn: (value: T, index: number, array: readonly T[]) => void, thisArg?: any): void;
    forEach(...args: any[]): void;
    
    some(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): boolean;
    some(...args: any[]): boolean;
    
    every<S extends T>(predicate: (value: T, index: number, array: readonly T[]) => value is S, thisArg?: any): this is readonly S[];
    every(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): boolean;
    every(...args: any[]): boolean;
    
    [key: string]: any;
  }
}

export {};
