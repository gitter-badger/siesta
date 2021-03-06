var s = require('../../core/index'),
    assert = require('chai').assert;

describe('mapping queries', function () {

    var SiestaModel = require('../../core/modelInstance');
    var Collection = require('../../core/collection');
    var RelationshipType = require('../../core/RelationshipType');
    var cache = require('../../core/cache');

    before(function () {
        s.ext.storageEnabled = false;
    });

    beforeEach(function (done) {
        s.reset(done);
    });

    describe('queries', function () {
        var collection, mapping;
        beforeEach(function (done) {
            collection = s.collection('myCollection');
            mapping = collection.model('Car', {
                id: 'id',
                attributes: ['color', 'name']
            });
            s.install(function (err) {
                if (err) done(err);
                mapping.map([{
                    id: 4,
                    color: 'red',
                    name: 'Aston Martin'
                }, {
                    id: 5,
                    color: 'blue',
                    name: 'Ford'
                }], done);
            });
        });

        it('all', function (done) {
            mapping.all().execute(function (err, cars) {
                if (err) done(err);
                assert.equal(cars.length, 2);
                _.each(cars, function (car) {
                    assert.instanceOf(car, SiestaModel);
                });
                done();
            });
        });

        it('query', function (done) {
            this.timeout(10000);
            mapping.query({
                color: 'red'
            }).execute(function (err, cars) {
                if (err) done(err);
                assert.equal(cars.length, 1);
                _.each(cars, function (car) {
                    assert.instanceOf(car, SiestaModel);
                });
                done();
            });
        });

        it('get', function (done) {
            mapping.get(4, function (err, car) {
                if (err) done(err);
                assert.ok(car);
                assert.instanceOf(car, SiestaModel);
                assert.equal(car.color, 'red');
                done();
            });
        });


    });

    describe('reverse', function () {
        var carMapping, personMapping;

        var collection;

        beforeEach(function (done) {
            collection = s.collection('myCollection');
            Car = collection.model('Car', {
                id: 'id',
                attributes: ['colour', 'name'],
                relationships: {
                    owner: {
                        type: RelationshipType.OneToMany,
                        reverse: 'cars',
                        model: 'Person'
                    }
                }
            });
            Person = collection.model('Person', {
                id: 'id',
                attributes: ['name', 'age']
            });
            s.install(done);
        });

        it('cached', function (done) {
            Car.map({
                colour: 'red',
                name: 'Aston Martin',
                owner: {
                    name: 'Michael Ford',
                    age: 2,
                    id: '2'
                },
                id: 5
            }, function (err, car) {
                if (err) done(err);
                Person.get('2', function (err, p) {
                    if (err) done(err);
                    assert.ok(p, 'Should be able to fetch the person');
                    p.__proxies['cars'].get(function (err, cars) {
                        assert.equal(cars.length, 1);
                        assert.equal(cars[0].owner, p);
                        done(err);
                    });
                });
            });
        });
    });
});