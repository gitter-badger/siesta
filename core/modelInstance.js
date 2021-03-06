var log = require('./log'),
    util = require('./util'),
    _ = util._,
    error = require('./error'),
    InternalSiestaError = error.InternalSiestaError,
    coreChanges = require('./changes'),
    notifications = require('./notifications'),
    cache = require('./cache');

var Logger = log.loggerWithName('ModelInstance');

function ModelInstance(model) {
    var self = this;
    this.model = model;

    util.subProperties(this, this.model, [
        'collection',
        'collectionName',
        '_attributeNames',
        {
            name: 'idField',
            property: 'id'
        },
        {
            name: 'modelName',
            property: 'name'
        }
    ]);

    Object.defineProperties(this, {
        _relationshipNames: {
            get: function () {
                var proxies = _.map(Object.keys(self.__proxies || {}), function (x) {return self.__proxies[x]});
                return _.map(proxies, function (p) {
                    if (p.isForward) {
                        return p.forwardName;
                    } else {
                        return p.reverseName;
                    }
                });
            },
            enumerable: true,
            configurable: true
        },
        dirty: {
            get: function () {
                if (siesta.ext.storageEnabled) {
                    return self._id in siesta.ext.storage._unsavedObjectsHash;
                }
                else return undefined;
            },
            enumerable: true
        }
    });

    this.removed = false;
}


_.extend(ModelInstance.prototype, {
    get: function (callback) {
        var deferred = util.defer(callback);
        callback = deferred.finish.bind(deferred);
        callback(null, this);
        return deferred.promise;
    },
    remove: function (callback, notification) {
        notification = notification == null ? true : notification;
        var deferred = util.defer(callback);
        callback = deferred.finish.bind(deferred);
        cache.remove(this);
        this.removed = true;
        if (notification) {
            coreChanges.registerChange({
                collection: this.collectionName,
                model: this.model.name,
                _id: this._id,
                oldId: this._id,
                old: this,
                type: coreChanges.ChangeType.Remove,
                obj: this
            });
        }
        var __remove = this.model.methods.__remove;
        if (__remove) {
            var paramNames = util.paramNames(__remove);
            if (paramNames.length) {
                var self = this;
                __remove.call(this, function (err) {
                    callback(err, self);
                });
            }
            else {
                __remove.call(this);
                callback(null, this);
            }
        }
        else {
            callback(null, this);
        }
        return deferred.promise;
    },
    restore: function (callback) {
        var deferred = util.defer(callback);
        callback = deferred.finish.bind(deferred);
        var _finish = function (err) {
            if (!err) {
                coreChanges.registerChange({
                    collection: this.collectionName,
                    model: this.model.name,
                    _id: this._id,
                    newId: this._id,
                    new: this,
                    type: coreChanges.ChangeType.New,
                    obj: this
                });
            }
            callback(err, this);
        }.bind(this);
        if (this.removed) {
            cache.insert(this);
            this.removed = false;
            var methods = this.model.methods || {},
                __init = methods.__init;
            if (__init) {
                var paramNames = util.paramNames(__init);
                if (paramNames.length) {
                    __init.call(this, _finish);
                }
                else {
                    __init.call(this);
                    _finish();
                }
            }
            else {
                _finish();
            }
        }
        return deferred.promise;
    }
});

_.extend(ModelInstance.prototype, {
    listen: function (fn) {
        notifications.on(this._id, fn);
        return function () {
            this.removeListener(fn);
        }.bind(this);
    },
    listenOnce: function (fn) {
        return notifications.once(this._id, fn);
    },
    removeListener: function (fn) {
        return notifications.removeListener(this._id, fn);
    }
});

// Inspection
_.extend(ModelInstance.prototype, {
    getAttributes: function () {
        return _.extend({}, this.__values);
    },
    isInstanceOf: function (model) {
        return this.model == model || this.model.isDescendantOf(model);
    }
});

// Dump
_.extend(ModelInstance.prototype, {
    _dumpString: function (reverseRelationships) {
        return JSON.stringify(this._dump(reverseRelationships, null, 4));
    },
    _dump: function (reverseRelationships) {
        var dumped = _.extend({}, this.__values);
        dumped._rev = this._rev;
        dumped._id = this._id;
        return dumped;
    }
});

module.exports = ModelInstance;

