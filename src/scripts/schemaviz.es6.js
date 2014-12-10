/*jshint esnext:true, eqnull:true */
/*globals require */
import {Schema, schematize, ValidationError, ValidationTypeError} from './classviz.es6.js';
var moment = require('moment');

function dateTypeConstraint(value) {
  var m = moment(value);
  if(!m.isValid()) return null;
  return m.toDate();
}

export class DataPointSchema extends Schema {
  constructor() {
    super();
    schematize({
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
    }, this);
  }
}
export var dataPointSchema = new DataPointSchema();

export class TimeDataPointSchema extends DataPointSchema {
  constructor() {
    super();
    schematize({
      key: {
        title: 'Date key',
        description: 'Time series data point key (Date value); ' +
                     'should be naive dates stored as localtime.',
        type: Date,
        required: true,
        constraint: dateTypeConstraint
      }
      }, this);
  }
}
export var timeDataPointSchema = new TimeDataPointSchema();

export class DataSeriesSchema extends Schema {
  constructor() {
    super();
    schematize({
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
            defaultValue: 'auto',
            required: false
          },
          marker_color: {
            title: 'Point marker fill color',
            description: 'Data point marker color name or code; ' +
                         'if unspecified ("Auto" default), defer to ' +
                         'match the line/bar color.',
            type: 'string',
            defaultValue: "Auto",
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
            constraint: function (value, obj) {
              if(value === 'x') return 'cross';
              if(value === 'filledCircle') {
                obj.filled = true;
                return 'circle';
              }
              if(value === 'filledSquare') {
                obj.filled = true;
                return 'square';
              }
              if(value === 'filledDiamond') {
                obj.filled = true;
                return 'diamond';
              }
            },
            vocabulary: [
              'diamond',
              'circle',
              'square',
              'cross',
              'plus',
              'dash',
              'triangle-up',
              'triangle-down'
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
            defaultValue: "Auto"
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
          },
          display_format: {
            title: 'Display format for y values',
            description: 'Standard formatting string',
            type: 'string',
            defaultValue: '%%.%if'
          }
        }, this);
  }
}
export var dataSeriesSchema = new DataSeriesSchema();

export class TimeDataSeriesSchema extends DataSeriesSchema {
  constructor() {
    super();
    schematize({
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
        type: 'string',
        constraint: function (value) {
          if(typeof value === 'boolean')
            return value ? 'dashed' : 'solid';
        },
        vocabulary: ['hidden', 'solid', 'dashed'],
        defaultValue: 'dashed'
      }
    }, this);
  }
}
export var timeDataSeriesSchema = new TimeDataSeriesSchema();

export class MultiSeriesChartSchema extends Schema {
  constructor() {
    super();
    schematize({
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
              constraint: function (value) {
                // validate that value is indeed a two-item Array of num.
                if (value.length !== 2)
                  throw new ValidationError(this, value, 'Aspect ratio must be a two element Array');
                if (typeof value[0] !== 'number' || typeof value[1] !== 'number')
                  throw new ValidationTypeError(this, (typeof value[0]) + ' ' + (typeof value[1]), 'Both elements of aspect ratio must be numbers');
            }
          },
          range_min: {
            title: 'Range minimum',
            description: 'Minimum anticipated value of any data point ' +
                         '(optional; if not specified, calculate from '+
                         'available data on all contained series).',
            type: 'number',
            constraint: function(value, obj) {
              var max = (obj.range_max != null) ? obj.range_max : null;
              if(value > max) throw new ValidationError(this, value, 'range_min must be less than or equal to range_max');
              return value;
            },
            required: false
          },
          range_max: {
            title: 'Range maximum',
            description: 'Maximum anticipated value of any data point ' +
                         '(optional; if not specified, calculate from '+
                         'available data on all contained series).',
            type: 'number',
            constraint: function(value, obj) {
              var min = (obj.range_min != null) ? obj.range_min : null;
              if(value < min) throw new ValidationError(this, value, 'range_max must be greater than or equal to range_min');
              return value;
            },
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
            defaultValue: "Auto",
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
              'w',        // left of grid, vertical align at middle //DEPRECATED
              's',        // bottom, below plot //DEPRECATED
              'nw',       // left of grid, top-aligned //DEPRECATED
              'ne',       // right of grid, top-aligned
              'sw',       // left of grid, bottom-aligned //DEPRECATED
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
        }, this);
  }
}
export var multiSeriesChartSchema = new MultiSeriesChartSchema();

export class TimeSeriesChartSchema extends MultiSeriesChartSchema {
  constructor() {
    super();
    schematize({
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
            defaultValue: 'monthly',
            required: false
          },
          start: {
            title: 'Start date',
            description: 'Explicit start date; optional.  If an ' +
                         'explicit start date is not provided, one ' +
                         'should be computed from earliest value in ' +
                         'provided data.',
            type: Date,
            constraint: function(value, obj) {
              value = dateTypeConstraint(value);
              var end = obj.end;
              if(end == null) return value;
              if(value > end) throw new ValidationError(this, value, 'Start date cannot be after end date');
              return value;
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
            constraint: function(value, obj) {
              value = dateTypeConstraint(value);
              var start = obj.start;
              if(start == null) return value;
              if(value < start) throw new ValidationError(this, value, 'End date cannot be before start date');
              return value;
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
            constraint: function (value) {
              // validate the object key/value pairs:
              Object.keys(value).forEach(function (k) {
                var v = value[k];
                if (!moment(k).isValid())
                  throw new ValidationError(this, value, 'Key is not a valid Datestamp: ' + k);
                if (typeof v !== 'string')
                  throw new ValidationTypeError(this, typeof v, 'Labels must be strings');
              }, this);
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
        }, this);
  }
}
export var timeSeriesChartSchema = new TimeSeriesChartSchema();