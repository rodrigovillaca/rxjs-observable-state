import { SubscribableOrPromise } from 'rxjs';

export type ObservableDataSource<SourceType> = SubscribableOrPromise<SourceType> | SourceType;
