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

import { ObservableStatePersistencyCallbacks } from './persistency-callbacks';

import { ObservableStateEncoding } from './encoding';

import { ObservableStateDataSource } from './data-source';

import { tap, map, filter, flatMap } from 'rxjs/operators';
import * as hash from 'object-hash';

const isPromise = (value: any): value is PromiseLike<any> => {
    return !!value && typeof value.subscribe !== 'function' && typeof value.then === 'function';
};
export interface ObservableStateOptions<T, IdType> {
    idProperty: string;
    singleEntityMode?: boolean;
    persistencyCallbacks?: ObservableStatePersistencyCallbacks<T, IdType>;
    encoding?: ObservableStateEncoding;
    ttl?: number;
}

interface ObservableStateObjectTtlNotRequired<T> {
    data: T;
    lastUpdated?: Date;
}
export interface ObservableStateObject<T> {
    data: T;
    lastUpdated: Date;
}
interface ObservableOptions<T> {
    observable: Observable<ObservableStateObjectTtlNotRequired<T>>;
    lastUpdated?: Date;
}
type SubjectOptions<T> = Subject<ObservableStateObjectTtlNotRequired<T>>;

export class ObservableState<T, IdType> {
    private readonly subjects: { [id: string]: SubjectOptions<T> } = {};
    private readonly observables: { [id: string]: ObservableOptions<T> } = {};

    readonly encoding: ObservableStateEncoding;
    readonly persistencyCallbacks?: ObservableStatePersistencyCallbacks<T, IdType>;
    readonly idProperty: string;
    readonly singleEntityMode: boolean;
    readonly ttl: number;

    constructor(options: ObservableStateOptions<T, IdType>) {
        this.idProperty = options.idProperty;
        this.encoding = options.encoding ? options.encoding : 'plain';
        this.persistencyCallbacks = options.persistencyCallbacks;
        this.singleEntityMode = options.singleEntityMode;
        this.ttl = options.ttl ? options.ttl : 60 * 60 * 1000;

        if (this.persistencyCallbacks && this.persistencyCallbacks.all instanceof Function) {
            const all = this.persistencyCallbackToPromise(this.persistencyCallbacks.all());
            all.then(existing => existing.forEach(item => this.addToState(item)));
        }
    }

    private addToState(object: ObservableStateObjectTtlNotRequired<T>): ObservableStateObject<T> {
        if (!object || !object.data) {
            throw new Error('undefined_object');
        }

        const stateId = this.generateStateId(this.getObjectId(object.data));
        this.initializeState(stateId);
        object.lastUpdated = new Date();

        this.subjects[stateId].next(Object.assign({}, object));
        return object as ObservableStateObject<T>;
    }

    private countStateItems(): number {
        return Object.keys(this.observables).length;
    }

    private exisitsInState(id?: any): boolean {
        const stateId = this.generateStateId(id);
        return !!this.observables[stateId] && !!this.subjects[stateId];
    }
    private generateStateId(id?: IdType): string {
        const stateId = this.generateStateIdInternal(id);
        if (this.observables[stateId] && this.isExpired(id)) {
            this.remove(id);
        }
        return stateId;
    }
    private generateStateIdInternal(id?: IdType): string {
        if (!id && !this.singleEntityMode) {
            throw new Error('undefined_id');
        }
        const stateId = JSON.stringify(this.singleEntityMode ? 'single-entity' : id);

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

    private getObjectId(object: T): IdType {
        return (object as any)[this.idProperty] as IdType;
    }

    private getObservableFrom<SourceType>(source: ObservableStateDataSource<SourceType>): Observable<SourceType> {
        if (isObservable(source)) {
            return source as Observable<SourceType>;
        } else if (isPromise(source)) {
            return from(source as Promise<SourceType>);
        } else {
            return of(source as SourceType);
        }
    }
    private initializeState(stateId: string): string {
        if (!isObservable(this.observables[stateId]?.observable) || !isObservable(this.subjects[stateId])) {
            this.subjects[stateId] = new ReplaySubject(1);
            this.observables[stateId] = { observable: this.subjects[stateId].asObservable() };
        }
        return stateId;
    }

    private persistencyCallbackToObserbable<PersistencyType>(
        source: SubscribableOrPromise<PersistencyType> | PersistencyType
    ): Observable<PersistencyType> {
        if (source) {
            let destination: Observable<PersistencyType>;
            if (isObservable(source)) {
                destination = source as Observable<PersistencyType>;
            } else if (isPromise(source)) {
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
    ): Promise<PersistencyType> {
        if (source) {
            let destination: Promise<PersistencyType>;
            if (isObservable(source)) {
                destination = (source as Observable<PersistencyType>).toPromise();
            } else if (isPromise(source)) {
                destination = source as Promise<PersistencyType>;
            } else {
                destination = Promise.resolve(source as PersistencyType);
            }
            return destination;
        }
    }

    clear(): void {
        Object.keys(this.subjects).forEach(key => {
            delete this.subjects[key];
        });
        Object.keys(this.observables).forEach(key => {
            delete this.observables[key];
        });

        if (this.persistencyCallbacks && this.persistencyCallbacks.clear instanceof Function) {
            this.persistencyCallbacks.clear();
        }
    }

    count(): Observable<number> {
        return of(this.countStateItems());
    }

    create(object: T, source: ObservableStateDataSource<IdType>): Observable<IdType> {
        const observable = this.getObservableFrom(source);
        return observable.pipe(
            tap(id => {
                (object as any)[this.idProperty] = id;
                const objectToStore = this.addToState({ data: object });

                if (this.persistencyCallbacks && this.persistencyCallbacks.set instanceof Function) {
                    this.persistencyCallbacks.set([objectToStore]);
                }
            })
        );
    }

    exists(id: IdType): Observable<boolean> {
        return of(this.exisitsInState(id));
    }

    filter(filterFn: (object: T) => boolean): Observable<T[]> {
        return forkJoin(
            Object.values(this.observables).map((observable: ObservableOptions<T>) => {
                return observable.observable
                    .pipe(
                        filter(
                            object => !!object && this.isExpired(undefined, object.lastUpdated) && filterFn(object.data)
                        )
                    )
                    .pipe(map(object => object.data));
            })
        );
    }

    tryGetFromPersistency(id: IdType): Observable<T> {
        if (this.persistencyCallbacks && this.persistencyCallbacks.get instanceof Function) {
            return this.persistencyCallbackToObserbable(this.persistencyCallbacks.get([id])).pipe(
                map(objects => {
                    if (objects?.length) {
                        return objects[0].data;
                    } else {
                        throw new Error('item_not_found');
                    }
                })
            );
        } else {
            return throwError('item_not_found');
        }
    }

    tryGetAllFromPersistency(ids: IdType[]): Observable<T[]> {
        if (this.persistencyCallbacks && this.persistencyCallbacks.get instanceof Function) {
            return this.persistencyCallbackToObserbable(this.persistencyCallbacks.get(ids)).pipe(
                map(objects => {
                    if (objects?.length) {
                        return objects.map(object => object.data);
                    } else {
                        throw new Error('item_not_found');
                    }
                })
            );
        } else {
            return throwError('item_not_found');
        }
    }

    get(id?: IdType, source?: ObservableStateDataSource<T>): Observable<T> {
        const observable = this.getObservableFrom(source);
        const stateId = this.generateStateId(id);

        if (isObservable(this.observables[stateId]?.observable)) {
            return this.observables[stateId].observable.pipe(map(object => object.data));
        } else if (isObservable(observable)) {
            return this.set(observable);
        } else if (id) {
            return this.tryGetFromPersistency(id);
        } else {
            return throwError('invalid_id_and_observable');
        }
    }

    getAllIds(): Observable<IdType[]> {
        return forkJoin(
            Object.values(this.observables).map(observable =>
                observable?.observable?.pipe(map(object => this.getObjectId(object.data) as IdType))
            )
        );
    }

    getAll(): Observable<T[]> {
        return forkJoin(Object.values(this.observables).map(item => item.observable.pipe(map(object => object.data))));
    }

    getMultiple(ids: IdType[]): Observable<T[]> {
        if (!Array.isArray(ids)) {
            return throwError('invalid_array');
        }
        return forkJoin(
            ids
                .map(id => {
                    const stateId = this.generateStateId(id);
                    if (isObservable(this.observables[stateId]?.observable)) {
                        return this.observables[stateId].observable.pipe(map(object => object.data));
                    } else {
                        return this.persistGet(id);
                    }
                })
                .filter(object => !!object)
        );
    }

    isExpired(id?: any, lastUpdated?: Date): boolean {
        const prevTime = lastUpdated ? lastUpdated : this.observables[this.generateStateIdInternal(id)]?.lastUpdated;
        const thisTime = new Date();
        const diff = thisTime.getTime() - prevTime.getTime();
        return diff >= this.ttl;
    }

    load(source: ObservableStateDataSource<T>, id?: IdType): Observable<T> {
        const observable = this.getObservableFrom(source);
        if (!isObservable(observable)) {
            return throwError('invalid_observable');
        }
        const stateId = this.generateStateId(id);

        if (isObservable(this.observables[stateId]?.observable)) {
            return this.observables[stateId].observable.pipe(map(object => object.data));
        } else if (isObservable(observable)) {
            return this.set(observable);
        } else {
            return this.tryGetFromPersistency(id);
        }
    }

    loadMultiple(
        sources: { id?: IdType; data: ObservableStateDataSource<T> }[],
        options: { clearAll?: boolean; replaceExisting?: boolean } = {}
    ): Observable<T[]> {
        const observables: Observable<T>[] = [];
        sources.forEach(source => {
            let stateId: string;
            const observable = this.getObservableFrom(source.data);
            try {
                stateId = this.generateStateId(source.id);
                if (stateId && isObservable(this.observables[stateId]?.observable)) {
                    observables.push(this.observables[stateId].observable.pipe(map(object => object.data)));
                } else if (isObservable(observable)) {
                    observables.push(this.set(observable));
                } else {
                    return this.tryGetFromPersistency(source.id);
                }
            } catch {
                observables.push(this.set(observable));
            }
        });
        return forkJoin(observables);
    }

    persistGet(itemId: IdType): Observable<T> {
        if (this.persistencyCallbacks && this.persistencyCallbacks.all instanceof Function) {
            const observable = this.persistencyCallbackToObserbable(this.persistencyCallbacks.get([itemId]));
            if (!observable) {
                return of<T>(null);
            } else {
                return observable.pipe(
                    map(objects => {
                        if (Array.isArray(objects)) {
                            return objects[0]?.data;
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

    persistGetAll(): Observable<T[]> {
        if (this.persistencyCallbacks && this.persistencyCallbacks.all instanceof Function) {
            return this.persistencyCallbackToObserbable(this.persistencyCallbacks.all()).pipe(
                map(objects => objects?.map(object => object.data))
            );
        } else {
            throwError('invalid_persistency_function');
        }
    }

    persistRemove(itemIds: IdType[]): Observable<boolean | void> {
        if (this.persistencyCallbacks && this.persistencyCallbacks.remove instanceof Function) {
            return this.persistencyCallbackToObserbable(this.persistencyCallbacks.remove(itemIds));
        } else {
            throwError('invalid_persistency_function');
        }
    }

    persistSet(items: T[]): Observable<boolean | void> {
        if (Array.isArray(items) && this.persistencyCallbacks && this.persistencyCallbacks.set instanceof Function) {
            return this.persistencyCallbackToObserbable(
                this.persistencyCallbacks.set(
                    items.map(item => {
                        return { data: item, lastUpdated: new Date() };
                    })
                )
            );
        } else {
            throwError('invalid_persistency_function');
        }
    }

    remove(id: IdType): void {
        const stateId = this.generateStateId(id);
        delete this.subjects[stateId];
        delete this.observables[stateId];
        // delete this.lastUpdated[stateId];

        if (this.persistencyCallbacks && this.persistencyCallbacks.set instanceof Function) {
            this.persistencyCallbacks.remove([id]);
        }
    }

    set(source: ObservableStateDataSource<T>): Observable<T> {
        const observable = this.getObservableFrom(source);
        if (!isObservable(observable)) {
            return throwError('invalid_observable');
        }
        return observable.pipe(
            tap(object => {
                const objectToPersist = this.addToState({ data: object });
                if (this.persistencyCallbacks && this.persistencyCallbacks.set instanceof Function) {
                    this.persistencyCallbacks.set([objectToPersist]);
                }
            })
        );
    }

    setMultiple(source: ObservableStateDataSource<T[]>, replaceExisting: boolean = true): Observable<T[]> {
        const observable = this.getObservableFrom(source);
        const objectToPersist: ObservableStateObject<T>[] = [];

        return observable.pipe(
            tap(objects => {
                objects?.forEach(object => {
                    const stateId = this.generateStateId(this.getObjectId(object));
                    if (replaceExisting || !this.exisitsInState(stateId)) {
                        objectToPersist.push(this.addToState({ data: object }));
                    }
                });
                if (this.persistencyCallbacks && this.persistencyCallbacks.set instanceof Function) {
                    this.persistencyCallbacks.set(objectToPersist);
                }
            })
        );
    }
}
