var moment = require('moment');
export function getObjects(jsonFile, callback) {
	d3.json(jsonFile, function (jsonData) {
		var objs = [];
		if(jsonData.length)
			objs = jsonData.map( function ([, obj]) { return obj; } );
		else //if the JSON payload wasn't an array
			objs = [ jsonData ]; //then we were given a single object
		/*objs.forEach(function (val, index) {
			this[index].series.forEach(function (v, i) {
				this[i].data.forEach(function (datum, n) {
					this[n] = datum[1];
					this[n].key = moment(this[n].key);
				}, this[i].data);
			}, this[index].series);
		}, objs);*/
    objs.forEach( obj => ( 
      obj.series.forEach( serum => (
        serum.data = serum.data.map( function([, datum]) { return datum; } )
        ) ) 
      ) );
		callback(objs);
	});
};

export function croppedDomain(mschart) {
  var domain = mschart.domain;
  if( moment(domain[1]).diff(moment(domain[0]), 'months') > 12) {
    domain[0] = d3.time.month.offset(domain[1], -12)
  }
  return domain;
}

export function addStylesheetRules (rules) {
  var styleEl = document.createElement('style'),
      styleSheet;

  // Apparently some version of Safari needs the following line? I dunno.
  styleEl.appendChild(document.createTextNode(''));

  // Append style element to head
  document.head.appendChild(styleEl);

  // Grab style sheet
  styleSheet = styleEl.sheet;

  for (var i = 0, rl = rules.length; i < rl; i++) {
    var j = 1, rule = rules[i], selector = rules[i][0], propStr = '';
    // If the second argument of a rule is an array of arrays, correct our variables.
    if (Object.prototype.toString.call(rule[1][0]) === '[object Array]') {
      rule = rule[1];
      j = 0;
    }

    for (var pl = rule.length; j < pl; j++) {
      var prop = rule[j];
      propStr += prop[0] + ':' + prop[1] + (prop[2] ? ' !important' : '') + ';\n';
    }

    // Insert CSS Rule
    styleSheet.insertRule(selector + '{' + propStr + '}', styleSheet.cssRules.length);
  }
};

//Taken from Underscore, licensed under the MIT license
//Copyright (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//Full MIT copyright notice can be found in the project root
export function debounce(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

/*
Taken from an upcoming version of d3
 */
export function d3textWrap(text, width, paddingRightLeft, paddingTopBottom) {
    paddingRightLeft = paddingRightLeft != null ? paddingRightLeft : 5; //Default padding (5px)
    paddingTopBottom = (paddingTopBottom != null ? paddingTopBottom : 5) - 2; //Default padding (5px), remove 2 pixels because of the borders
    var maxWidth = width; //I store the tooltip max width
    width = width - (paddingRightLeft * 2); //Take the padding into account

    var arrLineCreatedCount = [];
    text.each(function() {
        var text = d3.select(this),
            words = text.text().split(/[ \f\n\r\t\v]+/).reverse(), //Don't cut non-breaking space (\xA0), as well as the Unicode characters \u00A0 \u2028 \u2029)
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.2, //Ems
            x,
            y = parseFloat(text.attr("y")),
            dy = parseFloat(text.attr("dy")),
            createdLineCount = 1, //Total line created count
            textAlign = text.style('text-anchor') || 'start'; //'start' by default (start, middle, end, inherit)

        //Clean the data in case <text> does not define those values
        if (isNaN(dy)) dy = 0; //Default padding (0em) : the 'dy' attribute on the first <tspan> _must_ be identical to the 'dy' specified on the <text> element, or start at '0em' if undefined

        //Offset the text position based on the text-anchor
        var wrapTickLabels = d3.select(text.node().parentNode).classed('tick'); //Don't wrap the 'normal untranslated' <text> element and the translated <g class='tick'><text></text></g> elements the same way..
        if (wrapTickLabels) {
            switch (textAlign) {
                case 'start':
                    x = -width / 2;
                    break;
                case 'middle':
                    x = 0;
                    break;
                case 'end':
                    x = width / 2;
                    break;
                default :
            }
        }
        else { //untranslated <text> elements
            switch (textAlign) {
                case 'start':
                    x = paddingRightLeft;
                    break;
                case 'middle':
                    x = maxWidth / 2;
                    break;
                case 'end':
                    x = maxWidth - paddingRightLeft;
                    break;
                default :
            }
        }
        y = +((null === y)?paddingTopBottom:y);

        var tspan = text.text(null).append("tspan").attr("x", x)/*.attr("y", y)*/.attr("dy", dy + "em");
        //noinspection JSHint
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width && line.length > 1) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", x)/*.attr("y", y)*/.attr("dy", /*(++lineNumber * )*/ lineHeight + dy + "em").text(word);
                ++createdLineCount;
            }
        }

        arrLineCreatedCount.push(createdLineCount); //Store the line count in the array
    });
    return arrLineCreatedCount;
}