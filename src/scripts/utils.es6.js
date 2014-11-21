/*jshint esnext:true, eqnull:true */
/*globals require */
var moment = require('moment');
export function getObjects(jsonFile, callback) {
	d3.json(jsonFile, function (jsonData) {
		var objs = [];

		if(jsonData.length)
			objs = jsonData.map( function ([, obj]) { return obj; } );
		else //if the JSON payload wasn't an array
			objs = [ jsonData ]; //then we were given a single object

    objs.forEach( function (obj) { 
      obj.series.forEach( function (serum) {
        serum.data = serum.data.map( function ([, datum]) { return datum; } )
        })
      });
		callback(objs);
	});
};

var styleEl = document.createElement('style');
document.head.appendChild(styleEl);
export var styleSheet = styleEl.sheet;

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
Taken from an upcoming version of d3, heavily altered to suit needs of UPIQ
 */
export function d3textWrap(text, width, paddingRightLeft, paddingTopBottom, dataFunc) {
    paddingRightLeft = paddingRightLeft != null ? paddingRightLeft : 5; //Default padding (5px)
    paddingTopBottom = (paddingTopBottom != null ? paddingTopBottom : 5) - 2; //Default padding (5px), remove 2 pixels because of the borders
    var maxWidth = width; //I store the tooltip max width
    width = width - (paddingRightLeft * 2); //Take the padding into account

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

        var tspan = text.text(null).append("tspan").attr("x", 0)/*.attr("y", y)*/.attr("dy", dy + "em");
        //noinspection JSHint
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width && line.length > 1) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", 0)/*.attr("y", y)*/.attr("dy", /*(++lineNumber * )*/ lineHeight + dy + "em").text(word);
                ++createdLineCount;
            }
        }

        arrLineCreatedCount.push(createdLineCount); //Store the line count in the array
    });
    return arrLineCreatedCount;
}