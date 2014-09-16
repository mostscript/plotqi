/*jshint 
    browser: true,
    nomen: false,
    eqnull: true,
    es5:true,
    trailing:true,
    undef:true
    */

/*global window, moment, console */

/**
 * NOTE ON NAMING:  some property names follow LCUS naming convention in the
 *                  JSON; it did not seem prudent at this time to remap these
 *                  to camelCase conventions in the models on construction.
 */


// core namespaces
var uu = uu || {};


// uu.klass: some idiomatic class-based OO and inheritance tools for JS
uu.klass = (function (ns) {
    "use strict";
    /* jshint newcap:false,proto:true */

    ns.subclasses = function (cls, base) {
        cls.prototype = new base();
        cls.prototype.__super__ = base;
        cls.prototype.constructor = cls;
    };

    ns.prototypeFor = function (o, polyfill) {
        if (typeof Object.getPrototypeOf !== 'function' || polyfill) {
            // no ES5 support or forced use of polyfill (e.g. testing)
            if (typeof ''.__proto__ === 'object') {
                return o.__proto__;
            }
            return o.constructor.prototype;
        }
        return Object.getPrototypeOf(o);
    };

    // get() -- return "class" of object
    ns.get = function get(o) {
        if (typeof o === 'function') {
            return o;
        }
        return ns.prototypeFor(o).constructor;
    };

    // base() -- base class for a class (function) object using subclasses()
    ns.base = function base(o) {
        if (typeof o === 'function') {
            return o.prototype.__super__ || null;
        }
        return ns.prototypeFor(o).__super__ || null;
    };

    /**
     * all()
     *  return Array of all classes, only that are explicitly using the idioms
     *  of subclasses().
     *      e.g. does not include Object.
     */
    ns.all = function bases(o) {
        var ctor = ns.get(o),
            base = ns.base(o),
            hasParent = function (obj) { return !!ns.base(obj); };
        return hasParent(o) ? [ctor].concat(ns.all(base)) : [ctor];
    };

    /**
     * descriptor():
     * Simple field descriptor (factory function) for prototype properties,
     * defers to instance __props__
     */
    ns.descriptor = function (name, fieldDefault, fieldNormalize) {
        fieldDefault = fieldDefault || null;
        return {
            get: function () { return this.__props__[name] || fieldDefault; },
            set: function (v) { this.__props__[name] = v; }
        };
    };

    /**
     * BaseContent: base class uses instance __props__ for storage of
     *              property values set/get using descriptors.
     */
    ns.BaseItem = (function () {
        function BaseItem(opts) {
            this.__props__ = {};
        }
        return BaseItem;
    }());

    return ns;

}(uu.klass || {}));


// uu.schema: module for tightly typed field schema for object properties:
uu.schema = (function (uu, ns) {
    "use strict";

    var subclasses = uu.klass.subclasses,
        mergeCache = {};

    ns.ValidationError = function ValidationError(name, value, msg) {
        this.name = 'ValidationError';
        this.message = 'Field "' + name + '", attempted set of invalid ' +
                       'value: ' + value;
        if (msg) {
            this.message += ' (' + msg+ ')';
        }
    };
    ns.ValidationError.prototype = new Error();
    ns.ValidationError.constructor = ns.ValidationError;

    /**
     * fieldProperty(field):
     *  returns descriptor that implements field configuration, including
     *  default field value on read, and constraints:
     *  name: field name (required, but in practice may come from schema key)
     *  title: field label (optional)
     *  description: description for field or help text (optional)
     *   type: class (via instanceof) or type (via typeof)
     *               DEFAULT: undefined (ignored)
     *
     *   vocabulary: if present, a list of valid choices, set value must abide
     *               DEFAULT: undefined (ignored)
     *
     *   constraint: callable can throw ValidationError, and may return
     *               a normalized value
     *               DEFAULT: undefined (ignored)
     *
     *   required: setter throws ValidationError on null/undefined
     *               DEFAULT: false
     *
     *   defaultValue: when value is not stored, property getter returns this
     *               DEFAULT: undefined (ignored)
     *
     */
    ns.fieldProperty = function (field) {
        var validate = function (v) {
            var normalized;
            // call, check constraint (which may also normalize value)
            if (field.constraint) {
                normalized = field.constraint.call(this, field, v);
                if (normalized !== undefined) {
                    v = normalized;
                }
            }
            // check type of setter value vs field spec:
            if (v != null && field.type) {
                if (typeof field.type === 'string') {
                    if (v != null && typeof v !== field.type) {
                        throw new ns.ValidationError(
                            field.name,
                            v,
                            'Wrong type: ' + typeof v + ' -- ' +
                            'expects ' + field.type
                        );
                    }
                }
                else if (typeof field.type === 'function') {
                    if (!(v instanceof field.type)) {
                        throw new ns.ValidationError(
                            field.name,
                            v,
                            'Wrong object type, expects ' + field.type
                        );
                    }
                }
            }
            // check required values
            if (field.required && (v === null || v === undefined)) {
                if (field.defaultValue != null) {
                    v = field.defaultValue;
                } else {
                    throw new ns.ValidationError(
                        field.name,
                        v,
                        'Required non-null value.'
                    );
                }
            }
            // check final value against vocabulary of enumerated allowed:
            if (field.vocabulary) {
                if (v != null && field.vocabulary.indexOf(v) === -1) {
                    throw new ns.ValidationError(
                        field.name,
                        v,
                        'Disallowed value not in field vocabulary.'
                    );
                }
            }
            return v;
        };
        if (!field.name) {
            throw Error('Field must be named');
        }
        return {
            get: function () {
                return this.__props__[field.name] || field.defaultValue;
            },
            set: function (v) {
                // validate() may normalize, may throw ValidationError
                v = validate.call(this, v);
                this.__props__[field.name] = v;
            }
        };
    };

    /**
     * bindSchema():
     *  Iterate through a schema of fields, which is expressed as an
     *  object with keys matching each fieldname, and field description
     *  object values.  Each field description may describe field
     *  attributes and behavior via descriptors generated by fieldProperty()
     */
    ns.bindSchema = function (cls, schema) {
        Object.keys(schema).forEach(
            function (name) {
                var field = schema[name];
                field.name = field.name || name;  // name from schema key
                Object.defineProperty(
                    cls.prototype,
                    field.name,
                    ns.fieldProperty(field)
                );
            },
            cls
        );
    };

    /**
     * merged(cls):
     *  Given a content constructor/classs, compute merged schema based on
     *  cls.prototype.schema and schemas of parent/superclass.  On conflict
     *  favor more specific field in inheritance chain.
     *  Should cache for performance: this may be used in object contruction.
     */
    ns.merged = function (cls) {
        var merged = {};
        if (cls.__mergedSchema__) {
            return cls.__mergedSchema__;
        }
        uu.klass.all(cls).slice().reverse().forEach(
            function (provider) {
                Object.keys(provider.prototype.schema || {}).forEach(
                    function (name) {
                        var field = provider.prototype.schema[name];
                        field.name = field.name || name;
                        merged[name] = field;
                    },
                    this
                );
            },
            this
        );
        cls.__mergedSchema__ = merged;  // cache
        return merged;
    };

    ns.BaseContent = (function () {
        subclasses(BaseContent, uu.klass.BaseItem);

        // Base constructor copies schema fields
        function BaseContent(opts) {
            var schema = ns.merged(this.constructor);
            opts = opts || {};
            BaseContent.prototype.__super__.apply(this, [opts]);
            // given merged schema, attempt setting values from passed opts:
            Object.keys(schema).forEach(
                function (name) {
                    // May raise validation error on required missing
                    this[name] = opts[name];
                },
                this
            );
            this.afterAdd(opts);
        }

        BaseContent.prototype.schema = {};  // base schema is empty

        BaseContent.prototype.afterAdd = function (opts) {};  // hook

        return BaseContent;

    }());

    return ns;

}(uu, uu.schema || {}));

uu.datetime = (function (ns, moment) {
    "use strict";

    // now, or date normalization via moment.js (which parses ISO8601
    // naive times consistently across browsers as localtime).
    ns.normalizeDate = function (v) {
        v = (v == null) ? 'now' : v;
        return (v === 'now') ? new Date() : moment(v).toDate();
    };

    ns.validDate = function (v) {
        return moment(v).isValid();
    };

    return ns;

}(uu.datetime || {}, moment));


// uu.plotqi module
uu.plotqi = (function (ns, uu, moment) {

    "use strict";

    var normalizeDate = uu.datetime.normalizeDate,
        validDate = uu.datetime.validDate,
        subclasses = uu.klass.subclasses,
        descriptor = uu.klass.descriptor,
        BaseContent = uu.schema.BaseContent,
        bindSchema = uu.schema.bindSchema,
        ValidationError = uu.schema.ValidationError;

    /**
     * DataPoint class:
     *  Base data point, keyed by string identifier -- suitable for
     *  categorical plots, but not a time-series X-axis.
     */
    ns.DataPoint = (function () {
        subclasses(DataPoint, BaseContent);

        // ctor
        function DataPoint(opts) {
            opts = opts || {key: 'NOKEY'};
            opts.key = opts.key || null;
            // superclass ctor will bind all DataPoint schema fields:
            DataPoint.prototype.__super__.apply(this, [opts]);
        }

        // field schema definition
        DataPoint.prototype.schema = {
            key: {
                title: 'Data point key',
                type: 'string',
                required: true
            },
            value: {
                title: 'Data point value',
                type: 'number',
                required: false  // null value means explicitly N/A for key
            },
            title: {
                title: 'Descriptive label (for key)',
                type: 'string',
                required: false,
            },
            valueLabel: {
                title: 'Value label',
                description: 'May be used for N= labels for denominator value',
                type: 'string',
                required: false
            },
            note: {
                title: 'Data point note',
                description: 'Descriptive note, used in interactive features',
                type: 'string',
                defaultValue: ''
            },
            uri: {
                title: 'Data point URI',
                description: 'Link to data source for point',
                type: 'string',
                required: false
            }
        };

        // bind schema (descriptor per field via Object.defineProperty):
        bindSchema(DataPoint, DataPoint.prototype.schema);

        return DataPoint;
    }());


    // TimeSeriesDataPoint -- class for a datapoint with Date type key
    ns.TimeSeriesDataPoint = (function () {
        subclasses(TimeSeriesDataPoint, ns.DataPoint);

        function TimeSeriesDataPoint(opts) {
            opts = opts || {key: normalizeDate()};  // fallback key: now
            TimeSeriesDataPoint.prototype.__super__.apply(this, [opts]);
        }

        TimeSeriesDataPoint.prototype.schema = {
            key: {
                title: 'Date key',
                description: 'Time series data point key (Date value); ' +
                             'should be naive dates stored as localtime.',
                type: Date,
                required: true,
                constraint: function (field, value) {
                    // normalize value on property set, if setter gets
                    // date stamp parsable by moment.js (e.g. ISO8601),
                    // stored state is local Date object value:
                    return normalizeDate(value);
                }
            }
        };

        // bind schema (descriptor per field via Object.defineProperty):
        bindSchema(TimeSeriesDataPoint, TimeSeriesDataPoint.prototype.schema);

        return TimeSeriesDataPoint;
    }());

    // DataSeries -- base data series class, may be used for categorical data
    ns.DataSeries = (function () {
        subclasses(DataSeries, BaseContent);

        // ctor
        function DataSeries(opts) {
            opts = opts || {};
            // superclass ctor will bind all DataSeries schema fields:
            DataSeries.prototype.__super__.apply(this, [opts]);
            // Traverse the array of point data, normalize each point:
            this.data = this.sorted(
                (opts.data || []).map(
                    function (pointData) {
                        if (pointData instanceof Array &&
                            pointData.length === 2) {
                            // name, value pair
                            pointData = pointData[1];  // just use value
                        }
                        return this.constructPoint(pointData);
                    },
                    this
                )
            );
        }

        DataSeries.prototype.schema = {
            title: {
                title: 'Series title',
                description: 'Series/line name or title',
                type: 'string',
                required: false
            },
            description: {
                title: 'Series description',
                description: 'Descriptive text metadata about series, often' +
                             'is empty or unused',
                type: 'string',
                required: false
            },
            line_width: {
                title: 'Line width',
                description: 'Line width (in relative px units) Considered '+
                             'in line plots only, ignored otherwise.',
                type: 'number',
                required: false,
                defaultValue: 2.0
            },
            color: {
                title: 'Line/bar color',
                description: 'Primary series color name or HTML color code; ' +
                             'if unspecified ("Auto" default), defer to ' +
                             'automatic default color palette choices.',
                type: 'string',
                defaultValue: 'Auto',
                required: false
            },
            marker_color: {
                title: 'Point marker fill color',
                description: 'Data point marker color name or code; ' +
                             'if unspecified ("Auto" default), defer to ' +
                             'match the line/bar color.',
                type: 'string',
                defaultValue: 'Auto',
                required: false

            },
            marker_size: {
                title: 'Marker size',
                description: 'Marker size (in relative px units) Considered '+
                             'in line plots only, ignored otherwise.',
                type: 'number',
                required: false,
                defaultValue: 9.0
            },
            marker_width: {
                title: 'Marker stroke width',
                description: 'Marker stroke width (in relative px units) ' +
                             'Considered in line plots only, ignored ' +
                             'otherwise.  Currently only used for marker ' +
                             'style/shape that is not filled.',
                type: 'number',
                required: false,
                defaultValue: 2.0
            },
            marker_style: {
                title: 'Marker shape style',
                description: 'Marker shape, selected from enumerated ' +
                             'vocabulary of allowable choices.',
                type: 'string',
                vocabulary: [
                    'diamond',
                    'circle',
                    'square',
                    'x',
                    'plus',
                    'dash',
                    'filledDiamond',
                    'filledCircle',
                    'filledSquare',
                ],
                required: false,
                defaultValue: 'square'
            },
            show_trend: {
                title: 'Show trend line?',
                type: 'boolean',
                defaultValue: false
            },
            trend_width: {
                title: 'Trend line width, if applicable',
                type: 'number',
                defaultValue: 2.0
            },
            trend_color: {
                title: 'Trend line color, if applicable',
                description: 'Trend line color name or code; ' +
                             'if unspecified ("Auto" default), defer to ' +
                             'match the line/bar color.',
                type: 'string',
                defaultValue: 'Auto'
            },
            point_labels: {
                title: 'Show point labels?',
                description: 'Show labels above each marker for data value? ' +
                             'The default value of defer obeys plot-wide ' +
                             'setting, where show/omit explicitly do as ' +
                             'described.',
                type: 'string',
                vocabulary: ['defer', 'omit', 'show'],
                defaultValue: 'defer'
            }
        };

        bindSchema(DataSeries, DataSeries.prototype.schema);

        // Sort plug point -- return sorted and/or de-duplicated points,
        //  used by constructor on data inputs (from JSON); this implementation
        //  should support string and Date object key types.
        DataSeries.prototype.sorted = function (seq) {
            var knownKeys = [],
                unduplicated = function (point) {
                    var key = point.key,
                        k = (key instanceof Date) ? key.getTime() : key,
                        known = knownKeys.indexOf(k) !== -1;
                    // push to knownKeys via closure; not idempotent by design
                    if (!known) {
                        knownKeys.push(k);
                    }
                    return !known;
                },
                cmp = function (a, b) {
                    a = (a.key instanceof Date) ? a.key.getTime() : a.key;
                    b = (b.key instanceof Date) ? b.key.getTime() : b.key;
                    return (a < b) ? -1 : 1;
                },
                inputData = seq.slice();  // copy for in-place sorting
            inputData.sort(cmp);
            return inputData.filter(unduplicated);
        };

        DataSeries.prototype.pointConstructor = ns.DataPoint;

        DataSeries.prototype.constructPoint = function (data) {
            var point = new this.pointConstructor(data);
            return point;
        };

        return DataSeries;
    }());

    // TimeDataSeries: class for series of Date-keyed datapoints, should be
    //                 ordered chronologically.
    ns.TimeDataSeries = (function () {
        subclasses(TimeDataSeries, ns.DataSeries);

        function TimeDataSeries(opts) {
            TimeDataSeries.prototype.__super__.apply(this, [opts]);
        }

        TimeDataSeries.prototype.schema = {
            break_lines: {
                title: 'Break lines?',
                description:
                    'When a value is missing for name or date on the ' +
                    'X axis, should the line be broken/discontinuous ' +
                    'such that no line runs through the empty/null ' +
                    'value?  This defaults to true, which means that ' +
                    'no line will run from adjacent values through the ' +
                    'missing value.  For purposes of tabular legend, ' +
                    'any value without a data-source should render "--" ' +
                    'and any null value (specifying N/A or NaN value) ' +
                    'should display as N/A.  At future date, we may ' +
                    'wish to add other options for this case, such as ' +
                    'drawing a dotted-line through the N/A period that ' +
                    'breaks continuity of contiguous points.  Ideally, ' +
                    'any such rendering behavior avoids depending on a ' +
                    'fixed frequency for a time-series plot.',
                type: 'boolean',
                defaultValue: true
            },
        };

        bindSchema(TimeDataSeries, TimeDataSeries.prototype.schema);

        TimeDataSeries.prototype.pointConstructor = ns.TimeSeriesDataPoint;

        return TimeDataSeries;
    }());

    // MultiSeriesChart: chart state/config and container (via 'series'
    //  attribute) of zero or more DataSeries objects.
    ns.MultiSeriesChart = (function () {
        subclasses(MultiSeriesChart, BaseContent);

        function MultiSeriesChart(opts) {
            opts = opts || {};
            MultiSeriesChart.prototype.__super__.apply(this, [opts]);
            // construct this.series from opts.series:
            this.series = [];
            (opts.series || []).forEach(
                function (seriesData) {
                    var series = new this.seriesConstructor(seriesData);
                    this.series.push(series);
                },
                this
            );
        }

        MultiSeriesChart.prototype.seriesConstructor = ns.DataSeries;

        MultiSeriesChart.prototype.schema = {
            // Identifiction: shortname and uid
            name: {
                title: 'Short name',
                description: 'Short name of plot, unique only to report it ' +
                             'is contained within, usually descriptive, ' +
                             'like a filename; often transformed from ' +
                             'title.  May be present in JSON, but usually ' +
                             'is not preferred for identification or ' +
                             'data binding vs. UID; may be used in URL ' +
                             'construction, but in itself does not contain ' +
                             'full context or URI.',
                type: 'string',
                required: false
            },
            uid: {
                title: 'UID',
                description: 'UUID (hexidecimal representation) of chart, ' +
                             'based on UUID of chart content in Teamspace ' +
                             'CMS system.  May or may not be in canonical ' +
                             'RFC 4122 format (with dashes) or unfieled ' +
                             'hexidecimal format (usually, no dashes).',
                type: 'string',
                required: false
            },
            url: {
                title: 'Chart URL',
                description: 'Base URL to chart content',
                type: 'string',
                required: false
            },
            // Basic metadata -- may be rendered in template in HTML source
            //                   rendered by server, if it is included in
            //                   DOM this way, plotting application may
            //                   choose to re-plot it, if necessary?
            //                   Current (Sept. 2014) implementation is
            //                   *ignoring* title, description even though
            //                   they are provided in JSON.
            title: {
                title: 'Title',
                description: 'Data collection name or title; may be ' +
                             'displayed in legend.',
                type: 'string',
                required: false
            },
            description: {
                title: 'Description',
                description: 'Textual description of the data collection.',
                type: 'string',
                required: false
            },
            info: {
                title: 'Informative notes / caption',
                description: 'This allows any rich text and may contain ' +
                             'free-form notes about this chart; displayed ' +
                             'in report output.  NOTE: this is NOT included ' +
                             'in JSON as of September 2014, and is instead ' +
                             'rendered server-side in template -- it may be ' +
                             'included in future JSON feeds.',
                type: 'string',
                required: false
            },
            // Type of plot:
            chart_type: {
                title: 'Chart type',
                description: 'Type of chart to display (line or bar).',
                type: 'string',
                vocabulary: ['line', 'bar'],
                defaultValue: 'line',
                required: true
            },
            // Plot sizing: favor aspect_ratio over height, if provided
            width: {
                title: 'Width',
                description: 'Display width of chart, including Y-axis ' +
                             'labels, grid, and legend (if applicable) in ' +
                             'units configured.',
                type: 'number',
                defaultValue: '100',
                required: true
            },
            width_units: {
                title: 'Units of width',
                description: '',
                type: 'string',
                defaultValue: '%',
                required: true
            },
            height: {
                title: 'Height',
                description: 'Display height of chart in units configured ' +
                             '(either as percentage of width, or in pixels) ' +
                             ' -- used when aspect_ratio not specified.',
                type: 'number',
                defaultValue: '50',
                required: true
            },
            height_units: {
                title: 'Units of height',
                description: 'Ignore unless aspect ratio not provided or ' +
                             'value of height_units is % or px.',
                type: 'string',
                defaultValue: '2:1',    // prefer aspect_ratio field to this
                required: true
            },
            aspect_ratio: {
                title: 'Aspect ratio',
                description: 'Preferred ratio of width to height, should ' +
                             'control height of containing div, if present.',
                type: Array,
                required: false,
                constraint: function (field, value) {
                    // validate that value is indeed a two-item Array of num.
                    var failure = null;
                    if (value instanceof Array) {
                        if (value.length !== 2) {
                            failure = 'improper aspect ratio length';
                        } else {
                            if (typeof value[0] !== 'number' ||
                                typeof value[1] !== 'number') {
                                failure = 'Improper element in aspect ratio';
                            }
                        }
                    }
                    if (failure) {
                        throw new ValidationError(field.name, value, failure);
                    }
                }
            },
            // Y-axis display: range, unit label, general label.
            // NOTE: not configurable (yet), but assumed: tick frequency at
            //      0 (bottom), 20, 40, 60, 80, 100 (top) for percentage
            //      based plots; small multiple plots may choose to render
            //      only top, bottom, mid-point as y-axis tick frequency.
            range_min: {
                title: 'Range minimum',
                description: 'Minimum anticipated value of any data point ' +
                             '(optional; if not specified, calculate from '+
                             'available data on all contained series).',
                type: 'number',
                required: false
            },
            range_max: {
                title: 'Range maximum',
                description: 'Maximum anticipated value of any data point ' +
                             '(optional; if not specified, calculate from '+
                             'available data on all contained series).',
                type: 'number',
                required: false
            },
            units: {
                title: 'Units',
                description: 'Common set of units of measure for the data ' +
                             'series in this collection.  If the units for ' +
                             'series are not shared, then define respective ' +
                             'units on the series themselves. May be ' +
                             'displayed as part of Y-axis label using a ' +
                             'parenthetical notation of both units and ' +
                             'y_label are provided.',
                type: 'string',
                required: false
            },
            y_label: {
                title: 'Y axis label',
                description: 'Primary Y-Axis label/title (descriptive); ' +
                             'this is often omitted since axis is often ' +
                             'self-describing (especially when units are ' +
                             'percentages).  If omitted, do not allocate ' +
                             'space in plot for label. If included, ' +
                             'render text at 90-degree rotation ' +
                             '(counter-clockwise, with text bottom-to-top).',
                type: 'string',
                defaultValue: '',
                required: false
            },
            // Goal line: value (if defined), color:
            goal: {
                title: 'Goal',
                description: 'Common goal value as decimal number.  If each ' +
                             'series has different respective goals, edit ' +
                             'those goals on each series.  If goal is ' +
                             'undefined or null, omit display of goal line.',
                type: 'number',
                required: false
            },
            goal_color: {
                title: 'Goal-line color',
                description: 'If omitted, color will be selected from ' +
                             'defaults.',
                type: 'string',
                defaultValue: 'Auto',
                required: false
            },
            // Legend configuration:
            legend_placement: {
                title: 'Legend placement',
                description: 'Where to place legend in relationship to the ' +
                             'grid. Note: the legend is disabled for less ' +
                             'than two series/line unless the tabular '+
                             'legend is selected.',
                type: 'string',
                vocabulary: [
                    'tabular',      // (def) aligned value table below grid
                    'outside',      // outside grid, next most common
                    'inside'        // inside grid, rarely used
                ],
                defaultValue: 'outside',
                required: false
            },
            legend_location: {
                title: 'Legend location',
                description: 'Select a directional position for legend. ' +
                             'This setting is ignored if either the tabular ' +
                             'legend placement is selected or if the legend ' +
                             'is hidden (for less than two series). ' +
                             'Available choices are cardinal directions, ' +
                             'which is a hold-over from how jqPlot idioms.',
                type: 'string',
                vocabulary: [
                    'n',        // top
                    'e',        // right of grid, vertical align at middle
                    'w',        // left of grid, vertical align at middle
                    's',        // bottom, below plot
                    'nw',       // left of grid, top-aligned
                    'ne',       // right of grid, top-aligned
                    'sw',       // left of grid, bottom-aligned
                    'se'        // right of grid, bottom-aligned
                ],
                defaultValue: 'e',
                required: false
            },
            // X-axis (title label):
            x_label: {
                title: 'X axis label',
                description: 'Label for X-axis, optional.',
                type: 'string',
                defaultValue: '',
                required: false
            },
            // misc:
            css: {
                title: 'Chart styles',
                description: 'CSS stylesheet rules for chart (optional).',
                type: 'string',
                required: false
            },
            point_labels: {
                title: 'Show point labels?',
                description: 'Show labels above data-point markers?  This ' +
                             'may be overridden on individual lines/series. ' +
                             'If omitted, the usual assumption is that ' +
                             'a viewer in a browser must hover over a ' +
                             'point to see its value, and click for detail. ' +
                             'The primary usability question with this is ' +
                             'what to do with overlapping values from two ' +
                             'lines, which is why we omit usually (or have ' +
                             'an idiom of displaying just labels for the ' +
                             'first/primary line on the plot, not plot-wide.',
                type: 'string',
                vocabulary: ['show', 'omit'],
                defaultValue: 'omit',
                required: true
            }
        };

        bindSchema(MultiSeriesChart, MultiSeriesChart.prototype.schema);

        return MultiSeriesChart;
    }());

    ns.TimeSeriesChart = (function () {
        subclasses(TimeSeriesChart, ns.MultiSeriesChart);

        function TimeSeriesChart(opts) {
            opts = opts || {};
            TimeSeriesChart.prototype.__super__.apply(this, [opts]);
        }

        // Pluggable constructor for contained series, used by parent ctor:
        TimeSeriesChart.prototype.seriesConstructor = ns.TimeDataSeries;

        TimeSeriesChart.prototype.schema = {
            frequency: {
                title: 'Frequency (YAGNI??)',
                description: 'Frequncy between periods of reporting that ' +
                             'the plot visualizes.  May be used as cue for ' +
                             'handling the default date-label choices, ' +
                             'where month names are often stand-ins for ' +
                             'an exemplar date value for the month, e.g. ' +
                             '2014-06-01 may be represented as "Jun 2014". ' +
                             'THIS MAY BE YAGNI if we do not need to draw ' +
                             'vertical lines at X-axis tick labels, or just ' +
                             'rely on scales and explicit data-labels in ' +
                             'the labels field below (the JSON will provide ' +
                             'them, and if it does not, then just using ' +
                             'default US-appropriate short-date of ' +
                             'MM/DD/YYYY may be good enough to justify ' +
                             'ignoring this?  I cannot remember why jqPlot ' +
                             'wants this interval-frequency on the domain, ' +
                             'but it may be unnecessarily constraining to ' +
                             'fix this to a controlled set of choices or ' +
                             'just plain unnecessary?',
                type: 'string',
                vocabulary: ['monthly', 'weekly', 'yearly', 'quarterly'],
                defaultVaue: 'monthly',
                required: false
            },
            start: {
                title: 'Start date',
                description: 'Explicit start date; optional.  If an ' +
                             'explicit start date is not provided, one ' +
                             'should be computed from earliest value in ' +
                             'provided data.',
                type: Date,
                constraint: function (field, value) {
                    // normalize value on property set, if setter gets
                    // date stamp parsable by moment.js (e.g. ISO8601),
                    // stored state is local Date object value:
                    if (value !== undefined) {
                        return normalizeDate(value);
                    }
                },
                required: false
            },
            end: {
                title: 'End date',
                description: 'Explicit end date; optional.  If an ' +
                             'explicit end date is not provided, one ' +
                             'should be computed from latest value in ' +
                             'provided data.',
                type: Date,
                constraint: function (field, value) {
                    // normalize value on property set, if setter gets
                    // date stamp parsable by moment.js (e.g. ISO8601),
                    // stored state is local Date object value:
                    if (value !== undefined) {
                        return normalizeDate(value);
                    }
                },
                required: false
            },
            labels: {
                title: 'Date labels',
                description: 'Date label overrides, used for X-axis labels. ' +
                             'if ommitted in whole or in part, use a ' +
                             'default MM/DD/YYYY format for dates. Is an ' +
                             'untyped object value used as key/vaule pair; ' +
                             'keys are ISO 8601 date stamps, values labels; ' +
                             'example: http://snag.gy/D1zjx.jpg',
                type: Object,
                constraint: function (field, value) {
                    // validate the object key/value pairs:
                    Object.keys(value).forEach(function (k) {
                            var v = value[k];
                            if (!validDate(k)) {
                                throw new ns.ValidationError(
                                    field,
                                    value,
                                    'Invalid date-label key, not datestamp:' +
                                    k
                                );
                            }
                            if (typeof v !== 'string') {
                                throw new ns.ValidationError(
                                    field,
                                    value,
                                    'Invalid label value: ' +
                                    k + ', '  + v
                                );
                            }
                        },
                        this
                    );
                },
                required: false
            },
            auto_crop: {
                title: 'Auto-crop data?',
                description:
                    'If data contains sequential null values (incomplete ' +
                    'or no data calculable) on the right-hand of a ' +
                    'time-series plot, should that right-hand side ' +
                    'be cropped to only show the latest meaningful ' +
                    'data?  The default is to crop automatically.',
                type: 'boolean',
                defaultValue: true,
                required: false
            }
        };

        bindSchema(TimeSeriesChart, TimeSeriesChart.prototype.schema);

        return TimeSeriesChart;
    }());

    // factory function takes post-parsed JSON data, and determines what
    // kind of chart to construct:
    ns.chart = function (data) {
        /* jshint newcap:false */
        var factory = ns.MultiSeriesChart;  // base/default type
        if (data.x_axis_type === 'date') {
            factory = ns.TimeSeriesChart;
        }
        return new factory(data);
    };

    return ns;

}(uu.plotqi || {}, uu));
