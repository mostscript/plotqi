/*jshint esnext:true, eqnull:true, undef:true */
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
    if (name == null) throw new Error('Field must be named');
    descriptor = descriptor || {};
    // field name, REQUIRED:
    this.name = name;
    // label for the field:
    this.title = descriptor.title;
    // field description / doc (may be used in form-hints):
    this.description = descriptor.description;
    // constrain to specific type, either a class or type (string):
    this.type = descriptor.type;
    // constrain field to specific set of values:
    this.vocabulary = descriptor.vocabulary; 
    // constraint is callback function which validates, normalizes; the field
    // is bound such that 'this' inside the constraint callback is the field:
    this.constraint = descriptor.constraint;
    // is field required? true/false:
    this.required = descriptor.required || false;
    // default value for getter:
    this.defaultValue = descriptor.defaultValue;
  }

  validate(value, obj) {
    var normalized = value,
        constraint = this.constraint;
    obj = obj || {};

    if (value != null) {
      normalized = value;
      if (constraint) {
        normalized = constraint.call(this, value, obj) || value;
      }
    }

    if (this.type && (normalized != null)) {
      if (typeof this.type === 'string') {
        if (typeof normalized !== this.type) {
          throw new ValidationTypeError(
            this,
            (typeof normalized),
            'Expected type: [' + this.type + ']'
          );
        }
      } else if (typeof this.type === 'function') {
        if (! (normalized instanceof this.type)) {
          throw new ValidationTypeError(
            this,
            (typeof normalized),
            'Expected type: [' + this.type + ']'
          );
        }
      }
    }

    // set default if no value and defaultValue is in fact declared
    if (normalized == null && this.defaultValue != null) {
      normalized = this.defaultValue;
    }

    if (this.required && (normalized == null)) {
      throw new ValidationError(
        this,
        normalized,
        'Required fields cannot be null'
      );
    }

    if (this.vocabulary && this.vocabulary.indexOf(normalized) === -1) {
      if (this.required || normalized !== null) {
        throw new ValidationError(
          this,
          normalized,
          'Allowed values: ' + this.vocabulary
        );
      }
    }

    return normalized;
  }
}

export class ValidationError extends Error {
  constructor(field, value, msg) {
    super();
    this.message = 'Invalid value: ' +
      value +
      ' on field: ' +
      field.name +
      (msg ? '! (' + msg + ')' : '!');
    this.name = 'ValidationError';
  }
}

export class ValidationTypeError extends TypeError {
  constructor(field, type, msg) {
    super();
    this.message = 'Invalid type: [' +
      type +
      '] on field: ' +
      field.name +
      (msg ? '! (' + msg + ')' : '!');
    this.name = 'ValidationTypeError';
  }
}

export class Klass {

  constructor(obj, localprops) {
    obj = obj || {};
    var schema = obj.schema || schematize(obj, {});
    this.schema = schema;
    function descriptor(field, o) {
      var value;
      return {
        enumerable: true,
        configurable: true,
        get: function () {
          if (field.required && value == null) {
            return field.defaultValue;  // stored value is null or undef
          }
          return value;
        },
        set: function (v) {
          value = field.validate(v, o);
        }
      };
    }
    Object.keys(schema).forEach(function (field) {
      var fieldname = schema[field].name;
      if ((localprops || []).indexOf(fieldname) !== -1) {
        return;  // do not use schema property descriptor for this field
      }
      Object.defineProperty(this, fieldname, descriptor(schema[field], this));
      },
      this
    );

    Object.keys(schema).forEach(function (k) {
      this[k] = obj[k];
      },
      this
    );
  }
}
