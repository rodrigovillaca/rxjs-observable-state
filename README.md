# rxjs-observable-state

A simple and effective rxjs state management solution. Can be used on any rxjs application, currently using it with angular/ionic.

- [rxjs-observable-state](#rxjs-observable-state)
  - [Install](#install)
  - [Simple Example](#simple-example)
  - [Setting up the state](#setting-up-the-state)
    - [ObservableState object](#observablestate-object)
    - [ObservableStateOptions](#observablestateoptions)
    - [Setting up state Example](#setting-up-state-example)
  - [Using the state](#using-the-state)
    - [get](#get)
    - [getMultiple](#getmultiple)
    - [getAll](#getall)
    - [getAllIds](#getallids)
    - [set](#set)
    - [setMultiple](#setmultiple)
    - [remove](#remove)
    - [create](#create)
    - [filter](#filter)
    - [count](#count)
    - [exists](#exists)
    - [clear](#clear)
  - [Angular](#angular)
  - [Full API](#full-api)
  - [TODO](#todo)

It is a generic implementation the observable data service pattern widely used for state management in angular applications, more information at: 
https://blog.angular-university.io/how-to-build-angular2-apps-using-rxjs-observable-data-services-pitfalls-to-avoid/ 

This is a way to reduce the amount of code necessary to setup a state management in any application that uses rxjs.

For an angular8 wrapper of this module visit: 
https://github.com/rodrigovillaca/ngx-observable-state

## Install

Run:
``` 
npm install rxjs-observable-state --save 
```

## Simple Example

A quick example for a brief idea:

```js
import { ObservableState } from 'rxjs-observable-state';

interface MyData {
    id: string;
    description: string;
    quantity: number;
}

class Example {
    constructor(){
        this.state = new ObservableState<MyData, string>({ idproperty: 'id'})    
 
        // the subscriptions should be unsubscribed as usual
        this.set().subscribe(() => console.log('saved'));
        this.data.subscribe(item => console.log(item));
    }

    get data(): Observable<MyData> {
        return this.state.get('id1');
    }

    // sets the data from an object, promise or observable
    set(): Observable<MyData>  {
        return this.state.set({id: 'id1', decription: 'test', quantitiy: 10});
    }
}
```

Following more detailed documentation.


## Setting up the state

To setup a new state for one object type create an ObservableState passing the object type and the object id type as type parameters and pass an ObservableStateOptions the constructor. 

### ObservableState object

The object signature for ObservableState is: 
```js
ObservableState<T, TId>(options: ObservableStateOptions)
```
### ObservableStateOptions

The options object is defined like bellow:
```typescript
{
    idProperty: string;
    singleEntityMode?: boolean;
    encoding?: 'plain' | 'base64' | 'md5' | 'sha1';
    ttl?: number;
}
```
- idProperty (required): the name of the object property used as an unique identifier
- singleEntityMode: for creating a state that will only store one item, like the user example bellow
- encoding: the state keys are basically an output of a JSON.stringify(id) encoded/hashed using one the following options -   'plain' | 'base64' | 'md5' | 'sha1'
- ttl - the amount of time that we 

### Setting up state Example
The example bellow shows how to create a state for three types of objects using some of the different options available.

```js
import { ObservableState, ObservableStateOptions } from 'rxjs-observable-state';

interface MyColor {
    id?: number;
    color: string;
    available: boolean;
}

interface MyData {
    id?: string;
    description: string;
    quantity: number;
}

interface MyUserId {
     token: string; 
     lastLogin: Date;
}

interface MyUser {
    id: MyUserId;
    color: string;
    available: boolean;
}

const userStateOptions:  = { idproperty: 'id', singleEntityMode: true}

// the ttl is in miliseconds, this multiplication represents one day.
this.colorState = new ObservableState<MyColor, number>({ idproperty: 'id', ttl: 24 * 60 * 60 * 10000})
this.dataState = new ObservableState<MyData, string>({ idproperty: 'id'})
this.userState = new ObservableState<MyUser, MyUserId>({ idproperty: 'id', singleEntityMode: true, encoding: 'sha1'})
```

## Using the state

All the state CRUD functions that accept data as type object or wrapped in a promise or observable. All the CRUD functions retrun an observable.

For example:
```js

const data: MyData = {id: 'id1', decription: 'test', quantitiy: 10};
this.state.set(data).subscribe();

const observable: Observable<MyData> = of(data);
this.state.set(data).subscribe();

const promise: Promise<MyData> = Promise.resolve(datA);
this.state.set(data).subscribe();
```

The follwoing examples will bes using observables as input. Remember that you unsubscribe when done with the data operationsm as usual in rxjs applications.

### get

Retrieve an existing item from the state. 

There are two parameters for this function:
- id - the unique identifier for the object being retrieved - The type is TId - TId is defined when creating the state object
- source - item to be retrieved, it can be: `T, Observervable<T>, Promise<T>` - T is defined when creating the state object
  
Both parameters are optional but at least one is required.

- If id is speficified:
  - if item exits on the state, this item is returned
  - if item not exists:
    - run observable if provided:
      - if item from observable exits on the state, this item is returned
      - if not update the state with the item from the observable
    - if observable not exists:
      - throw exception
  
- If id is not specified:
    - run observable if provided:
      - if item from observable exits on the state, this item is returned
      - if not update the state with the item from the observable
    - if observable not exists:
      - throw exception

```js
this.state.get('id1').subscribe((dataFromState: MyData) => console.log(dataFromState));

const data: MyData = {id: 'id1', decription: 'test', quantitiy: 10};
this.state.get('id1', data).subscribe((dataFromState: MyData) => console.log(dataFromState));

```

### getMultiple

Retrieves multiple items by id from the state. 
There are two parameters for this function:
- ids - required - an array of ids to be returned
- breakOnNotFound - optional - if set to true an exception will be thrown if any of the items are not found

```js

this.state.getMultiple(['id1','id2']).subscribe((items: MyData[]) => items.forEach((data: MyData) => console.log(data)));
```


### getAll
Retrieves all items from the state. 
```js

this.state.getAll().subscribe((items: MyData[]) => items.forEach((data: MyData) => console.log(data)));
```

### getAllIds

Retrieves all item ids from the state. 


```js
this.state.getAllIds().subscribe((items: MyIdType[]) => items.forEach((id: MyIdType) => console.log(id)));
```




### set

Adds or updates an item in the state.

Takes only 1 required parameter:
 - source - item to be set, it can be: `T, Observervable<T>, Promise<T>` - T is defined when creating the state object

Returns the source as an observable.

```js
const data: MyData = {id: 'id', decription: 'test', quantitiy: 10};
this.state.set(data).subscribe((data: MyData) => console.log(data)));
```

### setMultiple


Adds or updates multiples items in the state.

Takes those parameters:
 - source - required - items to be set, it can be: `T[], Observervable<T[]>, Promise<T[]>` - T is defined when creating the state object
 - replaceExisting - set to false to not replace existing items, by default is true.
 - cleaAll - clear the state before loading items into it.

Returns the source as an observable.

```js
const data: MyData[] = [{id: 'id', decription: 'test', quantitiy: 10}, {id: 'id2', decription: 'test2', quantitiy: 100}];
this.state.setMultiple(of(data)).subscribe((items: MyData[]) => items.forEach((dataReturned: MyData) => console.log(dataReturned)));
```


### remove

Removes an item from the state:

Returns void.

```js
const data: MyData = {id: 'id', decription: 'test', quantitiy: 10};
this.state.remove(data.id);
```

### create

Usefull if you have an api that provides an id after creating items. If your api returns the full newly object use set function instead.
It requires two parameters:
-   object - an object without id
-   source - an observable/promise that will return an id, or the id itself

Adds the object to the state and returns the id wrapped in an observable.

```js
const data: MyData = {decription: 'test', quantitiy: 10};
this.state.create(data, createUserObservableOrPromise).subscribe(id => data.id = id);
```

### filter

Returns a list of results that satisty a condition.

```js
this.state.filter((object: MyData) => object.quatity >= 1 ).subscribe((hasQuantity: boolean) => console.log(hasQuantity));
```


### count

Returns an observable with the total count of items in the state/

```js
this.state.count().subscribe((count: number) => console.log(count));
```

### exists

Returns an boolean observable determinig if an id exists at the state.

```js
this.state.exists().subscribe((exists: boolean) = > console.log(count));
```

### clear

Clears all the objects from the state.

```js
this.state.clear()'
```


## Angular

If you are using angular you might want to make a server that inherite the state class, like the example bellow:


```js
const options = { idproperty: 'id'}

@Injectable({
    providedIn: 'root'
})
export class MyDataService extends ObservableState<MyData, string> {
    constructor(options: ObservableStateOptions<MyData, string>) {
        super(options);
    }
}
```

Other way of using it is through dependecy injection through the following package:
https://github.com/rodrigovillaca/ngx-observable-state




## Full API

[Click here for a full api Documentation - API.md](API.md)

## TODO
documentation on comments, document error handling