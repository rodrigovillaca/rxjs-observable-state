import { ObservableStateDataSource } from './data-source';
import { ObservableStateObject } from './state';

export interface ObservableStatePersistencyCallbacks<T, IdType> {
    all: () => ObservableStateDataSource<ObservableStateObject<T>[]>;
    clear?: () => ObservableStateDataSource<void | boolean>;
    get: (itemIds: IdType[]) => ObservableStateDataSource<ObservableStateObject<T>[]>;
    set: (items: ObservableStateObject<T>[]) => ObservableStateDataSource<void | boolean>;
    remove: (itemIds: IdType[]) => ObservableStateDataSource<void | boolean>;
}
