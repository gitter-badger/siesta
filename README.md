Fount
====
Fount is inspired by:

* CoreData
    * Single source of truth
    * Persistence
* RestKit
    * Mappings
    * Descriptors
* Django
    * URL configs
* South
    * Migrations
* CouchDB/PouchDB (and makes use of the latter)
    * Synchronisation

## Quick Start

### Step 1: Installation

TODO

### Step 2: Create a collection

A `Collection` describes a set of models and can be either used locally or hooked up to a remote collection.

```javascript
var collection = new Collection('MyCollection', function configure (err, version) {
    if (!err) {
        if (!version) { // MyCollection has never been configured on this browser.
            // Base URL. Only necessary if you're going to be interfacing with a remote data source.
            this.setBaseURL('http://mysite.com/collection/');
            configureObjectMappings(this);
            configureDescriptors(this);
        }
    }
    else {
        handleError(err);
    }
}, function done () {
    // All done.
    doStuff();
});
```

### Step 3: Configure Object Mappings

Your object mappings describe the models within the collection.

```javascript
function configureObjectMappings(collection) {
    // Car Mapping
    collection.registerMapping('Car', {
        id: 'id',
        relationships: {
            owner: {
                mapping: 'Person',
                type: RelationshipType.ManyToOne,
                reverse: 'cars' // Will show up on Person objects
            }
        },
        attributes: ['model', 'colour', 'licensePlate'],
        indexes: ['colour'] // id is automatically indexed
    });
    
    // Person Mapping
    collection.registerMapping('Person', {
        id: 'id',
        attributes: ['name', 'age']
    });
}
```

### Step 4: Configure Request/Response Descriptors

Descriptors map HTTP request and responses onto your object mappings and perform the appropriate action.

```javascript
function configureDescriptors(collection) {
    // Request descriptors
    collection.registerRequestDescriptor({
        path: 'cars/',
        method: 'POST',
        mapping: 'Car',
        data: 'data' // Serialise to {data: {...}} when sending the request.
    });
    collection.registerRequestDescriptor({
        path: 'cars/:id/'
        method: 'PUT',
        mapping: 'Car',
        data: 'data' // Serialise to {data: {...}} when sending the request.
    });
    
    // Response descriptors
    collection.registerResponseDescriptor({
        path: 'cars/(.*)/',
        method: '*', // Any method
        mapping: 'Car',
        data: 'data' // Deserialise from data field in JSON response when receiving.
    });
}
```

### Step 5: Obtain some remote data.

```javascript
// Get objects
collection.GET('cars/', function (err, cars) {
    console.log('I got me some cars!', cars);
});

collection.GET('cars/5', function (err, car) {
    console.log('I got me a car!', car);
});

// Create objects 
var person = new collection.Person({name: 'Michael'});
collection.POST('people/', person, function (err, car) {
    if (!err) { 
        var car = new collection.Car({colour: red, owner: person});
        promise = car.post().then(function () {
            // Do some stuff.
        }).catch(function (err) {
            // Handle error.
        });
    }
    else {
        // Handle error.
    }
});
person.POST(function (err) {

});

// Update object
person.name = 'Bob';
person.PATCH(function (err) {
    // ...
});

// Delete object
person.DELETE(function (err) {
    // ...
});

```

### Step 6: Play with local data

Objects obtained remotely will be persisted using the defined object mappings. Therefore if 
the same object with the same id is downloaded multiple times it will be mapped onto the same
javascript object i.e. a single source of truth. 

The best way to explain this concept is by way of example:

```javascript

// Get all cars that are stored locally.
collection.Car.all(function (err, cars) {
    /* 
        cars = [{colour: 'blue', model: 'Aston Martin', id: 5}]
    */
    var car = cars[0];
    
    // Get all people that are stored remotely.
    collection.('people/').get(function (err, people) {
        /*
            people = [{
                id: 4,
                name: 'michael',
                cars: [{colour: 'red', model: 'Aston Martin', id: 5}]
            }];
        */
        
        console.log(car); // LOG: {colour: 'red', model: 'Aston Martin', id: 5}
    });
    
  
    
});
```

Previously we described a relationship between `Person` objects and `Car` objects and also noted that cars are
uniquely identified by the `id` field. Our `Car` object is hashed using this identifier and is updated. This is as opposed to
other frameworks where we would end up with two `Car` objects that describe the same remote resource
but at different moments in time. We have a single source of truth.


## Other Features

### Pagination

Pagination is configured in the descriptors. By default we expect no pagination. 
Example:

```javascript
collection.registerResponseDescriptor({
    path: 'cars/',
    method: 'GET',
    mapping: 'Car',
    pagination: {
        count: 'count', 
        nextPage: 'next',
        previousPage: 'previous',
        data: 'data'
    }
});
```

If the collection allows us to specify pageSize etc we can do so using the following once this response descriptor
is configured:

```javascript
collection.get('cars/', {page_size: 5}).then(function (cars) { 
    // ... 
});
```

### Notifications

Notifications are sent via `$rootScope` for a variety of situations.

#### HTTP Requests

The notification looks as follows:

```javascript
{
	 name: 'POST MyCollection Car',
    type: 'Car',
    collection: 'MyCollection',
    obj: Object{}, // The object in question
    mapping: { ... }, // The 'Car' mapping.
    requestDescriptor: { ... }, // The request descriptor used to perform the serialisation.
    request: {path: 'cars/', data: {...}} // The HTTP request sent to the server.
}
```

Here are some examples:

```javascript

// Sent on sending of POST request to server for any object.
$rootScope.on('POST', function (notification) {
    console.log(notification);
});

// Sent on sending of POST request to server of a Car.
$rootScope.on('POST MyCollection Car', function (notification) {
    console.log(notification);
});

// Sent on successful response of POST of a Car.
$rootScope.on('POST MyCollection Car success', function (notification) {
    console.log(notification);
});

```

#### Updates

Notifications are also sent when fields on particular objects have changed e.g. after a successful response
mapping or after a local modification.

```javascript
$rootScope.on('Car', function (notification) {
    console.log(notification);
    /*
       LOG: {
             name: 'Car', // Name of the notification
             object: {  // The object that has been posted to the server.
                 colour: 'blue', 
                 owner: function getter() { ... } 
             },
             changes: [{
                 type: 'updated',
                 key: 'colour',
                 old: 'red',
                 new: 'blue'
             }]
        }
    */
    // Relationships are not neccessarilly cached and may be stored on
    // disk instead hence the use of a getter function.
    notification.object.owner.get(function (err, person) {
        console.log(person);
    });
});
```

### Schema Migrations

Schema migrations are rudimentary at the moment. If you detect a change in version when setting
up the Rest collection you can either delete all the data and start from scratch:

```javascript
var collection = new Collection('MyCollection', function (err, version) {
    if (!err) {
        if (version) {
            if (version !== MY_VERSION) {
                collection.reset();
            }
        }
        doFirstTimeSetup();
    }
    else {
        handleError(err);
    }
});
```

or you could implement a migration scheme:

```javascript
var collection = new Collection('MyCollection', function (err, version) {
    if (!err) {
        if (!version) {
            doFirstTimeSetup();
            collection.setVersion(THIRD_VERSION);
        }
        if (version < SECOND_VERSION) {
            addSomeMappings();
            collection.setVersion(SECOND_VERSION);
        }
        if (version < THIRD_VERSION) {
            addSomeIndexes(); 
            collection.setVersion(THIRD_VERSION);
        }
        // ... and so on.
    }
    else {
        handleError(err);
    }
});
```

The problem with this is that things could quickly get out of hand. I would suggest having a migrations
module like follows:

```javascript
angular.module('myApp.rest.migrations')

    .factory('applyMigrations', function (migrations, fromScratch) {
        return function (collection) {
            if (!collection.version) {
                fromScratch(collection);
            }
            else {
                _.each(migrations, function (migration) {
                    if (collection.version < migration.version) {
                        migration.apply(collection);
                        collection.version = migration.version;
                    }
                });
            }
        }
    })

    .factory('migrations', function (Migration1, Migration2) {
        return [Migration1, Migration2];
    })
    
    .factory('fromScratch', function () {
        return function (collection) {
            // First time setup.
        };
    })
    
    .factory('Migration1', function () {
        return {
            version: 1,
            apply: function () {
                // Add mappings, indexes, change data etc
            };
        }
    })    
    
    .factory('Migration2', function () {
        return {
            version: 2,
            apply: function () {
                // Add some more mappings, indexes, change data etc
            };
        }
    })
```

and then when you setup the Rest collection:

```javascript
var collection = new Collection('MyCollection', function (err, version) {
    if (!err) {
        applyMigrations(collection);
    }
    else {
        handleError(err);
    }
});
```

### Database synchronisation

We can synchronise with CouchDB instances thanks to the use of PouchDB behind the scenes.

TODO

## Recipes

Useful stuff that can be done with the combination of <rest> and the underlying PouchDB.

### 

### Custom Views

TODO: Install custom PouchDB views. Useful for analysis of data etc.

## Contributing

### Getting setup

Download dependencies:

```bash
git clone https://github.com/mtford90/rest
cd rest
npm install
bower install
```

Run the tests to check all is working as expected:

```bash
grunt test
```

During development it's useful to watch for changes and execute tests automatically:

```bash
grunt watch
```

Note that with mocha we can use `only` to run an individual test/block of tests:

```
it.only('test', function () {
    // Do test.
});

describe.only('block of tests', function () {
    it('...', function () {
        // ...
    });
});
```

## To Sort

Things that don't have a home yet.

### RestError

`RestError` is an extension to Javascript's `Error` class.

* `RestError.message` describes the error.
* `RestError.context` gives some useful context.

### Relationships

#### Foreign Key

If we have the following mappings:

```javascript
carMapping = collection.registerMapping('Car', {
    id: 'id',
    attributes: ['colour', 'name'],
    relationships: {
        owner: {
            mapping: 'Person',
            type: RelationshipType.ForeignKey,
            reverse: 'cars'
        }
    }
});

personMapping = collection.registerMapping('Person', {
    id: 'id',
    attributes: ['name', 'age']
});
```

A `Car` object will have the following properties due to this relationship.

```javascript
Car.owner._id; // Locally unique identifier for the Person that this car belongs to.
Car.owner.relatedObject; // The Person object itself (if has been fetched).

// Fetches the owner of the car using ownerId. Note that this does not fetch from the remote source.
Car.owner.get(function (err, owner) { 
    // Car.owner.relatedObject will now be populated if no error.
}); 

Car.owner.set(person, function (err) {
	// Called once persisted.
});

Person.cars.set([car1, car2], function (err) {
	// Called once persisted.
});
```


### HTTP

Below are some example HTTP requests. The responses from these requests are passed through the descriptors and mapped into Fount.

#### GET

The cars will be deserialised as per the response descriptor.

```javascript
collection.GET('cars/', function (err, cars) {
    console.log('I got me some cars!', cars);
});

collection.GET('cars/5', function (err, car) {
    console.log('I got me a car!', car);
});

// See https://docs.angularjs.org/api/ng/service/$http
var opts = {
	params: {
		queryParam1: 'something'
		queryParam2: 'something else'
	},
	headers: {
		x-my-header: 'some value'
	},
	requestType: 'json',
	responseType: 'json'
};

collection.GET('cars/', opts, function (err, cars) {
    console.log('I got me some cars!', cars);
});

collection.GET('cars/5', opts, function (err, car) {
    console.log('I got me a car!', car);
});
```

#### POST/PUT/PATCH

The person will be serialised as per the request descriptor and deserialised as per the response descriptor.

```javascript
var person = new collection.Person({name: 'Michael'});

// See https://docs.angularjs.org/api/ng/service/$http
var opts = {
	params: {
		queryParam1: 'something'
		queryParam2: 'something else'
	},
	headers: {
		x-my-header: 'some value'
	},
	// Added to the body alongside whatever is serialised.
	// This will ignore the request descriptor.
	data: { 
		key: {
			value: 'xyz'
		}
	}
	requestType: 'json',
	responseType: 'json'
};

collection.POST('people/', person, opts, function (err, person) {
    // ...
});

collection.PUT('people/' + person.id, person, opts, function (err, person) {
    // ...
});

collection.PATCH('people/' + person.id, person, opts, function (err, person) {
    // ...
});
```

#### DELETE

```javascript
console.log(person._id); // 'xyz'
collection.DELETE('people/' + person.id, person, opts, function (err) {
    if (!err) {
    	console.log(person._id); // null
    }
    else {
    	console.log(person._id); // 'xyz'
    }
});
```
