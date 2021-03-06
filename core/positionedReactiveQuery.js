/**
 * Solves the common problem of maintaining the order of a set of a models and querying on that order.
 *
 * The same as ReactiveQuery but enables manual reordering of models and maintains an index field.
 */

var ReactiveQuery = require('./reactiveQuery'),
    log = require('./log'),
    util = require('./util'),
    InternalSiestaError = require('./error').InternalSiestaError,
    _ = util._;


var Logger = log.loggerWithName('PositionedReactiveQuery');

function PositionalReactiveQuery(query) {
    ReactiveQuery.call(this, query);
    this.indexField = 'index';
}

PositionalReactiveQuery.prototype = Object.create(ReactiveQuery.prototype);

_.extend(PositionalReactiveQuery.prototype, {
    _refreshIndexes: function () {
        var results = this.results,
            indexField = this.indexField;
        if (!results) throw new InternalSiestaError('PositionalReactiveQuery must be initialised');
        for (var i = 0; i < results.length; i++) {
            var modelInstance = results[i];
            modelInstance[indexField] = i;
        }
    },
    _mergeIndexes: function () {
        var results = this.results,
            newResults = [],
            outOfBounds = [],
            unindexed = [];
        for (var i = 0; i < results.length; i++) {
            var res = results[i],
                storedIndex = res[this.indexField];
            if (storedIndex == undefined) { // null or undefined
                unindexed.push(res);
            }
            else if (storedIndex > results.length) {
                outOfBounds.push(res);
            }
            else {
                // Handle duplicate indexes
                if (!newResults[storedIndex]) {
                    newResults[storedIndex] = res;
                }
                else {
                    unindexed.push(res);
                }
            }
        }
        outOfBounds = _.sortBy(outOfBounds, function (x) {
            return x[this.indexField];
        }.bind(this));
        // Shift the index of all models with indexes out of bounds into the correct range.
        for (i = 0; i < outOfBounds.length; i++) {
            res = outOfBounds[i];
            var resultsIndex = this.results.length - outOfBounds.length + i;
            res[this.indexField] = resultsIndex;
            newResults[resultsIndex] = res;
        }
        unindexed = this._query._sortResults(unindexed);
        var n = 0;
        while (unindexed.length) {
            res = unindexed.shift();
            while (newResults[n]) {
                n++;
            }
            newResults[n] = res;
            res[this.indexField] = n;
        }

        this.results = newResults;


    },
    init: function (cb) {
        var deferred = util.defer(cb);
        ReactiveQuery.prototype.init.call(this, function (err) {
            if (!err) {
                if (!this.model.hasAttributeNamed(this.indexField)) {
                    err = 'Model "' + this.model.name + '" does not have an attribute named "' + this.indexField + '"';
                }
                else {
                    this._mergeIndexes();
                    this._query.clearOrdering();
                }
            }
            deferred.finish(err);
        }.bind(this));
        return deferred.promise;
    },
    orderBy: function (field, cb) {
        var deferred = util.defer(cb);
        ReactiveQuery.prototype.orderBy.call(this, field, function (err) {
            if (!err) {
                // We do not want to reorder on every update. Ordering is handled by the user instead with
                // positional reactive queries.
                if (this.initialised) {
                    this._query.clearOrdering();
                    this._refreshIndexes();
                }
            }
            deferred.finish(err);
        }.bind(this));
        return deferred.promise;
    },
    clearOrdering: function (cb) {
        this._query.clearOrdering();
        var deferred = util.defer(cb);
        deferred.resolve();
        return deferred.promise;
    },
    _handleNotif: function (n) {
        // We don't want to keep executing the query each time index changes. We're changing
        // the index ourselves.
        if (n.field != this.indexField) {
            ReactiveQuery.prototype._handleNotif.call(this, n);
            this._refreshIndexes();
        }
        else {
            this.emit('change', this.results);
        }
    },
    validateIndex: function (idx) {
        var maxIndex = this.results.length - 1,
            minIndex = 0;
        if (!(idx >= minIndex && idx <= maxIndex)) {
            throw new Error('Index ' + idx.toString() + ' is out of bounds');
        }
    },
    swapObjectsAtIndexes: function (from, to) {
        //noinspection UnnecessaryLocalVariableJS
        this.validateIndex(from);
        this.validateIndex(to);
        var fromModel = this.results[from],
            toModel = this.results[to];
        if (!fromModel) {
            throw new Error('No model at index "' + from.toString() + '"');
        }
        if (!toModel) {
            throw new Error('No model at index "' + to.toString() + '"');
        }
        this.results[to] = fromModel;
        this.results[from] = toModel;
        fromModel[this.indexField] = to;
        toModel[this.indexField] = from;
    },
    swapObjects: function (obj1, obj2) {
        var fromIdx = this.results.indexOf(obj1),
            toIdx = this.results.indexOf(obj2);
        this.swapObjectsAtIndexes(fromIdx, toIdx);
    },
    move: function (from, to) {
        this.validateIndex(from);
        this.validateIndex(to);
        (function (oldIndex, newIndex) {
            if (newIndex >= this.length) {
                var k = newIndex - this.length;
                while ((k--) + 1) {
                    this.push(undefined);
                }
            }
            this.splice(newIndex, 0, this.splice(oldIndex, 1)[0]);
        }).call(this.results, from, to);
        this._refreshIndexes();
    }
});

module.exports = PositionalReactiveQuery;