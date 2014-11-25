/**
 * @module siesta
 */

var collection = require('./collection');
var util = require('./util');

var CollectionRegistry = require('./collectionRegistry').CollectionRegistry,
    Collection = collection.Collection,
    cache = require('./cache'),
    Mapping = require('./mapping').Mapping,
    notificationCentre = require('./notificationCentre').notificationCentre,
    Operation = require('./operation/operation').Operation,
    OperationQueue = require('./operation/queue').OperationQueue,
    RelationshipType = require('./relationship').RelationshipType,
    log = require('./operation/log'),
    _ = util._;

if (window.Q) window.q = window.Q;

Operation.logLevel = log.Level.warn;
OperationQueue.logLevel = log.Level.warn;

/**
 * @param ext - Extensions to include
 * @example
 * var siesta = require('siesta');
 * @example
 * var siesta = require('siesta')({http: require('http')});
 * @return {siesta}
 */
var siesta = function (ext) {
    if (!siesta.ext) siesta.ext = {};
    _.extend(siesta.ext, ext || {});
    console.log('siesta this', siesta);
    return siesta;
};

/**
 * Wipe everything!
 */
siesta.reset = function() {
    cache.reset();
    CollectionRegistry.reset();
    siesta.ext.http.DescriptorRegistry.reset();
    //noinspection JSAccessibilityCheck
};


/**
 * Listen to notificatons.
 * @param {String} notificationName
 * @param {Function} handler
 */
siesta.on = _.bind(notificationCentre.on, notificationCentre);

/**
 * Listen to notificatons.
 * @param {String} notificationName
 * @param {Function} handler
 */
siesta.addListener = siesta.on;

/**
 * Stop listening to a particular notification
 * 
 * @param {String} notificationName
 * @param {Function} handler
 */
siesta.off = _.bind(notificationCentre.removeListener, notificationCentre);

/**
 * Stop listening to a particular notification
 * 
 * @param {String} notificationName
 * @param {Function} handler
 */
siesta.removeListener = siesta.off;

/**
 * Listen to one and only one notification.
 * 
 * @param {String} notificationName
 * @param {Function} handler
 */
siesta.once = _.bind(notificationCentre.once, notificationCentre);

/**
 * Removes all listeners.
 */
siesta.removeAllListeners = _.bind(notificationCentre.removeAllListeners, notificationCentre);

siesta.Collection = Collection;
siesta.RelationshipType = RelationshipType;

// Used by modules.
var coreChanges = require('./changes');

// Make available modules to extensions.
siesta._internal = {
    log: log,
    Mapping: Mapping,
    mapping: require('./mapping'),
    error: require('./error'),
    ChangeType: coreChanges.ChangeType,
    siestaModel: require('./siestaModel'),
    extend: require('extend'),
    notificationCentre: require('./notificationCentre'),
    cache: require('./cache'),
    misc: require('./misc'),
    Operation: Operation,
    OperationQueue: OperationQueue,
    coreChanges: coreChanges,
    CollectionRegistry: require('./collectionRegistry').CollectionRegistry,
    Collection: collection.Collection,
    collection: collection,
    utils: util,
    util: util,
    _: util._,
    query: require('./query'),
    store: require('./store')
};

siesta.Collection = collection.Collection;

siesta.performanceMonitoringEnabled = false;
siesta.httpEnabled = false;
siesta.storageEnabled = false;

siesta.ext = {};

// Object.defineProperty(siesta, 'setPouch', {
//     get: function() {
//         if (siesta.ext.storageEnabled) {
//             return siesta.ext.storage.pouch.setPouch;
//         }
//         return null;
//     }
// });

// Object.defineProperty(siesta.ext, 'storageEnabled', {
//     get: function() {
//         if (siesta.ext._storageEnabled !== undefined) {
//             return siesta.ext._storageEnabled;
//         }
//         return !!siesta.ext.storage;
//     },
//     set: function(v) {
//         siesta.ext._storageEnabled = v;
//     }
// });

/**
 * True if siesta.http.js is installed correctly (or siesta.bundle.js is being used instead).
 */
Object.defineProperty(siesta.ext, 'httpEnabled', {
    get: function() {
        if (siesta.ext._httpEnabled !== undefined) {
            return siesta.ext._httpEnabled;
        }
        return !!siesta.ext.http;
    },
    set: function(v) {
        siesta.ext._httpEnabled = v;
    }
});

/**
 * Creates and registers a new Collection.
 * @param  {[type]} name
 * @param  {[type]} opts
 * @return {Collection}
 */
siesta.collection = function(name, opts) {
    return new Collection(name, opts);
};

/**
 * Sets the ajax function to use e.g. $.ajax
 * @param {Function} ajax
 * @example
 * // Use zepto instead of jQuery for http ajax requests.
 * siesta.setAjax(zepto.ajax);
 */
siesta.setAjax = function(ajax) {
    if (siesta.ext.httpEnabled) {
        siesta.ext.http.ajax = ajax;
    } else {
        throw new Error('http module not installed correctly (have you included siesta.http.js?)');
    }
};

/**
 * Returns the ajax function being used.
 * @return {Function}
 */
siesta.getAjax = function() {
    return siesta.ext.http.ajax;
};

siesta.notify = util.next;

/**
 * Returns an object whos keys map onto string constants used for log levels.
 * @type {Object}
 */
siesta.LogLevel = log.Level;

/**
 * Sets the log level for the named logger
 * @param {String} loggerName
 * @param {String} level
 *
 * @example
 * // Logger used by HTTP request/response descriptors.
 * siesta.setLogLevel('Descriptor', siesta.LogLevel.trace);
 * // Logger used by request descriptors specifically.
 * siesta.setLogLevel('RequestDescriptor', siesta.LogLevel.trace);
 * // Logger used by response descriptors specifically.
 * siesta.setLogLevel('ResponseDescriptor', siesta.LogLevel.trace);
 * // All descriptors are registered in the DescriptorRegistry.
 * siesta.setLogLevel('DescriptorRegistry', siesta.LogLevel.trace);
 * // Logger used by HTTP requests/responses.
 * siesta.setLogLevel('HTTP', siesta.LogLevel.trace);
 * // Objects are cached by local id (_id) or their remote id. This logger is used by the local object cache.
 * siesta.setLogLevel('LocalCache', siesta.LogLevel.trace);
 * // Objects are cached by local id (_id) or their remote id. This logger is used by the remote object cache.
 * siesta.setLogLevel('RemoteCache', siesta.LogLevel.trace);
 * // The logger used by change notifications.
 * siesta.setLogLevel('changes', siesta.LogLevel.trace);
 * // The logger used by the Collection class, which is used to describe a set of mappings.
 * siesta.setLogLevel('Collection', siesta.LogLevel.trace);
 * // The logger used by the Mapping class.
 * siesta.setLogLevel('Mapping', siesta.LogLevel.trace);
 * // The logger used during mapping operations, i.e. mapping data onto the object graph.
 * siesta.setLogLevel('MappingOperation', siesta.LogLevel.trace);
 * // The logger used by the SiestaModel class, which makes up the individual nodes of the object graph.
 * siesta.setLogLevel('SiestaModel', siesta.LogLevel.trace);
 * // The logger used by the performance monitoring extension (siesta.perf.js)
 * siesta.setLogLevel('Performance', siesta.LogLevel.trace);
 * // The logger used during local queries against the object graph.
 * siesta.setLogLevel('Query', siesta.LogLevel.trace);
 * siesta.setLogLevel('Store', siesta.LogLevel.trace);
 * // Much logic in Siesta is tied up in 'Operations'.
 * siesta.setLogLevel('Operation', siesta.LogLevel.trace);
 * // Siesta makes use of queues of operations for managing concurrency and concurrent operation limits.
 * siesta.setLogLevel('OperationQueue', siesta.LogLevel.trace);
 */
siesta.setLogLevel = function(loggerName, level) {
    var Logger = log.loggerWithName(loggerName);
    Logger.setLevel(level);
};



siesta.serialisers = {};
siesta.serializers = siesta.serialisers;

Object.defineProperty(siesta.serialisers, 'id', {
    get: function() {
        if (siesta.ext.httpEnabled) {
            return siesta.ext.http.Serialiser.idSerialiser;
        }
        return null;
    }
});

Object.defineProperty(siesta.serialisers, 'depth', {
    get: function() {
        if (siesta.ext.httpEnabled) {
            return siesta.ext.http.Serialiser.depthSerializer;
        }
        return null;
    }
});

// * `siesta.map` is equivalent to [_.map](http://underscorejs.org/#map)
// * `siesta.each` is equivalent to [_.each](http://underscorejs.org/#each)
// * `siesta.partial` is equivalent to [_.partial](http://underscorejs.org/#partial)
// * `siesta.bind` is equivalent to [_.bind](http://underscorejs.org/#bind)
// * `siesta.pluck` is equivalent to [_.pluck](http://underscorejs.org/#pluck)
// * `siesta.property` is equivalent to [_.property](http://underscorejs.org/#property)
// * `siesta.sortBy` is equivalent to [_.sortBy](http://underscorejs.org/#sortBy)
// * `siesta.parallel` is equivalent to [async.parallel](https://github.com/caolan/async#parallel)
// * `siesta.series` is equivalent to [async.series](https://github.com/caolan/async#series)

siesta.map = util._.map;
siesta.each = util._.each;
siesta.partial = util._.partial;
siesta.bind = util._.bind;
siesta.pluck = util._.pluck;
siesta.property = util._.pluck;
siesta.sortBy = util._.sortBy;
siesta.series = util.series;
siesta.parallel = util.parallel;


if (typeof window != 'undefined') {
    window.siesta = siesta;
}

module.exports = siesta;