import {
    Subject,
    Observable,
    SubscribableOrPromise,
    isObservable,
    from,
    of,
    ReplaySubject,
    forkJoin,
    throwError
} from 'rxjs';

import { ObservablePersistencyCallbacks } from './persistency-callbacks';

import { ObservableStateEncoding } from './encoding';

import { ObservableDataSource } from './data-source';

import { tap, map } from 'rxjs/operators';
import { types } from 'util';
import * as hash from 'object-hash';

export interface ObservableStateOptions<T, IdType> {
    idProperty: string;
    singleEntityMode?: boolean;
    persistencyCallbacks?: ObservablePersistencyCallbacks<T, IdType>;
    encoding?: ObservableStateEncoding;
}
export class ObservableState<T, IdType> {
    private readonly subjects: { [id: string]: Subject<T> } = {};
    private readonly observables: { [id: string]: Observable<T> } = {};

    readonly encoding: ObservableStateEncoding;
    readonly persistencyCallbacks?: ObservablePersistencyCallbacks<T, IdType>;
    readonly idProperty: string;
    readonly singleEntityMode: boolean;

    constructor(options: ObservableStateOptions<T, IdType>) {
        this.idProperty = options.idProperty;
        this.encoding = options.encoding ? options.encoding : 'plain';
        this.persistencyCallbacks = options.persistencyCallbacks;
        this.singleEntityMode = options.singleEntityMode;

        if (this.persistencyCallbacks && this.persistencyCallbacks.all instanceof Function) {
            const all = this.persistencyCallbackToPromise(this.persistencyCallbacks.all());
            all.then(existing => existing.forEach(item => this.addToState(item)));
        }
    }

    private getObjectId(object: T) {
        return (object as any)[this.idProperty] as IdType;
    }
    private persistencyCallbackToObserbable<PersistencyType>(
        source: SubscribableOrPromise<PersistencyType> | PersistencyType
    ) {
        if (source) {
            let destination: Observable<PersistencyType>;
            if (isObservable(source)) {
                destination = source as Observable<PersistencyType>;
            } else if (types.isPromise(source)) {
                destination = from(source as Promise<PersistencyType>);
            } else {
                destination = of(source as PersistencyType);
            }
            return destination;
        } else {
            return of(null as PersistencyType);
        }
    }

    private persistencyCallbackToPromise<PersistencyType>(
        source: SubscribableOrPromise<PersistencyType> | PersistencyType
    ) {
        if (source) {
            let destination: Promise<PersistencyType>;
            if (isObservable(source)) {
                destination = (source as Observable<PersistencyType>).toPromise();
            } else if (types.isPromise(source)) {
                destination = source as Promise<PersistencyType>;
            } else {
                destination = Promise.resolve(source as PersistencyType);
            }
            return destination;
        }
    }

    private addToState(object: T) {
        if (!object) {
            throw new Error('undefined_object');
        }

        const stateId = this.generateStateId(this.getObjectId(object));
        this.initializeState(stateId);
        this.subjects[stateId].next(Object.assign({}, object));
    }
    private countStateItems() {
        return Object.keys(this.observables).length;
    }
    private exisitsInState(id?: any) {
        const stateId = this.generateStateId(id);
        return !!this.observables[stateId] && !!this.subjects[stateId];
    }
    private generateStateId(id?: any) {
        if (!id) {
            if (this.singleEntityMode) {
                id = 'single-entity';
            } else {
                throw new Error('undefined_id');
            }
        }
        const stateId = JSON.stringify(id);

        if (!stateId) {
            throw new Error('unknown_error');
        } else {
            if (this.encoding === 'plain') {
                return stateId;
            } else if (this.encoding === 'base64') {
                return btoa(stateId);
            } else if (this.encoding === 'md5') {
                return hash.MD5(stateId);
            } else if (this.encoding === 'sha1') {
                return hash.sha1(stateId);
            }

            return stateId;
        }
    }

    private initializeState(stateId: string) {
        if (!isObservable(this.observables[stateId]) || !isObservable(this.subjects[stateId])) {
            this.subjects[stateId] = new ReplaySubject(1);
            this.observables[stateId] = this.subjects[stateId].asObservable();
        }
        return stateId;
    }

    clear() {
        // tslint:disable-next-line: forin
        for (const member in this.subjects) {
            delete this.subjects[member];
        }
        // tslint:disable-next-line: forin
        for (const member in this.observables) {
            delete this.observables[member];
        }

        if (this.persistencyCallbacks && this.persistencyCallbacks.clear instanceof Function) {
            this.persistencyCallbacks.clear();
        }
    }

    count() {
        return of(this.countStateItems());
    }

    create(object: T, source: ObservableDataSource<IdType>) {
        const observable = this.getObservableFrom(source);
        return observable.pipe(
            tap(id => {
                (object as any)[this.idProperty] = id;
                this.addToState(object);

                if (this.persistencyCallbacks && this.persistencyCallbacks.set instanceof Function) {
                    this.persistencyCallbacks.set([object]);
                }
            })
        );
    }

    exists(id: IdType) {
        return of(this.exisitsInState(id));
    }

    filter(filterFn: (object: T) => boolean) {
        return forkJoin(Object.values(this.observables)).pipe(
            map(objects => {
                return objects?.filter(filterFn);
            })
        );
    }

    tryGetFromPersistency<Type extends T | T[]>(ids: IdType[], singleItem?: boolean) {
        if (this.persistencyCallbacks && this.persistencyCallbacks.get instanceof Function) {
            const observable = this.persistencyCallbackToObserbable(this.persistencyCallbacks.get(ids)).pipe(
                map(objects => {
                    if (objects?.length) {
                        return objects;
                    } else {
                        throw new Error('item_not_found');
                    }
                })
            );
            if (singleItem) {
                return observable.pipe(map(objects => (Array.isArray(objects) ? (objects[0] as Type) : null)));
            } else {
                return observable as Observable<Type>;
            }
        } else {
            return throwError('item_not_found');
        }
    }
    get(id?: IdType, source?: ObservableDataSource<T>) {
        const observable = this.getObservableFrom(source);
        const stateId = this.generateStateId(id);

        if (isObservable(this.observables[stateId])) {
            return this.observables[stateId];
        } else if (isObservable(observable)) {
            return this.set(observable);
        } else if (id) {
            return this.tryGetFromPersistency<T>([id]);
        } else {
            return throwError('invalid_id_and_observable');
        }
    }

    getAllIds() {
        return forkJoin(Object.values(this.observables)).pipe(
            map(objects => objects?.map(object => this.getObjectId(object) as IdType))
        );
    }

    getAll() {
        return forkJoin(Object.values(this.observables));
    }

    getMultiple(ids: IdType[]) {
        if (!Array.isArray(ids)) {
            return throwError('invalid_array');
        }
        return ids
            .map(id => {
                const stateId = this.generateStateId(id);
                if (isObservable(this.observables[stateId])) {
                    return this.observables[stateId];
                } else {
                    return this.persistGet(id);
                }
            })
            .filter(object => !!object);
    }

    load(source: ObservableDataSource<T>, id?: IdType) {
        const observable = this.getObservableFrom(source);
        if (!isObservable(observable)) {
            return throwError('invalid_observable');
        }
        const stateId = this.generateStateId(id);

        if (isObservable(this.observables[stateId])) {
            return this.observables[stateId];
        } else if (isObservable(observable)) {
            return this.set(observable);
        } else {
            return this.tryGetFromPersistency<T>([id]);
        }
    }

    loadMultiple(
        sources: { id?: IdType; data: ObservableDataSource<T> }[],
        options: { clearAll?: boolean; replaceExisting?: boolean } = {}
    ) {
        const observables: Observable<T>[] = [];
        sources.forEach(source => {
            const observable = this.getObservableFrom(source.data);
            let stateId: string;
            try {
                stateId = this.generateStateId(source.id);
                if (stateId && isObservable(this.observables[stateId])) {
                    observables.push(this.observables[stateId]);
                } else {
                    observables.push(this.set(observable));
                }
            } catch {
                observables.push(this.set(observable));
            }
        });
        return forkJoin(observables);
    }

    persistGet(itemId: IdType) {
        if (this.persistencyCallbacks && this.persistencyCallbacks.all instanceof Function) {
            const observable = this.persistencyCallbackToObserbable(this.persistencyCallbacks.get([itemId]));
            if (!observable) {
                return of<T>(null);
            } else {
                return observable.pipe(
                    map(objects => {
                        if (Array.isArray(objects)) {
                            return objects[0];
                        } else {
                            return null;
                        }
                    })
                );
            }
        } else {
            throwError('invalid_persistency_function');
        }
    }

    persistGetAll() {
        if (this.persistencyCallbacks && this.persistencyCallbacks.all instanceof Function) {
            return this.persistencyCallbackToObserbable(this.persistencyCallbacks.all());
        } else {
            throwError('invalid_persistency_function');
        }
    }

    persistRemove(itemIds: IdType[]) {
        if (this.persistencyCallbacks && this.persistencyCallbacks.remove instanceof Function) {
            return this.persistencyCallbackToObserbable(this.persistencyCallbacks.remove(itemIds));
        } else {
            throwError('invalid_persistency_function');
        }
    }

    persistSet(items: T[]) {
        if (this.persistencyCallbacks && this.persistencyCallbacks.set instanceof Function) {
            return this.persistencyCallbackToObserbable(this.persistencyCallbacks.set(items));
        } else {
            throwError('invalid_persistency_function');
        }
    }

    remove(id: IdType) {
        const stateId = this.generateStateId(id);
        delete this.subjects[stateId];
        delete this.observables[stateId];

        if (this.persistencyCallbacks && this.persistencyCallbacks.set instanceof Function) {
            this.persistencyCallbacks.remove([id]);
        }
    }

    private getObservableFrom<SourceType>(source: ObservableDataSource<SourceType>) {
        if (isObservable(source)) {
            return source as Observable<SourceType>;
        } else if (types.isPromise(source)) {
            return from(source as Promise<SourceType>);
        } else {
            return of(source as SourceType);
        }
    }

    set(source: ObservableDataSource<T>) {
        const observable = this.getObservableFrom(source);
        if (!isObservable(observable)) {
            return throwError('invalid_observable');
        }
        return observable.pipe(
            tap(object => {
                this.addToState(object);
                if (this.persistencyCallbacks && this.persistencyCallbacks.set instanceof Function) {
                    this.persistencyCallbacks.set([object]);
                }
            })
        );
    }

    setMultiple(source: ObservableDataSource<T[]>, replaceExisting: boolean = true) {
        const observable = this.getObservableFrom(source);

        return observable.pipe(
            tap(objects => {
                objects?.forEach(object => {
                    const stateId = this.generateStateId(this.getObjectId(object));
                    if (replaceExisting || !this.exisitsInState(stateId)) {
                        this.addToState(object);
                    }
                });
                if (this.persistencyCallbacks && this.persistencyCallbacks.set instanceof Function) {
                    this.persistencyCallbacks.set(objects);
                }
            })
        );
    }
}
