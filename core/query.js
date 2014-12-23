/**
 * @module query
 */

var log = require('./operation/log')
    , cache = require('./cache')
    , util = require('./util');

var Logger = log.loggerWithName('Query');
Logger.setLevel(log.Level.warn);

/**
 * @class  [Query description]
 * @param {Model} mapping
 * @param {Object} opts
 */
function Query(mapping, opts) {
    this.mapping = mapping;
    this.query = opts;
    this.ordering = null;
}

_.extend(Query, {
    comparators: {
        e: function (opts) {
            console.log('e', opts.field);
            return opts.object[opts.field] == opts.value;
        },
        lt: function (opts) {
            if (!opts.invalid) return opts.object[opts.field] < opts.value;
            return false;
        },
        gt: function (opts) {
            if (!opts.invalid) return opts.object[opts.field] > opts.value;
            return false;
        },
        lte: function (opts) {
            if (!opts.invalid) return opts.object[opts.field] <= opts.value;
            return false;
        },
        gte: function (opts) {
            if (!opts.invalid) return opts.object[opts.field] >= opts.value;
            return false;
        }
    },
    registerComparator: function (symbol, fn) {
        if (!this.comparators[symbol])
            this.comparators[symbol] = fn;
    }
});

function cacheForMapping(mapping) {
    var cacheByType = cache._localCacheByType;
    var mappingName = mapping.type;
    var collectionName = mapping.collection;
    var cacheByMapping = cacheByType[collectionName];
    var cacheByLocalId;
    if (cacheByMapping) {
        cacheByLocalId = cacheByMapping[mappingName] || {};
    }
    return cacheByLocalId;
}

_.extend(Query.prototype, {
    execute: function (callback) {
        var deferred = window.q ? window.q.defer() : null;
        callback = util.constructCallbackAndPromiseHandler(callback, deferred);
        this._executeInMemory(callback);
        return deferred ? deferred.promise : null;
    },
    _dump: function (asJson) {
        return asJson ? '{}' : {};
    },
    _sortResults: function (res) {
        if (res && this.ordering) {
            var splt = this.ordering.split('-'),
                ascending = true,
                field = null;
            if (splt.length > 1) {
                field = splt[1];
                ascending = false;
            }
            else {
                field = splt[0];
            }
            res = _.sortBy(res, function (x) {
                return x[field];
            });
            if (!ascending) res.reverse();
        }
        return res;
    },
    /**
     * Return all model instances in the cache.
     * @private
     */
    _getCacheByLocalId: function () {
        return _.reduce(this.mapping.descendants, function (memo, childMapping) {
            return _.extend(memo, cacheForMapping(childMapping));
        }, _.extend({}, cacheForMapping(this.mapping)));
    },
    _executeInMemory: function (callback) {
        var deferred = window.q ? window.q.defer() : null;
        callback = util.constructCallbackAndPromiseHandler(callback, deferred);
        var cacheByLocalId = this._getCacheByLocalId();
        var keys = Object.keys(cacheByLocalId);
        var self = this;
        var res = [];
        var err;
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            var obj = cacheByLocalId[k];
            var matches = self.objectMatchesQuery(obj);
            if (typeof(matches) == 'string') {
                err = matches;
                break;
            } else {
                if (matches) res.push(obj);
            }
        }
        res = this._sortResults(res);
        callback(err, err ? null : res);
        return deferred ? deferred.promise : null;
    },
    orderBy: function (order) {
        this.ordering = order;
        return this;
    },
    objectMatchesOrQuery: function (obj, orQuery) {
        for (var idx in orQuery) {
            if (orQuery.hasOwnProperty(idx)) {
                var query = orQuery[idx];
                if (this.objectMatchesBaseQuery(obj, query)) {
                    return true;
                }
            }
        }
        return false;
    },
    objectMatchesAndQuery: function (obj, andQuery) {
        for (var idx in andQuery) {
            if (andQuery.hasOwnProperty(idx)) {
                var query = andQuery[idx];
                if (!this.objectMatchesBaseQuery(obj, query)) {
                    return false;
                }
            }
        }
        return true;
    },
    splitMatches: function (obj, unprocessedField, value) {
        var op = 'e';
        var fields = unprocessedField.split('.');
        var splt = fields[fields.length - 1].split('__');
        if (splt.length == 2) {
            var field = splt[0];
            op = splt[1];
        }
        else {
            field = splt[0];
        }
        fields[fields.length - 1] = field;
        _.each(fields.slice(0, fields.length - 1), function (f) {
            obj = obj[f];
        });
        var val = obj[field];
        var invalid = val === null || val === undefined;
        var comparator = Query.comparators[op],
            opts = {object: obj, field: field, value: value, invalid: invalid};
        if (!comparator) {
            return 'No comparator registered for query operation "' + op + '"';
        }
        return comparator(opts);
    },
    objectMatches: function (obj, unprocessedField, value, query) {
        if (unprocessedField == '$or') {
            if (!this.objectMatchesOrQuery(obj, query['$or'])) return false;
        }
        else if (unprocessedField == '$and') {
            if (!this.objectMatchesAndQuery(obj, query['$and'])) return false;
        }
        else {
            var matches = this.splitMatches(obj, unprocessedField, value);
            if (typeof matches != 'boolean') return matches;
            if (!matches) return false;
        }
        return true;
    },
    objectMatchesBaseQuery: function (obj, query) {
        var fields = Object.keys(query);
        for (var i = 0; i < fields.length; i++) {
            var unprocessedField = fields[i],
                value = query[unprocessedField];
            var rt = this.objectMatches(obj, unprocessedField, value, query);
            if (typeof rt != 'boolean') return rt;
            if (!rt) return false;
        }
        return true;
    },
    objectMatchesQuery: function (obj) {
        return this.objectMatchesBaseQuery(obj, this.query);
    }
});

exports.Query = Query;