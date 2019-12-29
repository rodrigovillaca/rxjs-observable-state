import { ObservableDataSource } from './data-source';
export interface ObservablePersistencyCallbacks<T, IdType> {
    all: () => ObservableDataSource<T[]>;
    clear?: () => ObservableDataSource<void | boolean>;
    get: (itemIds: IdType[]) => ObservableDataSource<T[]>;
    set: (items: T[]) => ObservableDataSource<void | boolean>;
    remove: (itemIds: IdType[]) => ObservableDataSource<void | boolean>;
}
