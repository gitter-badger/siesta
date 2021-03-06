---
layout: Getting_Started
title: Getting Started
sidebar: nav2.html
---

## {{page.title}}

This guide will get you up and running with Siesta with minimal effort.

### Step 1: Installation

Use of Siesta varies depending on your project setup. You can use a script tag:

```html
<!-- Entire siesta bundle-->
<script src="https://github.com/mtford90/siesta/releases/download/{{site.version}}/siesta.bundle.min.js"></script>
<!-- Modular -->
<script src="https://github.com/mtford90/siesta/releases/download/{{site.version}}/siesta.core.min.js"></script>
<script src="https://github.com/mtford90/siesta/releases/download/{{site.version}}/siesta.http.min.js"></script>
```

Alternatively if you're using a bundler based on CommonJS (browserify, webpack etc) you can `require` siesta and any extensions after running `npm install siesta-orm --save`.

```js
var siesta = require('siesta'); // No extensions
var siesta = require('siesta')({http: require('siesta/http'))}); // HTTP extension
```

### Step 2: Create a collection

A `Collection` describes a set of models and optionally a REST API containing the resources the collection will represent.

```javascript
var collection = new siesta.Collection('MyCollection');
collection.baseURL = 'http://api.mysite.com';
```

### Step 3: Configure object mappings

The mapping is the Siesta equivalent to models in traditional database ORMs. It describes how attributes and relationships in resources are mapped onto Javascript objects.

A simple mapping will only declare attributes:

```javascript
collection.model('Person', {
    attributes: ['name', 'age']
});
```

A more complex mapping will define relationships with others:

```javascript
collection.model('Car', {
    // The field that uniquely identifies a Car object.
    id: 'id',
    // Attributes represent simple data types such as strings and integers.
    attributes: ['model', 'colour', 'licensePlate'],
    // Relationships with other remote objects. 
    // In this case a Car has an owner, and a Person can own many cars.
    relationships: {
        owner: {
            mapping: 'Person',
            type: 'OneToMany',
            reverse: 'cars' 
        }
    }
});
```

### Step 4: Configure descriptors

Descriptors are used to *describe* web services with which we want to interact. When a HTTP request is sent or a HTTP response is received, descriptors are used to map data to the object graph in the case of HTTP responses and to serialise data into JSON in the case of HTTP requests.

An example response descriptor:

```javascript
collection.descriptor({
    path: 'cars/(.*)/',
    method: 'GET', 
    mapping: 'Car',
    // Deserialise from data field in JSON response when receiving.
    data: 'data' 
});
```

An example request descriptor:

```javascript
collection.descriptor({
    path: 'cars/',
    method: 'POST',
    mapping: 'Car'
});
```

A more complex descriptor could use a regular expression:

```javascript
collection.descriptor({
    path: 'cars/([a-b0-9]+)/'
    method: ['PUT', 'PATCH'],
    mapping: 'Car',
    data: 'data' // Serialise to {data: {...}} when sending the request.
});
```

### Step 6: Install the collection

Before we can use our collection we need to install it. This will configure the descriptors and mappings, hooking up any relationships and will return an error if anything is incorrect with the declarations.

```javascript
s.install(function (err) {
    if (err) { 
        // Handle error.
    }
    else {
        // Do stuff.
    }
});
```

### Step 7: Obtain some remote data

The descriptors declared earlier will be used to determine how to map the response bodies onto objects that we have locally.

```javascript
collection.GET('cars/').then(function (cars) {
    console.log('I got me some cars!', cars);
});

collection.GET('cars/5').then(function (car) {
    console.log('I got me a car!', car);
});
```

### Step 8: Create some remote data

The descriptors declared above will also be used to determine how to serialise our models when sending them to the server.

```javascript
Person.map({name: 'Bob'}).then(function (person){
    collection.POST('people/', person, function (err) {
        // Done.
    });
});
```

### Step 9: Query local data

We can query for objects that have been mapped and held locally (either in-memory or persisted) by using the local query API.

```js
collection.Car.all().then(function (allCars) {
    // ...
});

collection.Car.query({colour: 'Red'}).then(function (redCars) {
    // ...
});

collection.Person.query({age__lt: 30}).then(function (peopleUnderThirty) {
    // ...
});
```