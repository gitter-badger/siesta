if (typeof siesta == 'undefined' && typeof module == 'undefined') {
    throw new Error('Could not find window.siesta. Make sure you include siesta.core.js first.');
}

if (typeof PouchDB == 'undefined') {
    throw new Error('Could not find PouchDB. Have you included the script?');
}

var DB_NAME = 'siesta';
var unsavedObjects = [],
    unsavedObjectsHash = {},
    unsavedObjectsByCollection = {},
    _i = siesta._internal,
    CollectionRegistry = _i.CollectionRegistry,
    log = _i.log,
    notificationCentre = _i.notificationCentre.notificationCentre,
    pouch = new PouchDB(DB_NAME);

var Logger = log.loggerWithName('Storage');
Logger.setLevel(log.Level.trace);

/**
 * Serialise a model down to PouchDB.
 * @param {ModelInstance} model
 */
function _serialise(model) {
    var serialised = siesta.extend({}, model.__values);
    serialised['collection'] = model.collection;
    serialised['model'] = model.type;
    serialised['_id'] = model._id;
    var rev = model._rev;
    if (rev) serialised['_rev'] = rev;
    serialised = _.reduce(model._relationshipNames, function (memo, n) {
        var val = model[n];
        if (siesta.isArray(val)) {
            memo[n] = _.pluck(val, '_id');
        }
        else if (val) {
            memo[n] = val._id;
        }
        return memo;
    }, serialised);
    return serialised;
}

function _prepareDatum(datum, model) {
    // Add blank object with correct _id to the cache so that can map data onto it.
    delete datum.collection;
    delete datum.model;
    var relationshipNames = model._relationshipNames;
    _.each(relationshipNames, function (r) {
        var _id = datum[r];
        if (siesta.isArray(_id)) {
            datum[r] = _.map(_id, function (x) { return {_id: x}});
        }
        else {
            datum[r] = {_id: _id};
        }
    });
    return datum;
}
function _deserialise(datum, cb) {
    var collectionName = datum.collection,
        modelName = datum.model,
        collection = CollectionRegistry[collectionName],
        model = collection[modelName];
    datum = _prepareDatum(datum, model);
    model.map(datum, {disableNotifications: true}, function (err, instance) {
        if (err) Logger.error('err', err);
        cb(err, instance);
    });
}

/**
 *
 * @param opts
 * @param opts.collectionName
 * @param opts.modelName
 * @param callback
 * @private
 */
function _loadModel(opts, callback) {
    var collectionName = opts.collectionName,
        modelName = opts.modelName;
    if (Logger.trace) {
        var fullyQualifiedName = collectionName + '.' + modelName;
        Logger.trace('Loading instances for ' + fullyQualifiedName);
    }
    var Model = CollectionRegistry[collectionName][modelName];
    var mapFunc = function (doc) {
        if (doc.model == '$1' && doc.collection == '$2') {
            emit(doc._id, doc);
        }
    }.toString().replace('$1', modelName).replace('$2', collectionName);
    pouch.query({map: mapFunc})
        .then(function (resp) {
            var data = siesta.map(siesta.pluck(resp.rows, 'value'), function (datum) {
                return _prepareDatum(datum, Model);
            });
            console.log('data', data);
            Model.map(data, {disableNotifications: true}, function (err, instances) {
                if (!err) {
                    if (Logger.trace)
                        Logger.trace('Loaded ' + instances.length.toString() + ' instances for ' + fullyQualifiedName);
                }
                else {
                    Logger.error('Error loading models', err);
                }
                callback(err, instances);
            });
        })
        .catch(function (err) {
            callback(err);
        });
}

/**
 * Load all data from PouchDB.
 */
function _load(callback) {
    var deferred = window.q ? window.q.defer() : null;
    callback = callback || function () {};
    var collectionNames = CollectionRegistry.collectionNames;
    var tasks = [];
    _.each(collectionNames, function (collectionName) {
        var collection = CollectionRegistry[collectionName],
            modelNames = Object.keys(collection._models);
        _.each(modelNames, function (modelName) {
            tasks.push(siesta.partial(_loadModel, {
                collectionName: collectionName,
                modelName: modelName
            }));
        });
    });
    siesta.parallel(tasks, function (err, results) {
        var instances = [];
        siesta.each(results, function (r) {instances.concat(r)});
        if (Logger.trace) Logger.trace('Loaded ' + instances.length.toString() + ' instances');
        callback(err, instances);
        if (err) deferred.reject(err);
        else deferred.resolve(instances);
    });
    return deferred ? deferred.promise : null;
    //var deferred = window.q ? window.q.defer() : null;
    //callback = callback || function () {};
    //var mapFunc = function (doc) {
    //    emit(doc._id, doc);
    //}.toString();
    //pouch.query({map: mapFunc}).then(function (resp) {
    //    var tasks = siesta.map(siesta.pluck(resp.rows, 'value'), function (datum) {
    //        return function (done) {
    //            _deserialise(datum, done)
    //        }
    //    });
    //    siesta.parallel(tasks, function (err, instances) {
    //        if (Logger.trace) Logger.trace('Loaded ' + instances.length.toString() + ' instances');
    //        callback(err, instances);
    //        if (err) deferred.reject(err);
    //        else deferred.resolve(instances);
    //    });
    //}).catch(function (err) {
    //    callback(err);
    //    if (deferred) deferred.reject(err);
    //});
    //return deferred ? deferred.promise : null;
}

function saveConflicts(objects, callback, deferred) {
    pouch.allDocs({keys: _.pluck(objects, '_id')})
        .then(function (resp) {
            for (var i = 0; i < resp.rows.length; i++) {
                objects[i]._rev = resp.rows[i].value.rev;
            }
            saveToPouch(objects, callback, deferred);
        })
        .catch(function (err) {
            callback(err);
            deferred.reject(err);
        })
}

function saveToPouch(objects, callback, deferred) {
    var conflicts = [];
    pouch.bulkDocs(_.map(objects, _serialise)).then(function (resp) {
        for (var i = 0; i < resp.length; i++) {
            var response = resp[i];
            var obj = objects[i];
            if (response.ok) {
                obj._rev = response.rev;
            }
            else if (response.status == 409) {
                conflicts.push(obj);
            }
            else {
                Logger.error('Error saving object with _id="' + obj._id + '"', response);
            }
        }
        if (conflicts.length) {
            saveConflicts(conflicts, callback, deferred);
        }
        else {
            callback();
            if (deferred) deferred.resolve();
        }
    }, function (err) {
        callback(err);
        if (deferred) deferred.reject(err);
    });
}
/**
 * Save all changes down to PouchDB.
 */
function save(callback) {
    var deferred = window.q ? window.q.defer() : null;
    callback = callback || function () {};
    var objects = unsavedObjects;
    unsavedObjects = [];
    unsavedObjectsHash = {};
    unsavedObjectsByCollection = {};
    if (Logger.trace) {
        Logger.trace('Saving objects', _.map(objects, function (x) {
            return x._dump()
        }))
    }
    saveToPouch(objects, callback, deferred);
    return deferred ? deferred.promise : null;
}

var listener = function (n) {
    var changedObject = n.obj,
        ident = changedObject._id;
    if (!changedObject) {
        throw new _i.error.InternalSiestaError('No obj field in notification received by storage extension');
    }
    if (!(ident in unsavedObjectsHash)) {
        unsavedObjectsHash[ident] = changedObject;
        unsavedObjects.push(changedObject);
        var collectionName = changedObject.collection;
        if (!unsavedObjectsByCollection[collectionName]) {
            unsavedObjectsByCollection[collectionName] = {};
        }
        var modelName = changedObject.model.type;
        if (!unsavedObjectsByCollection[collectionName][modelName]) {
            unsavedObjectsByCollection[collectionName][modelName] = {};
        }
        unsavedObjectsByCollection[collectionName][modelName][ident] = changedObject;
    }
};
siesta.on('Siesta', listener);

var storage = {
    _load: _load,
    save: save,
    _serialise: _serialise,
    _reset: function (cb) {
        siesta.removeListener('Siesta', listener);
        unsavedObjects = [];
        unsavedObjectsHash = {};
        pouch.destroy(function (err) {
            if (!err) {
                pouch = new PouchDB(DB_NAME);
            }
            siesta.on('Siesta', listener);
            Logger.warn('Reset complete');
            cb(err);
        })
    }
};

Object.defineProperty(storage, '_unsavedObjects', {
    get: function () {return unsavedObjects}
});

Object.defineProperty(storage, '_unsavedObjectsHash', {
    get: function () {return unsavedObjectsHash}
});

Object.defineProperty(storage, '_unsavedObjectsByCollection', {
    get: function () {return unsavedObjectsByCollection}
});

// Enable/disable autosaving.
console.log('wtf');


Object.defineProperty(storage, '_pouch', {
    get: function () {return pouch}
});


if (typeof siesta != 'undefined') {
    if (!siesta.ext) {
        siesta.ext = {};
    }
    siesta.ext.storage = storage;
    var interval, saving, autosaveDuration = 1000;
    Object.defineProperty(siesta, 'autosave', {
        get: function () {
            return !!interval;
        },
        set: function (autosave) {
            console.log('yo');
            if (autosave) {
                if (!interval) {
                    interval = setInterval(function () {
                        // Cheeky way of avoiding multiple saves happening...
                        if (!saving) {
                            saving = true;
                            siesta.save(function (err) {
                                if (!err) {
                                    notificationCentre.emit('saved');
                                }
                                saving = false;
                            });
                        }
                    }, siesta.autosaveDuration);
                }
            }
            else {
                if (interval) {
                    clearInterval(interval);
                    interval = null;
                }
            }
        }
    });
    Object.defineProperty(siesta, 'autosaveDuration', {
        get: function () {
            return autosaveDuration;
        },
        set: function (_autosaveDuration) {
            autosaveDuration = _autosaveDuration;
            if (interval) {
                // Reset interval
                siesta.autosave = false;
                siesta.autosave = true;
            }
        }
    })
}
else {
    throw new Error('Could not find window.siesta. Make sure you include siesta.core.js first.');
}

if (typeof module != 'undefined') {
    module.exports = storage;
}