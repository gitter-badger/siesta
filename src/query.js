/**
 * @module query
 */

var log = require('./operation/log')
    , cache = require('./cache')
    , Logger = log.loggerWithName('Query')
    , util = require('./util');
Logger.setLevel(log.Level.warn);

/**
 * @class  [Query description]
 * @param {Mapping} mapping
 * @param {Object} opts
 */
function Query(mapping, opts) {
    this.mapping = mapping;
    this.query = opts;
}

_.extend(Query.prototype, {
    execute: function (callback) {
        var deferred = window.q ? window.q.defer() : null;
        callback = util.constructCallbackAndPromiseHandler(callback, deferred);
        // if (siesta.ext.storageEnabled) {
        //     _executeUsingStorageExtension.call(this, callback);
        // }
        // else {
        this._executeInMemory(callback);
        // }
        return deferred ? deferred.promise : null;
    },
    _dump: function (asJson) {
        // TODO
        return asJson ? '{}' : {};
    },
    _executeInMemory: function (callback) {
        var deferred = window.q ? window.q.defer() : null;
        callback = util.constructCallbackAndPromiseHandler(callback, deferred);
        var cacheByType = cache._localCacheByType;
        var mappingName = this.mapping.type;
        var collectionName = this.mapping.collection;
        var cacheByMapping = cacheByType[collectionName];
        var cacheByLocalId;
        if (cacheByMapping) {
            cacheByLocalId = cacheByMapping[mappingName];
        }
        if (cacheByLocalId) {
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
            callback(err, err ? null : res);
        } else if (callback) {
            callback(null, []);
        }
        return deferred ? deferred.promise : null;
    },
    objectMatchesQuery: function (obj) {
        var fields = Object.keys(this.query);
        for (var i = 0; i < fields.length; i++) {
            var origField = fields[i];
            var splt = origField.split('__');
            var op = 'e';
            var field;
            if (splt.length == 2) {
                field = splt[0];
                op = splt[1];
            } else {
                field = origField;
            }
            var queryObj = this.query[origField];
            var val = obj[field];
            if (op == 'e') {
                if (val != queryObj) {
                    return false;
                }
            } else if (op == 'lt') {
                if (val >= queryObj) {
                    return false;
                }
            } else if (op == 'lte') {
                if (val > queryObj) {
                    return false;
                }
            } else if (op == 'gt') {
                if (val <= queryObj) {
                    return false;
                }
            } else if (op == 'gte') {
                if (val < queryObj) {
                    return false;
                }
            } else {
                return 'Query operator "' + op + '"' + ' does not exist';
            }
        }
        return true;
    }
});

exports.Query = Query;