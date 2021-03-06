var EventEmitter = require('events').EventEmitter,
    ArrayObserver = require('../vendor/observe-js/src/observe').ArrayObserver,
    _ = require('./util')._,
    changes = require('./changes');

var eventEmitter = new EventEmitter();
eventEmitter.wrapArray = function (array, field, modelInstance) {
    if (!array.observer) {
        array.observer = new ArrayObserver(array);
        array.observer.open(function (splices) {
            var fieldIsAttribute = modelInstance._attributeNames.indexOf(field) > -1;
            if (fieldIsAttribute) {
                splices.forEach(function (splice) {
                    changes.registerChange({
                        collection: modelInstance.collectionName,
                        model: modelInstance.model.name,
                        _id: modelInstance._id,
                        index: splice.index,
                        removed: splice.removed,
                        added: splice.addedCount ? array.slice(splice.index, splice.index + splice.addedCount) : [],
                        type: changes.ChangeType.Splice,
                        field: field,
                        obj: modelInstance
                    });
                });
            }
        });
        array.isFault = false;
    }
};
module.exports = eventEmitter;