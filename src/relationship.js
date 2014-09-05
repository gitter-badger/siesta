var RestError = require('./error').RestError;
var Store = require('./store');

RelationshipType = {
    ForeignKey: 'ForeignKey',
    OneToOne: 'OneToOne'
};

function Fault(proxy, relationship) {
    this.proxy = proxy;
    this.relationship = relationship;
    this.object = null;
    Object.defineProperty(this, 'isFault',  {
        get: function () {
            return true;
        },
        enumerable: true,
        configurable: true
    });
}

Fault.prototype.add = function (){};
Fault.prototype.remove = function (){};
Fault.prototype.get = function (){};
Fault.prototype.set = function (){};


function NewObjectProxy(relationship) {
    if (!this) return new NewObjectProxy(relationship);
    this.relationship = relationship;
    this.fault = new Fault(this, relationship);
    this.object = null;
}

function capitaliseFirstLetter(string)
{
    return string.charAt(0).toUpperCase() + string.slice(1);
}

NewObjectProxy.prototype.install = function (obj){
    var self = this;
    var name = this.relationship.name;
    this.object = obj;
    this.fault.object = obj;

    Object.defineProperty(obj, name, {
        get: function () {
            if (self.related) {
                return self.related;
            }
            else {
                return self.fault;
            }
        },
        set: function () {

        },
        configurable: true,
        enumerable: true
    });

};

function RelatedObjectProxy(relationship, object) {
    this.relationship = relationship;
    this.object = object;
    this._id = null;
    this.relatedObject = null;
}

RelatedObjectProxy.prototype.get = function (callback) {
    var self = this;
    this.relationship.getRelated(this.object, function (err, related) {
        if (!err) {
            self.relatedObject = related;
        }
        if (callback) callback(err, related);
    });
};

RelatedObjectProxy.prototype.set = function (obj, callback) {
    this.relationship.setRelated(this.object, obj, callback);
};

RelatedObjectProxy.prototype.remove = function (obj, callback) {
    this.relationship.removeRelated(this.object, obj, callback);
};

RelatedObjectProxy.prototype.add = function (obj, callback) {
    this.relationship.addRelated(this.object, obj, callback);
};

RelatedObjectProxy.prototype.isFault = function () {
    if (this._id) {
        return !this.relatedObject;
    }
    return false; // If no object is related then implicitly this is not a fault.
};


function Relationship(name, reverseName, mapping, reverseMapping) {
    if (!this) {
        return new Relationship(name, reverseName, mapping, reverseMapping);
    }
    var self = this;
    this.mapping = mapping;
    this.name = name;
    this._reverseName = reverseName;
    Object.defineProperty(this, 'reverseName', {
        get: function () {
            if (self._reverseName) {
                return self._reverseName;
            }
            else {
                return 'reverse_' + self.name;
            }
        }
    });
    this.reverseMapping = reverseMapping;
}

//noinspection JSUnusedLocalSymbols
Relationship.prototype.getRelated = function (obj, callback) {
    throw Error('Relationship.getRelated must be overridden');
};

//noinspection JSUnusedLocalSymbols
Relationship.prototype.setRelated = function (obj, related, callback) {
    throw Error('Relationship.setRelated must be overridden');
};

Relationship.prototype.isForward = function (obj) {
    return obj.mapping === this.mapping;
};

Relationship.prototype.isReverse = function (obj) {
    return obj.mapping === this.reverseMapping;
};

Relationship.prototype.contributeToRestObject = function (obj) {
    if (this.isForward(obj)) {
        obj[this.name] = new RelatedObjectProxy(this, obj);
    }
    else if (this.isReverse(obj)) {
        obj[this.reverseName] = new RelatedObjectProxy(this, obj);
    }
    else {
        throw new RestError('Cannot contribute to object as this relationship has neither a forward or reverse mapping that matches', {relationship: this, obj: obj});
    }
};

Relationship.prototype.setRelatedById = function (obj, relatedId, callback) {
    var self = this;
    Store.get({_id: relatedId}, function (err, related) {
        if (err) {
            callback(err);
        }
        else {
            self.setRelated(obj, related, function () {
                if (callback) callback();
            });
        }
    })
};

Relationship.prototype._dump = function (asJSON) {
    var obj = {};
    obj.forward = {
        name: this.name,
        mapping: this.mapping.type
    };
    obj.reverse = {
        name: this.reverseName,
        mapping: this.reverseMapping.type
    };
    return asJSON ? JSON.stringify(obj, null, 4) : obj;
};


exports.Relationship = Relationship;
exports.RelatedObjectProxy = RelatedObjectProxy;
exports.RelationshipType = RelationshipType;
exports.NewObjectProxy = NewObjectProxy;
exports.Fault = Fault;