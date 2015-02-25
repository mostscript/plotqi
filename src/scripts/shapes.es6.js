/*jshint esnext:true, eqnull:true, undef:true */
/*globals require */

var d3 = require('d3');

export function shapePath(node, spec = shapes.square, size = 3) {
  var d = "";
  var normalizer = spec.normalizer || 1;
  var multiplier = size * normalizer;
  spec.path.forEach(function () {
    var [cmd, ...args] = arguments[0];
    d += cmd;
    args.forEach(function (arg, i) {
      if(i !== 0)
        d += ' ';
      if(arg.length)
        arg.forEach(function (sub_arg, sub_i) {
          if(arg)
          if(sub_i === 0){
                if(String(arg).indexOf('#') === -1)
              d += (multiplier * sub_arg);
            else
              d += sub_arg.slice(1);
          } else {
            if(String(arg).indexOf('#') === -1)
              d += "," + (multiplier * sub_arg);
            else
              d += "," + arg.slice(1);
          }
        });
      else {
        if(String(arg).indexOf('#') === -1)
          d += (multiplier * arg);
        else
          d += arg.slice(1);
      }
    });
  });
  node.attr('d', d)
      .classed('smooth-shape', spec.smooth ? true : false)
      .classed('crisp-shape', spec.smooth ? false : true);
}

export function legendMarkers (selection, size) {
  size = size || 4;
  selection.each(function (d, i) {
    var sel = d3.select(this);
    var shape_name = d.marker_style || 'square';
    if(shape_name === 'cross') shape_name = 'legend_cross';
    var shape = shapes[shape_name] || shapes.square;
    sel.call(shapePath, shape, size);
  });
}

export var shapes = {
  square: {
    normalizer: 1 /2,
    path: [
      ['m', -1, -1],
      ['h', 2],
      ['v', 2],
      ['h', -2],
      ['z']
    ]
  },
  diamond: {
    normalizer: 1 / 2,
    path: [
      ['m', -1, 0],
      ['l', 1, -1],
      ['l', 1, 1],
      ['l', -1, 1],
      ['z']
    ]
  },
  cross: {
    normalizer: 1 / 6,
    path: [
      ['m', -1, -1],
      ['v', -2],
      ['h', 2],
      ['v', 2],
      ['h', 2],
      ['v', 2],
      ['h', -2],
      ['v', 2],
      ['h', -2],
      ['v', -2],
      ['h', -2],
      ['v', -2],
      ['z']
    ]
  },
  legend_cross: {
    normalizer: 1 / 4,
    path: [
      ['m', -1, -1],
      ['v', -1],
      ['h', 2],
      ['v', 1],
      ['h', 1],
      ['v', 2],
      ['h', -1],
      ['v', 1],
      ['h', -2],
      ['v', -1],
      ['h', -1],
      ['v', -2],
      ['z']
    ]
  },
  circle: {
    normalizer: 1 / 2,
    path: [
      ['m', -1, 0],
      ['a', [1, 1], [0], ['#1',0], [2,0]],
      ['a', [1, 1], [0], ['#1',0], [-2,0]]
    ],
    smooth: true
  }
};

