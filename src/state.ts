import * as hash from 'object-hash';
import { forkJoin, from, isObservable, Observable, of, ReplaySubject, Subject, throwError } from 'rxjs';
import { filter, map, tap, flatMap } from 'rxjs/operators';
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

export class ObservableState<T, TId> {
    private readonly subjects: { [id: string]: SubjectOptions<T> } = {};
    private readonly observables: { [id: string]: ObservableOptions<T> } = {};

    readonly encoding: ObservableStateEncoding;
    readonly idProperty: string;
    readonly singleEntityMode: boolean;
    readonly ttl: number;

    constructor(options: ObservableStateOptions<T, TId>) {
        this.idProperty = options.idProperty;
        this.encoding = options.encoding ? options.encoding : 'plain';
        this.singleEntityMode = options.singleEntityMode;
        this.ttl = options.ttl ? options.ttl : 60 * 60 * 1000;
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
    private generateStateId(id?: TId): string {
        const stateId = this.generateStateIdInternal(id);
        if (this.observables[stateId] && this.isExpired(undefined, this.observables[stateId].lastUpdated)) {
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
        if (!isObservable(this.observables[stateId]?.observable) || !isObservable(this.subjects[stateId])) {
            this.subjects[stateId] = new ReplaySubject(1);
            this.observables[stateId] = { observable: this.subjects[stateId].asObservable() };
        }
        return stateId;
    }

    clear(): void {
        Object.keys(this.subjects).forEach(key => {
            delete this.subjects[key];
        });
        Object.keys(this.observables).forEach(key => {
            delete this.observables[key];
        });
    }

    count(): Observable<number> {
        return of(this.countStateItems());
    }

    create(object: T, source: ObservableStateDataSource<TId>): Observable<TId> {
        const observable = this.getObservableFrom(source);
        return observable.pipe(
            tap(id => {
                (object as any)[this.idProperty] = id;
                this.addToState({ data: object });
            })
        );
    }

    exists(id?: TId): Observable<boolean> {
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

        if (isObservable(this.observables[stateId]?.observable)) {
            return this.observables[stateId].observable.pipe(map(object => object.data));
        } else if (isObservable(observable)) {
            return this.set(observable);
        } else if (id) {
            return throwError('item_not_found');
        } else {
            return throwError('invalid_id_and_observable');
        }
    }

    getAllIds(): Observable<TId[]> {
        return forkJoin(
            Object.values(this.observables).map(observable =>
                observable?.observable?.pipe(map(object => this.getObjectId(object.data) as TId))
            )
        );
    }

    getAll(): Observable<T[]> {
        return forkJoin(Object.values(this.observables).map(item => item.observable.pipe(map(object => object.data))));
    }

    getMultiple(ids: TId[], breakOnNotFound?: boolean): Observable<T[]> {
        if (!Array.isArray(ids)) {
            return throwError('invalid_array');
        }
        return forkJoin(
            ids
                .map(id => {
                    const stateId = this.generateStateId(id);
                    if (isObservable(this.observables[stateId]?.observable)) {
                        return this.observables[stateId].observable.pipe(map(object => object.data));
                    } else if (breakOnNotFound) {
                        return throwError(`item_not_found: ${JSON.stringify(id)}`);
                    }
                })
                .filter(object => !!object)
        );
    }

    isExpired(id?: any, lastUpdated?: Date): boolean {
        const prevTime = lastUpdated ? lastUpdated : this.observables[this.generateStateIdInternal(id)]?.lastUpdated;
        if (!prevTime) {
            return false;
        }
        const thisTime = new Date();
        const diff = thisTime.getTime() - prevTime.getTime();
        return diff >= this.ttl;
    }

    remove(id: TId): void {
        const stateId = this.generateStateId(id);
        delete this.subjects[stateId];
        delete this.observables[stateId];
    }

    set(source: ObservableStateDataSource<T>): Observable<T> {
        const observable = this.getObservableFrom(source);
        if (!isObservable(observable)) {
            return throwError('invalid_observable');
        }
        return observable.pipe(
            tap(object => {
                this.addToState({ data: object });
            })
        );
    }

    setMultiple(
        source: ObservableStateDataSource<T[]>,
        replaceExisting: boolean = true,
        clearAll?: boolean
    ): Observable<T[]> {
        if (clearAll) {
            this.clear();
        }

        const observable = this.getObservableFrom(source);

        return observable.pipe(
            tap(objects => {
                objects?.forEach(object => {
                    const stateId = this.generateStateId(this.getObjectId(object));
                    if (replaceExisting || !this.exisitsInState(stateId)) {
                        this.addToState({ data: object });
                    }
                });
            })
        );
    }
}
