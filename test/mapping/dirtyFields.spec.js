describe('dirty fields', function () {


    var s = require('../../index')
        , assert = require('chai').assert;

    var Pouch = require('../../src/pouch');
    var Collection = require('../../src/collection').Collection;
    var RelationshipType = require('../../src/relationship').RelationshipType;

    var collection, carMapping, personMapping;

    var car, previousPerson, newPerson;

    beforeEach(function () {
        s.reset(true);
    });

    function assertCollectionAndGlobalNotDirtyWhenFirstMapped() {
        it('collection should not be dirty when first mapped', function () {
            assert.notOk(collection.isDirty);
        });

        it('global should not be dirty when first mapped', function () {
            assert.notOk(Collection.isDirty);
        });
    }

    function assertCarNotDirtyWhenFirstMapped() {
        it('car should not be dirty when first mapped', function () {
            assert.notOk(car.isDirty);
        });

        it('car mapping should not be dirty when first mapped', function () {
            assert.notOk(collection.Car.isDirty);
        });
        assertCollectionAndGlobalNotDirtyWhenFirstMapped();

    }

    function assertCollectionAndGlobalNoLongerDirty() {
        it('collection should no longer be dirty', function () {
            assert.notOk(collection.isDirty);
        });

        it('global should no longer be dirty', function () {
            assert.notOk(Collection.isDirty);
        });
    }

    function assertCarNoLongerDirty() {
        it('car should no longer be dirty', function () {
            assert.notOk(car.isDirty);
        });

        it('car collection should no longer be dirty', function () {
            assert.notOk(collection.Car.isDirty);
        });

        assertCollectionAndGlobalNoLongerDirty();
    }

    function assertCollectionAndGlobalShouldNowBeDirty() {
        it('collection should be dirty', function () {
            assert.ok(collection.isDirty);
        });

        it('global should be dirty', function () {
            assert.ok(Collection.isDirty);
        });
    }

    function assertCarShouldNowBeDirty() {
        it('car should be dirty', function () {
            assert.ok(car.isDirty);
        });

        it('car mapping should be dirty', function () {
            assert.ok(collection.Car.isDirty);
        });
        assertCollectionAndGlobalShouldNowBeDirty();

    }

    describe('attributes', function () {

        describe('standard', function () {
            var doc;

            beforeEach(function (done) {
                collection = new Collection('myCollection');
                carMapping = collection.mapping('Car', {
                    id: 'id',
                    attributes: ['colour', 'name']
                });
                collection.install(function (err) {
                    if (err) done(err);
                    carMapping.map({name: 'Aston Martin', colour: 'black'}, function (err, _car) {
                        if (err) done(err);
                        car = _car;
                        Pouch.getPouch().get(car._id, function (err, _doc) {
                            if (err) done(err);
                            doc = _doc;
                            done();
                        });
                    });
                });

            });

            assertCarNotDirtyWhenFirstMapped();

            it('when first mapped, should have all the same fields', function () {
                assert.equal(doc._id, car._id);
                assert.equal(doc.name, car.name);
                assert.equal(doc.colour, car.colour);
            });

            describe('change attributes', function () {

                beforeEach(function () {
                    car.name = 'Bentley';
                });


                assertCarShouldNowBeDirty();


                describe('save', function () {

                    beforeEach(function (done) {
                        car.save(done);
                    });

                    assertCarNoLongerDirty();

                });


            });
        });


        describe('arrays', function () {

            var doc;

            beforeEach(function (done) {

                collection = new Collection('myCollection');
                carMapping = collection.mapping('Car', {
                    id: 'id',
                    attributes: ['colours', 'name']
                });
                collection.install(function (err) {
                    if (err) done(err);
                    carMapping.map({name: 'Aston Martin', colours: ['black', 'red', 'green']}, function (err, _car) {
                        if (err) done(err);
                        car = _car;
                        assert.ok(car.colours.observer);
                        Pouch.getPouch().get(car._id, function (err, _doc) {
                            if (err) done(err);
                            doc = _doc;
                            done();
                        });
                    });
                });
            });

            assertCarNotDirtyWhenFirstMapped();

            it('when first mapped, should have all the same fields', function () {
                assert.equal(doc._id, car._id);
                assert.equal(doc.name, car.name);
                _.each(car.colours, function (c) {
                    assert.include(doc.colours, c);
                })
            });

            describe('change attributes', function () {
                describe('push element', function () {
                    beforeEach(function (done) {
                        car.colours.push('purple');
                        setTimeout(done);
                    });

                    assertCarShouldNowBeDirty();

                    describe('save', function () {

                        beforeEach(function (done) {
                            car.save(done);
                        });

                        assertCarNoLongerDirty();

                        it('should have made the change', function (done) {
                            Pouch.getPouch().get(car._id, function (err, doc) {
                                assert.include(doc.colours, 'purple');
                                assert.equal(doc.colours.length, 4);
                                done();
                            });
                        });

                    });

                });

                describe('pop element', function () {
                    beforeEach(function (done) {
                        car.colours.pop();
                        setTimeout(done);
                    });
                    assertCarShouldNowBeDirty();

                    describe('save', function () {

                        beforeEach(function (done) {
                            car.save(done);
                        });

                        assertCarNoLongerDirty();

                        it('should have made the change', function (done) {
                            Pouch.getPouch().get(car._id, function (err, doc) {
                                assert.equal(doc.colours.length, 2);
                                done();
                            });
                        });

                    });

                });

                describe('shift element', function () {
                    beforeEach(function (done) {
                        car.colours.shift();
                        setTimeout(done);
                    });

                    assertCarShouldNowBeDirty();


                    describe('save', function () {

                        beforeEach(function (done) {
                            car.save(done);
                        });

                        assertCarNoLongerDirty();

                        it('should have made the change', function (done) {
                            Pouch.getPouch().get(car._id, function (err, doc) {
                                assert.equal(doc.colours.length, 2);
                                done();
                            });
                        });

                    });

                });

                describe('unshift element', function () {
                    beforeEach(function (done) {
                        car.colours.unshift('purple');
                        setTimeout(done);
                    });
                    assertCarShouldNowBeDirty();

                    describe('save', function () {

                        beforeEach(function (done) {
                            car.save(done);
                        });

                        assertCarNoLongerDirty();

                        it('should have made the change', function (done) {
                            Pouch.getPouch().get(car._id, function (err, doc) {
                                assert.equal(doc.colours[0], 'purple');
                                assert.equal(doc.colours.length, 4);
                                done();
                            });
                        });

                    });

                });

                describe('sort array', function () {
                    beforeEach(function (done) {
                        car.colours.sort();
                        setTimeout(done);
                    });


                    assertCarShouldNowBeDirty();


                    describe('save', function () {

                        beforeEach(function (done) {
                            car.save(done);
                        });

                        assertCarNoLongerDirty();

                        it('should have made the change', function (done) {
                            Pouch.getPouch().get(car._id, function (err, doc) {
                                assert.equal(doc.colours[0], car.colours[0]);
                                assert.equal(doc.colours[1], car.colours[1]);
                                assert.equal(doc.colours[2], car.colours[2]);
                                assert.equal(doc.colours.length, 3);
                                done();
                            });
                        });

                    });

                });

                describe('reverse array', function () {
                    beforeEach(function (done) {
                        car.colours.reverse();
                        setTimeout(done);
                    });
                    assertCarShouldNowBeDirty();


                    describe('save', function () {

                        beforeEach(function (done) {
                            car.save(done);
                        });

                        assertCarNoLongerDirty();

                        it('should have made the change', function (done) {
                            Pouch.getPouch().get(car._id, function (err, doc) {
                                assert.equal(doc.colours[0], car.colours[0]);
                                assert.equal(doc.colours[1], car.colours[1]);
                                assert.equal(doc.colours[2], car.colours[2]);
                                assert.equal(doc.colours.length, 3);
                                done();
                            });
                        });

                    });

                });

                describe('set object at index', function () {
                    beforeEach(function (done) {
                        car.colours[1] = 'purple';
                        setTimeout(done);
                    });

                    assertCarShouldNowBeDirty();


                    describe('save', function () {

                        beforeEach(function (done) {
                            car.save(done);
                        });

                        assertCarNoLongerDirty();

                        it('should have made the change', function (done) {
                            Pouch.getPouch().get(car._id, function (err, doc) {
                                assert.equal(doc.colours[1], 'purple');
                                assert.equal(doc.colours[1], car.colours[1]);
                                done();
                            });
                        });

                    });

                });

                describe('splice', function () {
                    beforeEach(function (done) {
                        assert.ok(car.colours.observer);
                        car.colours.splice(1, 1, 'purple');
                        setTimeout(done);
                    });

                    it('car should be dirty', function () {
                        assert.ok(car.isDirty);
                    });

                    it('car mapping should be dirty', function () {
                        assert.ok(collection.Car.isDirty);
                    });
                    it('collection should be dirty', function () {
                        assert.ok(collection.isDirty);
                    });

                    it('global should be dirty', function () {
                        assert.ok(Collection.isDirty);
                    });

                    describe('save', function () {

                        beforeEach(function (done) {
                            car.save(done);
                        });

                        it('car should no longer be dirty', function () {
                            assert.notOk(car.isDirty);
                        });

                        it('car collection should no longer be dirty', function () {
                            assert.notOk(collection.Car.isDirty);
                        });

                        it('collection should no longer be dirty', function () {
                            assert.notOk(collection.isDirty);
                        });

                        it('global should no longer be dirty', function () {
                            assert.notOk(Collection.isDirty);
                        });

                        it('should have made the change', function (done) {
                            Pouch.getPouch().get(car._id, function (err, doc) {
                                assert.equal(doc.colours[1], 'purple');
                                assert.equal(doc.colours[1], car.colours[1]);
                                done();
                            });
                        });
                    });

                });
            });
        });
    });

    describe('relationships', function () {

        describe('foreign key', function () {
            beforeEach(function (done) {
                collection = new Collection('myCollection');
                carMapping = collection.mapping('Car', {
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
                personMapping = collection.mapping('Person', {
                    id: 'id',
                    attributes: ['name', 'age']
                });
                collection.install(function (err) {
                    if (err) done(err);
                    carMapping.map({name: 'Aston Martin', colour: 'black', owner: 'abcdef'}, function (err, _car) {
                        if (err) done(err);
                        car = _car;
                        previousPerson = car.owner;
                        assert.include(previousPerson.cars, car);
                        personMapping.map({name: 'Michael Ford', age: 23}, function (err, person) {
                            if (err) done(err);
                            newPerson = person;
                            assert.ok(previousPerson, 'previousPerson');
                            assert.ok(newPerson, 'newPerson');
                            done();
                        })
                    });
                });
            });

            it('car should not be dirty when first mapped', function () {
                assert.notOk(car.isDirty);
            });

            it('car mapping should not be dirty when first mapped', function () {
                assert.notOk(collection.Car.isDirty);
            });
            it('collection should not be dirty when first mapped', function () {
                assert.notOk(collection.isDirty);
            });

            it('global should not be dirty when first mapped', function () {
                assert.notOk(Collection.isDirty);
            });

            it('should have car fields setup correctly', function (done) {
                Pouch.getPouch().get(car._id, function (err, doc) {
                    if (err) done(err);
                    assert.equal(doc.colour, car.colour);
                    assert.equal(doc.name, car.name);
                    assert.equal(doc.owner, previousPerson._id);
                    done();
                });

            });

            it('should have person fields setup correctly', function (done) {
                Pouch.getPouch().get(previousPerson._id, function (err, doc) {
                    if (err) done(err);
                    assert.equal(doc.id, previousPerson.id);
                    done();
                });
            });

            describe('forward', function () {

                beforeEach(function (done) {
                    car.ownerProxy.set(newPerson, function (err) {
                        done(err);
                    });
                });

                it('car should be dirty', function () {
                    assert.ok(car.isDirty);
                });

                it('car mapping should be dirty', function () {
                    assert.ok(collection.Car.isDirty);
                });
                it('collection should be dirty', function () {
                    assert.ok(collection.isDirty);
                });

                it('global should be dirty', function () {
                    assert.ok(Collection.isDirty);
                });

                describe('save', function () {

                    beforeEach(function (done) {
                        car.save(done);
                    });

                    it('car should no longer be dirty', function () {
                        assert.notOk(car.isDirty);
                    });

                    it('car collection should no longer be dirty', function () {
                        assert.notOk(collection.Car.isDirty);
                    });

                    it('collection should no longer be dirty', function () {
                        assert.notOk(collection.isDirty);
                    });

                    it('global should no longer be dirty', function () {
                        assert.notOk(Collection.isDirty);
                    });

                    it('should have persisted the change to the car', function () {
                        Pouch.getPouch().get(car._id, function (err, doc) {
                            if (err) done(err);
                            assert.equal(doc.owner, newPerson._id);
                        });
                    });

                })

            });

            describe('reverse', function () {

                describe('add', function () {
                    beforeEach(function (done) {
                        newPerson.cars = [];
                        assert.ok(newPerson.cars.observer);
                        newPerson.cars.push(car);
                        setTimeout(done);
                    });

                    it('car should be dirty', function () {
                        assert.ok(car.isDirty);
                    });

                    it('car mapping should be dirty', function () {
                        assert.ok(collection.Car.isDirty);
                    });
                    it('collection should be dirty', function () {
                        assert.ok(collection.isDirty);
                    });

                    it('global should be dirty', function () {
                        assert.ok(Collection.isDirty);
                    });

                    describe('save', function () {

                        beforeEach(function (done) {
                            car.save(done);
                        });

                        assertCarNoLongerDirty();

                        it('should have persisted the change to the car', function () {
                            Pouch.getPouch().get(car._id, function (err, doc) {
                                if (err) done(err);
                                assert.equal(doc.owner, newPerson._id);
                            });
                        });

                    });

                });

                describe('set', function () {

                    beforeEach(function (done) {
                        newPerson.carsProxy.set([car], function (err) {
                            done(err);
                        });
                    });

                    assertCarShouldNowBeDirty();

                    describe('save', function () {

                        beforeEach(function (done) {
                            car.save(done);
                        });

                        assertCarNoLongerDirty();

                        it('should have persisted the change to the car', function () {
                            Pouch.getPouch().get(car._id, function (err, doc) {
                                if (err) done(err);
                                assert.equal(doc.owner, newPerson._id);
                            });
                        });

                    });

                });

                describe('remove', function () {
                    beforeEach(function (done) {
                        var idx = previousPerson.cars.indexOf(car);
                        previousPerson.cars.splice(idx, 1);
                        setTimeout(done);
                    });

                    assertCarShouldNowBeDirty();

                    describe('save', function () {

                        beforeEach(function (done) {
                            car.save(done);
                        });

                        assertCarNoLongerDirty();

                        it('should have persisted the change to the car', function () {
                            Pouch.getPouch().get(car._id, function (err, doc) {
                                if (err) done(err);
                                assert.notOk(doc.owner);
                            });
                        });

                    });
                });
            });
        });

        describe('one-to-one', function () {

            beforeEach(function (done) {
                collection = new Collection('myCollection');
                carMapping = collection.mapping('Car', {
                    id: 'id',
                    attributes: ['colour', 'name'],
                    relationships: {
                        owner: {
                            mapping: 'Person',
                            type: RelationshipType.OneToOne,
                            reverse: 'car'
                        }
                    }
                });
                personMapping = collection.mapping('Person', {
                    id: 'id',
                    attributes: ['name', 'age']
                });
                collection.install(function (err) {
                    if (err) done(err);
                    carMapping.map({name: 'Aston Martin', colour: 'black', owner: 'abcdef'}, function (err, _car) {
                        if (err) done(err);
                        car = _car;
                        previousPerson = car.owner;
                        personMapping.map({name: 'Michael Ford', age: 23}, function (err, person) {
                            if (err) done(err);
                            newPerson = person;
                            assert.ok(previousPerson);
                            assert.ok(newPerson);
                            done();
                        })
                    });
                });

            });

            describe('forward', function () {
                beforeEach(function (done) {
                    car.ownerProxy.set(newPerson, function (err) {
                        done(err);
                    });
                });

                assertCarShouldNowBeDirty();

                describe('save', function () {

                    beforeEach(function (done) {
                        car.save(done);
                    });

                    assertCarNoLongerDirty();

                    it('should have persisted the change to the car', function () {
                        Pouch.getPouch().get(car._id, function (err, doc) {
                            if (err) done(err);
                            assert.equal(doc.owner, newPerson._id);
                        });
                    });

                })
            });

            describe('reverse', function () {
                beforeEach(function (done) {
                    newPerson.carProxy.set(car, function (err) {
                        done(err);
                    });
                });

                assertCarShouldNowBeDirty();

                describe('save', function () {

                    beforeEach(function (done) {
                        car.save(done);
                    });

                    it('car should no longer be dirty', function () {
                        assert.notOk(car.isDirty);
                    });

                    it('car collection should no longer be dirty', function () {
                        assert.notOk(collection.Car.isDirty);
                    });

                    it('collection should no longer be dirty', function () {
                        assert.notOk(collection.isDirty);
                    });

                    it('global should no longer be dirty', function () {
                        assert.notOk(Collection.isDirty);
                    });

                    it('should have persisted the change to the car', function () {
                        Pouch.getPouch().get(car._id, function (err, doc) {
                            if (err) done(err);
                            assert.equal(doc.owner, newPerson._id);
                        });
                    });

                })
            });

        })

    });


});