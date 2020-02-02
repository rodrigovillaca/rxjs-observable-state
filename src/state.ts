import * as hash from 'object-hash';
import { from, isObservable, Observable, of, ReplaySubject, Subject, throwError, BehaviorSubject } from 'rxjs';
import { map, tap, flatMap, first, skipWhile, catchError } from 'rxjs/operators';
import { ObservableStateDataSource } from './data-source';
import { ObservableStateEncoding } from './encoding';

const isPromise = (value: any): value is PromiseLike<any> => {
    return !!value && typeof value.subscribe !== 'function' && typeof value.then === 'function';
};
export interface ObservableStateOptions<T, TId> {
    idProperty: string;
    singleEntityMode?: boolean;
    encoding?: ObservableStateEncoding;
    ttl?: number;
}

class ItemState<T> {
    data?: T;
    readonly subject: Subject<T>;
    readonly observable: Observable<T>;
    lastUpdated?: Date;
    constructor() {
        this.subject = new ReplaySubject(1);
        this.observable = this.subject.asObservable();
    }
}

export class ObservableState<T, TId> {
    private readonly state: { [id: string]: ItemState<T> } = {};

    private readonly stateUpdatedSubject = new ReplaySubject<void>(1);
    private readonly stateUpdated = this.stateUpdatedSubject.asObservable();

    readonly encoding: ObservableStateEncoding;
    readonly idProperty: string;
    readonly singleEntityMode: boolean;
    readonly ttl: number;
    loading: Subject<boolean> = new ReplaySubject<boolean>(1);

    constructor(options: ObservableStateOptions<T, TId>) {
        this.idProperty = options.idProperty;
        this.encoding = options.encoding ? options.encoding : 'plain';
        this.singleEntityMode = options.singleEntityMode;
        this.ttl = options.ttl ? options.ttl : undefined;
        this.stateUpdatedSubject.next(null);
        this.loading.next(false);
    }

    private addToState(object: T): T {
        if (!object) {
            throw new Error('undefined_object');
        }

        const stateId = this.generateStateId(this.getObjectId(object));
        this.initializeState(stateId);
        this.state[stateId].lastUpdated = new Date();
        this.state[stateId].data = object;
        this.state[stateId]?.subject?.next(Object.assign({}, object));
        return object;
    }

    private mergeToState(object: T): T {
        if (!object) {
            throw new Error('undefined_object');
        }

        const stateId = this.generateStateId(this.getObjectId(object));
        this.initializeState(stateId);
        this.state[stateId].lastUpdated = new Date();
        object = this.state[stateId].data ? Object.assign(this.state[stateId].data, object) : object;

        this.state[stateId].data = object;
        this.state[stateId]?.subject?.next(Object.assign({}, object));
        return object;
    }

    private countStateItems(): number {
        return Object.keys(this.state).length;
    }

    private exisitsInState(id?: any): boolean {
        const stateId = this.generateStateId(id);
        return !!this.state[stateId];
    }

    private generateStateId(id?: TId): string {
        const stateId = this.generateStateIdInternal(id);
        if (this.state[stateId] && this.isExpired(id, this.state[stateId].lastUpdated)) {
            this.remove(id);
        }
        return stateId;
    }

    private generateStateIdInternal(id?: TId): string {
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

    private getObjectId(object: T): TId {
        return (object as any)[this.idProperty] as TId;
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
        if (!this.state[stateId]) {
            this.state[stateId] = new ItemState<T>();
        }
        return stateId;
    }

    clear(): void {
        Object.keys(this.state).forEach(key => {
            delete this.state[key];
        });
    }

    count(): Observable<number> {
        return this.stateUpdated.pipe(map(() => this.countStateItems()));
    }

    create(object: T, source: ObservableStateDataSource<TId>): Observable<TId> {
        const observable = this.getObservableFrom(source);
        return observable
            .pipe(
                map(id => {
                    (object as any)[this.idProperty] = id;
                    this.addToState(object);
                    this.stateUpdatedSubject.next();
                    return id;
                })
            )
            .pipe(first())
            .pipe(
                flatMap(id => {
                    const stateId = this.generateStateId(id);
                    if (stateId && this.state[stateId]) {
                        return this.state[stateId].observable.pipe(map(item => (item as any)[this.idProperty] as TId));
                    } else {
                        return of(null);
                    }
                })
            );
    }

    exists(id?: TId): Observable<boolean> {
        return this.stateUpdated.pipe(map(() => this.exisitsInState(id)));
    }

    filter(filterFn: (object: T) => boolean): Observable<T[]> {
        return this.stateUpdated.pipe(
            map(() =>
                Object.values(this.state)
                    .filter(
                        stateItem =>
                            !!stateItem?.data &&
                            this.isExpired(undefined, stateItem.lastUpdated) &&
                            filterFn(stateItem.data)
                    )
                    .map(stateItem => stateItem.data)
            )
        );
    }

    /**
     *
     * Gets an object from the state.
     * Both parameters are optional but at least one must be specified.
     *
     * @param [id] - the unique identifier for the object being retrieved - The type is TId - TId is defined when creating the state object
     * @param  [source] - item to be retrieved, it can be: T, Observervable<T>, Promise<T> - T is defined when creating the state object
     *
     *
     * @returns the state item wrapped in an observable
     */
    get(id?: TId, source?: ObservableStateDataSource<T>): Observable<T> {
        const observable = this.getObservableFrom(source);
        const stateId = this.generateStateId(id);

        return this.loading
            .pipe(skipWhile(loading => loading))
            .pipe(first())
            .pipe(
                flatMap(() => {
                    if (isObservable(this.state[stateId]?.observable)) {
                        return this.state[stateId].observable;
                    } else if (isObservable(observable)) {
                        return this.set(observable);
                    } else if (id) {
                        return throwError('item_not_found');
                    } else {
                        return throwError('invalid_id_and_observable');
                    }
                })
            );
    }

    getAllIds(): Observable<TId[]> {
        return this.getAll().pipe(map(objects => objects.map(object => this.getObjectId(object))));
    }

    getAll(): Observable<T[]> {
        return this.stateUpdated.pipe(
            map(() =>
                Object.values(this.state)
                    .filter(stateItem => stateItem.data && !this.isExpired(undefined, stateItem.lastUpdated))
                    .map(stateItem => stateItem.data)
            )
        );
    }

    getMultiple(ids: TId[], breakOnNotFound?: boolean): Observable<T[]> {
        if (!Array.isArray(ids)) {
            return throwError('invalid_array');
        }

        return this.stateUpdated.pipe(
            map(() =>
                ids
                    .map(id => {
                        const stateId = this.generateStateId(id);
                        if (this.state[stateId]?.data) {
                            return this.state[stateId]?.data;
                        } else if (breakOnNotFound) {
                            throw new Error(`item_not_found: ${JSON.stringify(id)}`);
                        } else {
                            return null as T;
                        }
                    })
                    .filter(object => !!object)
            )
        );
    }

    isExpired(id?: any, lastUpdated?: Date): boolean {
        if (!this.ttl) {
            return false;
        }
        let prevTime: Date;
        if (lastUpdated) {
            prevTime = lastUpdated;
        } else if (id) {
            prevTime = this.state[this.generateStateIdInternal(id)]?.lastUpdated;
        }

        if (!prevTime) {
            return false;
        }
        const thisTime = new Date();
        const diff = thisTime.getTime() - prevTime.getTime();
        return diff >= this.ttl;
    }

    remove(id: TId): void {
        const stateId = this.generateStateId(id);
        delete this.state[stateId];
        this.stateUpdatedSubject.next();
    }

    set(source: ObservableStateDataSource<T>, merge?: boolean, isDataLoad?: boolean): Observable<T> {
        const sourceObservable = this.getObservableFrom(source);
        if (!isObservable(sourceObservable)) {
            return throwError('invalid_observable');
        }

        const observable = this.loading
            .pipe(skipWhile(loading => loading))
            .pipe(first())
            .pipe(
                flatMap(() => {
                    if (isDataLoad) {
                        this.loading.next(true);
                    }
                    return sourceObservable;
                })
            );

        return observable
            .pipe(
                map(object => {
                    if (merge) {
                        this.mergeToState(object);
                    } else {
                        this.addToState(object);
                    }
                    if (isDataLoad) {
                        this.loading.next(false);
                    }
                    this.stateUpdatedSubject.next();
                    return object;
                })
            )
            .pipe(first())
            .pipe(
                flatMap(object => {
                    const stateId = this.generateStateId(this.getObjectId(object));

                    if (stateId && this.state[stateId]) {
                        return this.state[stateId].observable;
                    } else {
                        return of(null);
                    }
                })
            )
            .pipe(
                catchError(error => {
                    if (isDataLoad) {
                        this.loading.next(false);
                    }
                    return throwError(error);
                })
            );
    }

    setMultiple(
        source: ObservableStateDataSource<T[]>,
        options: {
            replaceExisting?: boolean;
            merge?: boolean;
            clearAll?: boolean;
            isDataLoad?: boolean;
        } = { replaceExisting: true }
    ): Observable<T[]> {
        if (options.clearAll) {
            this.clear();
        }
        const sourceObservable = this.getObservableFrom(source);
        if (!isObservable(sourceObservable)) {
            return throwError('invalid_observable');
        }

        const observable = this.loading
            .pipe(skipWhile(loading => loading))
            .pipe(first())
            .pipe(
                flatMap(() => {
                    if (options.isDataLoad) {
                        this.loading.next(true);
                    }
                    return sourceObservable;
                })
            );

        return observable
            .pipe(
                map(objects => {
                    objects?.forEach(object => {
                        const stateId = this.generateStateId(this.getObjectId(object));
                        if (options.merge) {
                            this.mergeToState(object);
                        } else if (options.replaceExisting || !this.exisitsInState(stateId)) {
                            this.addToState(object);
                        }
                    });

                    if (options.isDataLoad) {
                        this.loading.next(false);
                    }
                    this.stateUpdatedSubject.next();

                    return objects;
                })
            )
            .pipe(first())
            .pipe(
                flatMap(objects => {
                    return this.stateUpdated.pipe(
                        map(() =>
                            objects.map(object => {
                                const stateId = this.generateStateId(this.getObjectId(object));
                                return this.state[stateId].data;
                            })
                        )
                    );
                })
            )
            .pipe(
                catchError(error => {
                    if (options.isDataLoad) {
                        this.loading.next(false);
                    }
                    return throwError(error);
                })
            );
    }
}
