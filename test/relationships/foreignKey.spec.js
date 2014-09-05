var s = require('../../index')
    , assert = require('chai').assert;

describe('foreign key relationship', function () {


    var Collection =  require('../../src/collection').Collection;

        var ForeignKeyRelationship =  require('../../src/foreignKeyRelationship').ForeignKeyRelationship;

        ;
    var collection, carMapping, personMapping;
    var person, car;
    var relationship;


    beforeEach(function (done) {
        s.reset(true);

        collection = new Collection('myCollection');
        carMapping = collection.mapping('Car', {
            id: 'id',
            attributes: ['colour', 'name']
        });
        personMapping = collection.mapping('Person', {
            id: 'id',
            attributes: ['name', 'age']
        });
        collection.install(function (err) {
            if (err) done(err);
            personMapping.map({name: 'Michael Ford', id: 'asdasd'}, function (err, _person) {
                if (err) done(err);
                person = _person;
                carMapping.map({colour: 'red', name: 'Aston Martin', id: 'asdasd'}, function (err, _car) {
                    if (err) done(err);
                    car = _car;
                    relationship = new ForeignKeyRelationship('owner', 'cars', carMapping, personMapping);
                    relationship.contributeToRestObject(car);
                    relationship.contributeToRestObject(person);
                    // Fake the relationship
                    car.owner._id = person._id;
                    person.cars._id = [car._id];
                    done();
                });
            });
        });

    });

    describe('get', function () {
        it('forward', function (done) {
            relationship.getRelated(car, function (err, related) {
                if (err) done(err);
                assert.equal(related, person);
                done();
            });
        });
        it('reverse', function (done) {
            relationship.getRelated(person, function (err, related) {
                if (err) done(err);
                assert.include(related, car);
                done();
            });
        });
    });

    describe('set', function () {

        describe('forward', function () {
            describe('none pre-existing', function () {
                it('should set forward', function (done) {
                    relationship.setRelated(car, person, function (err) {
                        if (err) done(err);
                        assert.equal(car.owner._id, person._id);
                        assert.equal(car.owner.relatedObject, person);
                        car.owner.get(function (err, related) {
                            if (err) done(err);
                            assert.equal(related, person);
                            done();
                        });
                    });
                });

                it('should set backward', function (done) {
                    relationship.setRelated(car, person, function (err) {
                        if (err) done(err);
                        assert.include(person.cars._id, car._id);
                        assert.include(person.cars.relatedObject, car);
                        person.cars.get(function (err, related) {
                            if (err) done(err);
                            assert.include(related, car);
                            done();
                        });
                    });
                });
            });

            describe('pre-existing', function () {
                var anotherPerson;
                beforeEach(function (done) {
                    anotherPerson = personMapping.map({name: 'Robbie Mcdonald', age: 18, id: 'remotePersonId2'}, function (err, _anotherPerson) {
                        if (err) done(err);
                        anotherPerson = _anotherPerson;
                        relationship.contributeToRestObject(anotherPerson);
                        done();
                    });
                });

                describe('set another object', function () {
                    it('should set forward', function (done) {
                        relationship.setRelated(car, anotherPerson, function (err) {
                            if (err) done(err);
                            assert.equal(car.owner._id, anotherPerson._id);
                            assert.equal(car.owner.relatedObject, anotherPerson);
                            car.owner.get(function (err, related) {
                                if (err) done(err);
                                assert.equal(related, anotherPerson);
                                done();
                            });
                        })
                    });
                    it('should set backward of new object', function (done) {
                        relationship.setRelated(car, anotherPerson, function (err) {
                            if (err) done(err);
                            assert.equal(anotherPerson.cars._id.length, 1);
                            assert.equal(anotherPerson.cars.relatedObject.length, 1);
                            assert.include(anotherPerson.cars._id, car._id);
                            assert.include(anotherPerson.cars.relatedObject, car);
                            anotherPerson.cars.get(function (err, related) {
                                if (err) done(err);
                                assert.include(related, car);
                                done();
                            });
                            done();
                        })
                    });
                    it('should remove backward of old object', function (done) {
                        relationship.setRelated(car, anotherPerson, function (err) {
                            if (err) done(err);
                            assert.equal(person.cars._id.length, 0);
                            assert.equal(person.cars.relatedObject.length, 0);
                            done();
                        })
                    });
                });

                describe('set null', function () {
                    it('should set forward', function (done) {
                        relationship.setRelated(car, null, function (err) {
                            if (err) done(err);
                            assert.notOk(car.owner._id);
                            assert.notOk(car.owner.relatedObject);
                            done();
                        });
                    });
                    it('should remove backward of old object', function (done) {
                        relationship.setRelated(car, null, function (err) {
                            if (err) done(err);
                            assert.equal(person.cars._id.length, 0);
                            assert.equal(person.cars.relatedObject.length, 0);
                            done();
                        })
                    });
                });
            });
        });

        describe('reverse', function () {

            describe('removeRelated', function () {
                describe('remove object from reverse', function () {
                    it('should remove the car from the person', function (done) {
                        relationship.removeRelated(person, car, function (err) {
                            if (err) done(err);
                            assert.equal(person.cars._id.length, 0);
                            assert.equal(person.cars.relatedObject.length, 0);
                            done();
                        });
                    });
                    it('should nullify the cars owner', function (done) {
                        relationship.removeRelated(person, car, function (err) {
                            if (err) done(err);
                            assert.notOk(car.owner._id);
                            assert.notOk(car.owner.relatedObject);
                            done();
                        });
                    });

                });
            });

            describe('setRelated', function () {

                var person;
                var cars;

                beforeEach(function (done) {
                    personMapping.map({name: 'Bob Marley', age: 76, id: 'a395ush'}, function (err, _person) {
                        if (err) done(err);
                        person = _person;
                        carMapping.map([
                            {colour: 'red', name: 'Aston Martin', id: '36yedfhdfgswftwsdg'},
                            {colour: 'blue', name: 'Lambo', id: 'asd03r0hasdfsd'},
                            {colour: 'green', name: 'Ford', id: "nmihoahdabf"}
                        ], function (err, objs) {
                            if (err) done(err);
                            cars = objs;
                            // For some reason loses its binding.
                            _.each(cars, _.bind(relationship.contributeToRestObject, relationship));
                            relationship.contributeToRestObject(person);
                            relationship.setRelated(person, cars, function (err) {
                                done(err)
                            });
                        });
                    });
                });

                describe('no previous', function () {
                    it('all cars should have person as their owner', function () {
                        _.each(cars, function (c) {
                            assert.equal(c.owner.relatedObject, person);
                            assert.equal(c.owner._id, person._id);
                        });
                    });

                    it('person should have all cars', function () {
                        _.each(cars, function (c) {
                            assert.include(person.cars.relatedObject, c);
                            assert.include(person.cars._id, c._id);
                        });
                    });
                });

                describe('has previous', function () {
                    var newCars;
                    beforeEach(function (done) {
                        carMapping.map([
                            {colour: 'purple', name: 'Aston Martin', id: 'fjfg9iwmf'},
                            {colour: 'bright yellow', name: 'Lambo', id: 'kjgds8yh92n'}
                        ], function (err, objs) {
                            if (err) done(err);
                            newCars = objs;
                            // For some reason loses its binding.
                            _.each(newCars, _.bind(relationship.contributeToRestObject, relationship));
                            relationship.setRelated(person, newCars, function (err) {
                                done(err)
                            });
                        });
                    });

                    it('all new cars should have person as their owner', function () {
                        _.each(newCars, function (c) {
                            assert.equal(c.owner.relatedObject, person);
                            assert.equal(c.owner._id, person._id);
                        });
                    });

                    it('person should have all cars', function () {
                        _.each(newCars, function (c) {
                            assert.include(person.cars.relatedObject, c);
                            assert.include(person.cars._id, c._id);
                        });
                    });

                    it('person should no longer have the old cars', function () {
                        _.each(cars, function (c) {
                            assert.notInclude(person.cars.relatedObject, c);
                            assert.notInclude(person.cars._id, c._id);
                        });
                    });

                    it('the old cars should no longer have the person as their owner', function () {
                        _.each(cars, function (c) {
                            assert.notOk(c.owner.relatedObject);
                            assert.notOk(c.owner._id);
                        });
                    });
                });

            });

        })


    });


});