/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

var moment = require('moment');
var d3 = require('d3');
var document = window.document;

// singleton app style element:
var styleEl = document.createElement('style');
document.head.appendChild(styleEl);
export var styleSheet = styleEl.sheet;

export var DEFAULT_COLORS = [
  '#393960',
  '#8AA9C9',
  '#5F9EA0',
  '#9370DB',
  '#4682B4',
  '#2E8B57',
  '#FF7F50',
  '#FFD700',
  '#DA70D6',
  '#008080',
  '#FF1493',
  '#6A5ACD',
  '#708090',
  '#FF6347',
  '#66CDAA',
  '#F08080'
];

// uuid function via http://stackoverflow.com/a/2117523/835961
var uuid4_tmpl = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
export var uuid4 = function () {
  return uuid4_tmpl.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
};

export function urlArgs() {
  var qs = window.location.search.slice(1),
      pair = part => part.split('='),
      pairs = qs.split('&').map(pair),
      result = {};
  pairs.forEach(function ([key, value]) {
    result[key] = value;
  });
  return result;
}

export function parseDate(spec, useMoment) {
  /** parse date specification/stamp, strictly ISO 8601 if string, and assume
   *  any naive timestamp should be treated as UTC.  Returns Date if
   *  not useMoment, else returns moment object.
   */
  var m,
      getUTC = stamp => moment.utc(stamp, moment.ISO_8601),
      getLocal = stamp => moment(stamp, moment.ISO_8601),
      isNaive = function (datestamp) {
        var timePart = datestamp.slice(11);
        if (datestamp.length === 10) {
          return true;    // date only, no time
        }
        if (datestamp.slice(-1) === 'Z') {
          return false;  // not naive, explicit UTC
        }
        if (timePart.indexOf('+') !== -1 || timePart.indexOf('-') !== -1) {
          return false;  // TZ offset
        }
        return true;
      };
  if (typeof spec === 'string') {
    m = (isNaive(spec)) ? getUTC(spec) : getLocal(spec);
  } else {
    m = moment.utc(spec);
  }
  return (!!useMoment) ? m : m.toDate();
}

export function range() {
  /** range() mimics python range() function */
  var args = arguments,
      stop = (args.length > 1) ? args[1] : args[0],
      start = (args.length > 1) ? args[0] : 0, 
      step = (args.length > 2) ? args[2] : 1,
      result = [],
      i;
  if (step === 0) {
    throw new RangeError('range() step argument must not be zero');
  }
  for (i=start; (step > 0) ? (i < stop) : (i > stop); i+= step) {
    result.push(i);
  }
  return result;
}

export function geometricBatch(length) {
    var r = [],
        size = 1,
        pos = 0;
    while (size <= length) {
        r.push([pos, Math.min(size, length-pos)]);
        pos = pos + size;
        size += size;  // 1, 2, 4, 8, 16, 32,...N
    }
    return r;
}

export function forReportJSON(jsonFile, callback) {
	d3.json(jsonFile, function (input) {
    /** given JSON where charts and data-points may be key/value pairs in 
      * JSON Arrays, normalize to simple Arrays of objects.
      */
    var kv2data = ([k, v]) => v,  // key/value pair array to data/value object
        data = (input instanceof Array) ? input.map(kv2data) : [ input ],
        normalizeSeriesData = s => s.data = s.data.map(kv2data);
    data.forEach(chart => chart.series.forEach(normalizeSeriesData));
    callback(data);
	});
}

// Taken from an upcoming version of d3, heavily altered to suit UPIQ:
export function d3textWrap(text, width, paddingRightLeft, paddingTopBottom, ignorePadding) {

    paddingRightLeft = paddingRightLeft != null ? paddingRightLeft : 5; //Default padding (5px)
    paddingTopBottom = (paddingTopBottom != null ? paddingTopBottom : 5) - 2; //Default padding (5px), remove 2 pixels because of the borders
    var maxWidth = width; //I store the tooltip max width
    width = ignorePadding ? width : width - (paddingRightLeft * 2); //Take the padding into account

    var arrLineCreatedCount = [];
    text.each(function() {
        var text = d3.select(this),
            words = text.text().split(' ').reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.2, //Ems
            y = parseFloat(text.attr("y")),
            dy = parseFloat(text.attr("dy")),
            createdLineCount = 1, //Total line created count
            textAlign = text.style('text-anchor') || 'start'; //'start' by default (start, middle, end, inherit)

        //Clean the data in case <text> does not define those values
        if (isNaN(dy)) dy = 0; //Default padding (0em) : the 'dy' attribute on the first <tspan> _must_ be identical to the 'dy' specified on the <text> element, or start at '0em' if undefined

        y = +((null === y)?paddingTopBottom:y);

        var tspan = text.text(null).append("tspan").attr("x", paddingRightLeft).attr("dy", dy + "em");
        while (!!(word = words.pop())) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width && line.length > 1) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", paddingRightLeft).attr("dy", lineHeight + dy + "em").text(word);
                ++createdLineCount;
            }
        }

        arrLineCreatedCount.push(createdLineCount); //Store the line count in the array
    });
    return arrLineCreatedCount;
}


export class ColorTool {

  static upScale8 (v) {
    if (v < 0 || v > 1) {
      throw new RangeError('Color channel ratio value must be between 0-1.');
    }
    return Math.round(v * 255);
  }

  static downScale8 (v) {
    /** downscale 8-bit channel integer value to decimal number between 0-1. */
    if (v < 0 || v > 255) {
      throw new RangeError('Color channel value must be between 0-255.');
    }
    return Math.round(v) / 255.0;
  }

  static normalizeColor (color) {
    /** normalizes vs potential 3-digit hex shorthand color, via rules
      * described in CSS speficication:
      * http://www.w3.org/TR/CSS21/syndata.html#color-units
      */
    var two = function (s,n) { return (new Array(2+1)).join(s); },
        expandHex = function (s) { return two(s[1])+two(s[2])+two(s[3]); },
        isHex = function (s) { return s[0] === '#'; };
    if (!isHex(color)) {
        return color;
    }
    return (color.length === 7) ? color : '#' + expandHex(color);
  }

  static rgb (color) {
    /** return array of R, G, B colors for hexidecimal color code */
    var _c = ColorTool.normalizeColor(color),
        r = parseInt(_c.slice(1,3), 16),
        g = parseInt(_c.slice(3,5), 16),
        b = parseInt(_c.slice(5,7), 16);
    return [r, g, b];
  }

  static rgb2hex (rgb) {
    /** take r, g, b as array of 8-bit values per channel, return hex */
    var pad2 = function(v) { return (v.length < 2) ? '0' + v : v; },
        channelHex = function (v) { return pad2(v.toString(16)); };
    return '#' + rgb.map(channelHex).join('');
  }

  static rgb2hsv (color, useHSL) {
    /** 24-bit rgb to h, s, v color array, roughly based on algorithm
      * descriptions from:
      *   http://en.wikipedia.org/wiki/HSL_and_HSV#Converting_to_RGB
      *   http://www.cs.rit.edu/~ncs/color/t_convert.html
      */
    var rescale = ColorTool.downScale8,
        baseRGB = (color instanceof Array) ? color : ColorTool.rgb(color),
        rgb = baseRGB.map(rescale),  // [0-255]->[0-1]
        min = Math.min.apply(null, rgb),
        max = Math.max.apply(null, rgb),
        chroma = max - min,
        isBlack = (max === 0),
        isGray = (chroma === 0),
        [r, g, b] = rgb,
        v = max,  // in HSV, largest component is value (unlike HSI/HSL)
        h, s, l;
    // Black & grayscale are special cases:
    if (isBlack || isGray) {
      // HSV for gray can be any point on cube with value equal to max
      return [0, 0, v];  // saturation === 0 is sentinel for grayscale
    }
    s = chroma / v;  // S_HSV
    if (r === max) {
      // red is brightest component, hue between yellow->magenta
      h = (g - b) / chroma;
    } else if (g === max) {
      // green is brightest component, hue between cyan->yellow
      h = 2 + ((b - r) / chroma);
    } else {
      // blue is brightest component, hue between magenta->cyan
      h = 4 + ((r - g) / chroma);
    }
    h *= 60;  // convert by 60 degrees
    if (h < 0) {
      h += 360;
    }
    if (!useHSL) {
      // HSV:
      return [h, s, v];
    }
    // HSL:
    l = 0.5 * (max + min);
    s = chroma / (1 - Math.abs(2*l - 1)); // S_HSL
    return [h, s, l];
  }

  static rgb2hsl (color) {
    return ColorTool.rgb2hsv(color, true);  // force HSL
  }

  static hsv2rgb (hsv, useHex, useHSL) {
    /** hsv Array to 24-bit RGB color, roughly based on algorithm descriptions
     * from:
     *   http://en.wikipedia.org/wiki/HSL_and_HSV#Converting_to_RGB
     *   http://www.cs.rit.edu/~ncs/color/t_convert.html
     */
    var r, g, b,
        rgb,
        [h, s, v] = hsv,
        l = v,  // IFF useHSL, third argument is actually lightness
        isGray = (v === 0 || s === 0),  // zero-v is black, zero-s is gray
        rescale = ColorTool.upScale8,
        hPrime = h / 60.0,  // determine
        chroma = (!!useHSL) ? (1 - Math.abs(2 * l - 1)) * s : v * s,
        r1, g1, b1, x, pos, m;
    if (!(hsv instanceof Array)) {
      throw new TypeError('Invalid HSV value, must be Array.');
    }
    useHex = (useHex === undefined) ? true : false;  // default returns hex
    if (isGray) {
      [r, g, b] = [v, v, v];  // set all R,G,B channels to equal value
    } else {
      // color, working off "pizza slices" in the chromacity plane:
      x = chroma * (1 - Math.abs((hPrime % 2) - 1));
      pos = Math.floor(hPrime);  // region on the chromaticity plane/hexagon
      switch (pos) {
        case 0:
          [r1,g1,b1] = [chroma, x, 0];
          break;
        case 1:
          [r1,g1,b1] = [x, chroma, 0];
          break;
        case 2:
          [r1,g1,b1] = [0, chroma, x];
          break;
        case 3:
          [r1,g1,b1] = [0, x, chroma];
          break;
        case 4:
          [r1,g1,b1] = [x, 0, chroma];
          break;
        default:
          [r1,g1,b1] = [chroma, 0, x];
          break;
      }
      m = (!!useHSL) ? (l - 0.5 * chroma) : v - chroma;
      [r, g, b] = [r1 + m, g1 + m, b1 + m];
    }
    rgb = [r, g, b].map(rescale);
    return (useHex) ? ColorTool.rgb2hex(rgb) : rgb;
  }

  static hsl2rgb (hsl, useHex) {
    return ColorTool.hsv2rgb(hsl, useHex, true);  // force HSL->RGB
  }

  static colorShift (color, multiplier, deltaFn) {
    /** shift lightness up or down by multiplier using delta function */
    var [h, s, l] = ColorTool.rgb2hsl(color),
        delta = deltaFn(l),
        rgb;
    multiplier = (multiplier === undefined) ? 0.2 : multiplier;
    if (multiplier < 0 || multiplier > 1) {
      throw new RangeError('multipler must be >= 0, <= 1');
    }
    return ColorTool.hsl2rgb([h, s, l + (delta * multiplier)]);
  }

  static lighten(color, multiplier) {
    return ColorTool.colorShift(color, multiplier, l => 1 - l);
  }

  static darken(color, multiplier) {
    return ColorTool.colorShift(color, multiplier, l => -1 * l);
  }

  static isDark(color) {
    return ColorTool.rgb2hsl(color)[2] < 0.5;  // lightness < 50%
  }

  static isLight(color) {
    return ColorTool.rgb2hsl(color)[2] >= 0.5; // lightness >= 50%
  }

}

/** simple linear regression as slope-intercept for trendline: */

export function trendlineSlopeIntercept(points) {
  /**
    * Given an array of data point pairs (each an array of x,y values)
    * returns two item array of slope and y-intercept [m, b] for y = mx + b
    * that can be used by callers in constructing a trendline.
    * Uses least-squares method:
    *   http://en.wikipedia.org/wiki/Simple_linear_regression
    * Caveats:
    *  * Does not return or calculate R-squared value.
    *  * Favors functional code readability at cost of repeated iteration.
    */ 
  var square = a => a*a,
      sum = sequence => sequence.reduce(((a, b) => a + b), 0),
      pairProduct = pair => pair[0] * pair[1],
      n = points.length,
      xValues = points.map(point => point[0]),
      yValues = points.map(point => point[1]),
      sumX = sum(xValues),                        // ∑ x
      sumY = sum(yValues),                        // ∑ y
      sumXY = sum(points.map(pairProduct)),       // ∑ xy
      sumX2 = sum(xValues.map(square)),           // ∑ x²
      variance = sumX2 - (square(sumX) / n),      // Sxx = ∑x² - (∑x)² / n
      covariance = sumXY - (sumX * sumY / n),     // Sxy = ∑xy - (∑x * ∑y) / n
      slope = covariance/variance,                // m = Sxy / Sxx
      // y-intercept is average y-value over slope minus average x-value
      intercept = (sumY / n) - (slope * sumX / n);  // b = (∑y / n) - m(∑x / n)
  return [slope, intercept];
}

export function fittedTrendline(points, domain, range) {
  /** Given points, domain, and range, returns coordinates for a line in
    * object form (keys of x1, y1, x2, y2) for line to be drawn left-to-right
    */
  var [slope, intercept] = trendlineSlopeIntercept(points),
      solveForY = x => slope * x + intercept,     // y = mx + b
      solveForX = y => (y - intercept) / slope,   // x = (y - b) / m
      [minY, maxY] = range,
      [minX, maxX] = domain,
      decline = slope < 0,
      r = {};
  r.x1 = solveForX((decline) ? maxY : minY);      // left-most x...
  r.x1 = (r.x1 < minX) ? minX : r.x1;             // ...that is in bound box
  r.y1 = solveForY(r.x1);
  r.x2 = solveForX((decline) ? minY : maxY);      // right-most x...
  r.x2 = (r.x2 > maxX) ? maxX : r.x2;             // ...that is in bound box
  r.y2 = solveForY(r.x2);
  r.slope = slope;
  return r;
}

