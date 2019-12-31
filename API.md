<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [rxjs-observable-state - v0.0.16](#rxjs-observable-state---v0016)
  - [Index](#index)
    - [External modules](#external-modules)
- [Classes](#classes)
  - [Class: ObservableState <**T, TId**>](#class-observablestate-t-tid)
    - [Type parameters](#type-parameters)
    - [Hierarchy](#hierarchy)
    - [Index](#index-1)
    - [Constructors](#constructors)
    - [Properties](#properties)
    - [Methods](#methods)
- [Interfaces](#interfaces)
  - [Interface: ObservableStateObject <**T**>](#interface-observablestateobject-t)
    - [Type parameters](#type-parameters-1)
    - [Hierarchy](#hierarchy-1)
    - [Index](#index-2)
    - [Properties](#properties-1)
  - [Interface: ObservableStateOptions <**T, TId**>](#interface-observablestateoptions-t-tid)
    - [Type parameters](#type-parameters-2)
    - [Hierarchy](#hierarchy-2)
    - [Index](#index-3)
    - [Properties](#properties-2)
- [Modules](#modules)
  - [External module: "data-source"](#external-module-data-source)
    - [Index](#index-4)
    - [Type aliases](#type-aliases)
  - [External module: "encoding"](#external-module-encoding)
    - [Index](#index-5)
    - [Type aliases](#type-aliases-1)
  - [External module: "index"](#external-module-index)
  - [External module: "state"](#external-module-state)
    - [Index](#index-6)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


<a name="readmemd"></a>

[rxjs-observable-state - v0.0.16](#readmemd)

# rxjs-observable-state - v0.0.16

## Index

### External modules

* ["data-source"](#modules_data_source_md)
* ["encoding"](#modules_encoding_md)
* ["index"](#modules_index_md)
* ["state"](#modules_state_md)

# Classes


<a name="classes_state_observablestatemd"></a>

[rxjs-observable-state - v0.0.16](#readmemd) › ["state"](#modules_state_md) › [ObservableState](#classes_state_observablestatemd)

## Class: ObservableState <**T, TId**>

### Type parameters

▪ **T**

▪ **TId**

### Hierarchy

* **ObservableState**

### Index

#### Constructors

* [constructor](#constructor)

#### Properties

* [encoding](#encoding)
* [idProperty](#idproperty)
* [singleEntityMode](#singleentitymode)
* [ttl](#ttl)

#### Methods

* [clear](#clear)
* [count](#count)
* [create](#create)
* [exists](#exists)
* [filter](#filter)
* [get](#get)
* [getAll](#getall)
* [getAllIds](#getallids)
* [getMultiple](#getmultiple)
* [isExpired](#isexpired)
* [remove](#remove)
* [set](#set)
* [setMultiple](#setmultiple)

### Constructors

####  constructor

\+ **new ObservableState**(`options`: [ObservableStateOptions](#interfaces_state_observablestateoptionsmd)‹T, TId›): *[ObservableState](#classes_state_observablestatemd)*

*Defined in [state.ts:38](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/state.ts#L38)*

**Parameters:**

Name | Type |
------ | ------ |
`options` | [ObservableStateOptions](#interfaces_state_observablestateoptionsmd)‹T, TId› |

**Returns:** *[ObservableState](#classes_state_observablestatemd)*

### Properties

####  encoding

• **encoding**: *[ObservableStateEncoding](#observablestateencoding)*

*Defined in [state.ts:35](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/state.ts#L35)*

___

####  idProperty

• **idProperty**: *string*

*Defined in [state.ts:36](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/state.ts#L36)*

___

####  singleEntityMode

• **singleEntityMode**: *boolean*

*Defined in [state.ts:37](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/state.ts#L37)*

___

####  ttl

• **ttl**: *number*

*Defined in [state.ts:38](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/state.ts#L38)*

### Methods

####  clear

▸ **clear**(): *void*

*Defined in [state.ts:119](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/state.ts#L119)*

**Returns:** *void*

___

####  count

▸ **count**(): *Observable‹number›*

*Defined in [state.ts:128](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/state.ts#L128)*

**Returns:** *Observable‹number›*

___

####  create

▸ **create**(`object`: T, `source`: [ObservableStateDataSource](#observablestatedatasource)‹TId›): *Observable‹TId›*

*Defined in [state.ts:132](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/state.ts#L132)*

**Parameters:**

Name | Type |
------ | ------ |
`object` | T |
`source` | [ObservableStateDataSource](#observablestatedatasource)‹TId› |

**Returns:** *Observable‹TId›*

___

####  exists

▸ **exists**(`id?`: TId): *Observable‹boolean›*

*Defined in [state.ts:142](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/state.ts#L142)*

**Parameters:**

Name | Type |
------ | ------ |
`id?` | TId |

**Returns:** *Observable‹boolean›*

___

####  filter

▸ **filter**(`filterFn`: function): *Observable‹T[]›*

*Defined in [state.ts:146](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/state.ts#L146)*

**Parameters:**

▪ **filterFn**: *function*

▸ (`object`: T): *boolean*

**Parameters:**

Name | Type |
------ | ------ |
`object` | T |

**Returns:** *Observable‹T[]›*

___

####  get

▸ **get**(`id?`: TId, `source?`: [ObservableStateDataSource](#observablestatedatasource)‹T›): *Observable‹T›*

*Defined in [state.ts:171](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/state.ts#L171)*

Gets an object from the state.
Both parameters are optional but at least one must be specified.

**Parameters:**

Name | Type |
------ | ------ |
`id?` | TId |
`source?` | [ObservableStateDataSource](#observablestatedatasource)‹T› |

**Returns:** *Observable‹T›*

the state item wrapped in an observable

___

####  getAll

▸ **getAll**(): *Observable‹T[]›*

*Defined in [state.ts:203](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/state.ts#L203)*

**Returns:** *Observable‹T[]›*

___

####  getAllIds

▸ **getAllIds**(): *Observable‹TId[]›*

*Defined in [state.ts:195](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/state.ts#L195)*

**Returns:** *Observable‹TId[]›*

___

####  getMultiple

▸ **getMultiple**(`ids`: TId[], `breakOnNotFound?`: boolean): *Observable‹T[]›*

*Defined in [state.ts:207](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/state.ts#L207)*

**Parameters:**

Name | Type |
------ | ------ |
`ids` | TId[] |
`breakOnNotFound?` | boolean |

**Returns:** *Observable‹T[]›*

___

####  isExpired

▸ **isExpired**(`id?`: any, `lastUpdated?`: Date): *boolean*

*Defined in [state.ts:225](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/state.ts#L225)*

**Parameters:**

Name | Type |
------ | ------ |
`id?` | any |
`lastUpdated?` | Date |

**Returns:** *boolean*

___

####  remove

▸ **remove**(`id`: TId): *void*

*Defined in [state.ts:235](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/state.ts#L235)*

**Parameters:**

Name | Type |
------ | ------ |
`id` | TId |

**Returns:** *void*

___

####  set

▸ **set**(`source`: [ObservableStateDataSource](#observablestatedatasource)‹T›): *Observable‹T›*

*Defined in [state.ts:241](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/state.ts#L241)*

**Parameters:**

Name | Type |
------ | ------ |
`source` | [ObservableStateDataSource](#observablestatedatasource)‹T› |

**Returns:** *Observable‹T›*

___

####  setMultiple

▸ **setMultiple**(`source`: [ObservableStateDataSource](#observablestatedatasource)‹T[]›, `replaceExisting`: boolean, `clearAll?`: boolean): *Observable‹T[]›*

*Defined in [state.ts:253](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/state.ts#L253)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`source` | [ObservableStateDataSource](#observablestatedatasource)‹T[]› | - |
`replaceExisting` | boolean | true |
`clearAll?` | boolean | - |

**Returns:** *Observable‹T[]›*

# Interfaces


<a name="interfaces_state_observablestateobjectmd"></a>

[rxjs-observable-state - v0.0.16](#readmemd) › ["state"](#modules_state_md) › [ObservableStateObject](#interfaces_state_observablestateobjectmd)

## Interface: ObservableStateObject <**T**>

### Type parameters

▪ **T**

### Hierarchy

* **ObservableStateObject**

### Index

#### Properties

* [data](#data)
* [lastUpdated](#lastupdated)

### Properties

####  data

• **data**: *T*

*Defined in [state.ts:22](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/state.ts#L22)*

___

####  lastUpdated

• **lastUpdated**: *Date*

*Defined in [state.ts:23](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/state.ts#L23)*


<a name="interfaces_state_observablestateoptionsmd"></a>

[rxjs-observable-state - v0.0.16](#readmemd) › ["state"](#modules_state_md) › [ObservableStateOptions](#interfaces_state_observablestateoptionsmd)

## Interface: ObservableStateOptions <**T, TId**>

### Type parameters

▪ **T**

▪ **TId**

### Hierarchy

* **ObservableStateOptions**

### Index

#### Properties

* [encoding](#optional-encoding)
* [idProperty](#idproperty)
* [singleEntityMode](#optional-singleentitymode)
* [ttl](#optional-ttl)

### Properties

#### `Optional` encoding

• **encoding**? : *[ObservableStateEncoding](#observablestateencoding)*

*Defined in [state.ts:13](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/state.ts#L13)*

___

####  idProperty

• **idProperty**: *string*

*Defined in [state.ts:11](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/state.ts#L11)*

___

#### `Optional` singleEntityMode

• **singleEntityMode**? : *boolean*

*Defined in [state.ts:12](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/state.ts#L12)*

___

#### `Optional` ttl

• **ttl**? : *number*

*Defined in [state.ts:14](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/state.ts#L14)*

# Modules


<a name="modules_data_source_md"></a>

[rxjs-observable-state - v0.0.16](#readmemd) › ["data-source"](#modules_data_source_md)

## External module: "data-source"

### Index

#### Type aliases

* [ObservableStateDataSource](#observablestatedatasource)

### Type aliases

####  ObservableStateDataSource

Ƭ **ObservableStateDataSource**: *SubscribableOrPromise‹SourceType› | SourceType*

*Defined in [data-source.ts:3](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/data-source.ts#L3)*


<a name="modules_encoding_md"></a>

[rxjs-observable-state - v0.0.16](#readmemd) › ["encoding"](#modules_encoding_md)

## External module: "encoding"

### Index

#### Type aliases

* [ObservableStateEncoding](#observablestateencoding)

### Type aliases

####  ObservableStateEncoding

Ƭ **ObservableStateEncoding**: *"plain" | "base64" | "md5" | "sha1"*

*Defined in [encoding.ts:1](https://github.com/rodrigovillaca/rxjs-observable-state/blob/839186f/src/encoding.ts#L1)*


<a name="modules_index_md"></a>

[rxjs-observable-state - v0.0.16](#readmemd) › ["index"](#modules_index_md)

## External module: "index"




<a name="modules_state_md"></a>

[rxjs-observable-state - v0.0.16](#readmemd) › ["state"](#modules_state_md)

## External module: "state"

### Index

#### Classes

* [ObservableState](#classes_state_observablestatemd)

#### Interfaces

* [ObservableStateObject](#interfaces_state_observablestateobjectmd)
* [ObservableStateOptions](#interfaces_state_observablestateoptionsmd)
