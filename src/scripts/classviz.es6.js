/*jshint esnext:true, eqnull:true */
/*globals require */

'use strict';   /*jshint -W097 */

var moment = require('moment');
export class Schema {
  constructor() {}
}

export function schematize(fields, schema) {
  var fieldset = [];
  Object.getOwnPropertyNames(fields).forEach(function (field) {
    fieldset.push(new Field(field, this[field]));
  }, fields);
  fieldset.forEach(function (field) {
    Object.defineProperty(schema, field.name, {
      enumerable: true,
      configurable: true,
      value: field
    });
  });
  return schema;
}

export class Field {
  constructor(name, descriptor) {
    if(name == null) throw new Error('Field must be named');
    descriptor = descriptor || {};
    this.name = name; //field name, REQUIRED
    this.title = descriptor.title; //label for the field
    this.description = descriptor.description;
    this.type = descriptor.type; //constrain to specific type, either pass in a class or a typeof. undefined means ignored
    this.vocabulary = descriptor.vocabulary; //constrain field to specific set of values.
    this.constraint = descriptor.constraint; //a callback function which can throw a ValidationError or return a normalized value. the field is passed in as 'this'
    this.required = descriptor.required || false; //ValidationError thrown if this field is not set
    this.defaultValue = descriptor.defaultValue; //when there is no value stored, the getter will return this value
  }

  validate(value, obj) {
    var normalized = value;
    obj = obj || {};
    if(value != null) normalized = this.constraint ? (this.constraint.call(this, value, obj) || value) : value;

    if(this.type && (normalized != null)) {
      if(typeof this.type === 'string') {
        if(typeof normalized !== this.type) throw new ValidationTypeError(this, (typeof normalized), 'Expected type: [' + this.type + ']');
      } else if (typeof this.type === 'function') {
        if(! (normalized instanceof this.type)) throw new ValidationTypeError(this, (typeof normalized), 'Expected type: [' + this.type + ']');
      }
    }

    if(this.required && (normalized == null)) {
      if(this.defaultValue != null) normalized = this.defaultValue;
      else throw new ValidationError(this, normalized, 'Required fields cannot be null');
    }

    if(this.vocabulary && this.vocabulary.indexOf(normalized) === -1) throw new ValidationError(this, normalized, 'Allowed values: ' + this.vocabulary);

    return normalized;
  }
}

export class ValidationError extends Error {
  constructor(field, value, msg) {
    super();
    this.message = 'Invalid value: ' + value + ' on field: ' + field.name + (msg ? '! (' + msg + ')' : '!');
    this.name = 'ValidationError';
  }
}

export class ValidationTypeError extends TypeError {
  constructor(field, type, msg) {
    super();
    this.message = 'Invalid type: [' + type + '] on field: ' + field.name + (msg ? '! (' + msg + ')' : '!');
    this.name = 'ValidationTypeError';
  }
}

export class Klass {
  constructor(obj) {
    obj = obj || {};
    var schema = obj.schema || schematize(obj, {});
    this.schema = schema;
    function descriptor(field, o) {
      var value;
      return {
        enumerable: true,
        configurable: true,
        get: function () {
          return (value != null) ? value : field.defaultValue;
        },
        set: function (v) {
          value = field.validate(v, o);
        }
      };
    }
    Object.keys(schema).forEach(function (field) {
      Object.defineProperty(this, schema[field].name, descriptor(schema[field], this));
    }, this);

    Object.keys(schema).forEach(function (k) {
      this[k] = obj[k];
    }, this);
  }
}
