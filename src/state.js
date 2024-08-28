const EventEmitter = require('events');

class ItemState {
    data;
    lastUpdated;
}

// for browser we don't need to define CustomEvent but we need to run it on node
class CustomEvent extends Event {
    detail;
    constructor(message, data) {
        super(message, data);

        this.detail = data.detail;
    }
}

class ObservableState {
    state = {};

    idProperty;
    singleEntityMode;
    ttl;

    event;
    eventEmmitter;
    eventTarget;

    constructor(options) {
        this.idProperty = options.idProperty;
        this.eventEmmitter = new EventEmitter();
        this.eventTarget = new EventTarget();
    }

    stateChanged(operation, id, itemState) {
        // NodeJS event emmitter
        this.eventEmmitter.emit('state-changed', operation, id, itemState);

        // JS event target
        var stateEvent = new CustomEvent('state-changed', { detail: { operation, id, itemState } });
        this.eventTarget.dispatchEvent(stateEvent);
    }

    getObjectId(object) {
        return object[this.idProperty];
    }

    initializeState(stateId) {
        if (!this.state[stateId]) {
            this.state[stateId] = new ItemState();
        }
        return stateId;
    }

    set(object) {
        if (!object) {
            throw new Error('undefined_object');
        }

        const stateId = JSON.stringify(this.getObjectId(object));
        this.initializeState(stateId);
        this.state[stateId].lastUpdated = new Date();
        this.state[stateId].data = object;

        this.stateChanged('set', stateId, { ...this.state[stateId] });
        return object;
    }

    isExpired(id, lastUpdated) {
        if (!this.ttl) {
            return false;
        }
        let prevTime;
        if (lastUpdated) {
            prevTime = lastUpdated;
        } else if (id) {
            prevTime = this.state[JSON.stringify(id)].lastUpdated;
        }

        if (!prevTime) {
            return false;
        }
        const thisTime = new Date();
        const diff = thisTime.getTime() - prevTime.getTime();
        return diff >= this.ttl;
    }

    count() {
        return Object.keys(this.state).length;
    }

    exisits(id) {
        const stateId = JSON.stringify(id);
        return !!this.state[stateId];
    }

    remove(id) {
        const stateId = JSON.stringify(id);
        delete this.state[stateId];
        this.stateChanged('remove', stateId);
    }

    clear() {
        Object.keys(this.state).forEach((key) => {
            delete this.state[key];
        });
        this.stateChanged('clear');
    }

    get(id) {
        return this.state[JSON.stringify(id)];
    }

    getAllIds() {
        return this.getAll().map((object) => this.getObjectId(object));
    }

    getAll() {
        return Object.values(this.state)
            .filter((stateItem) => stateItem.data && !this.isExpired(undefined, stateItem.lastUpdated))
            .map((stateItem) => stateItem.data);
    }

    getMultiple(ids) {
        return ids.map((id) => this.state[JSON.stringify(id)]);
    }
    test() {}
}

var state = new ObservableState({ idProperty: 'id' });

state.eventEmmitter.on('state-changed', (operation, id, itemState) => {
    console.log('---------------');
    console.log('EventEmmitter');
    console.log(operation);
    console.log(id);
    console.log(itemState && itemState.lastUpdated);
    console.log(itemState && itemState.data);
});
state.eventTarget.addEventListener('state-changed', (event) => {
    console.log('---------------');
    console.log('EventTarget');
    console.log(event.detail.operation);
    console.log(event.detail.id);
    console.log(event.detail.itemState && event.detail.itemState.lastUpdated);
    console.log(event.detail.itemState && event.detail.itemState.data);
});

console.log('========= set =========');
state.set({ id: 1, test: 'test1' });
state.set({ id: 2, test: 'test2' });
state.set({ id: 3, test: 'test3' });

console.log('========= exists/count/remove =========');

console.log(state.count());
console.log(state.exisits(1));
console.log(state.remove(1));
console.log(state.exisits(1));
console.log(state.count());

console.log('========= get/clear/count =========');

console.log(state.get(2));
console.log(state.clear());
console.log(state.count());
