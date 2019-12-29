import { SubscribableOrPromise } from 'rxjs';

export type ObservableStateDataSource<SourceType> = SubscribableOrPromise<SourceType> | SourceType;
