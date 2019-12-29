import { ObservableStateDataSource } from './data-source';

export interface ObservableStatePersistencyCallbacks<T, IdType> {
    all: () => ObservableStateDataSource<T[]>;
    clear?: () => ObservableStateDataSource<void | boolean>;
    get: (itemIds: IdType[]) => ObservableStateDataSource<T[]>;
    set: (items: T[]) => ObservableStateDataSource<void | boolean>;
    remove: (itemIds: IdType[]) => ObservableStateDataSource<void | boolean>;
}
