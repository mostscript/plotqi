/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

var d3 = require('d3');
var moment = require('moment');

import {ColorTool, uuid4} from './utils';
import {BaseRenderingPlugin} from './plugin';


// classname and selector globals:
var LINESWRAP_CLASSNAME = 'nv-linesWrap',
    BARWRAP_CLASSNAME = 'nv-barsWrap';


export class GoalLineRenderer extends BaseRenderingPlugin {

  constructor(plotter) {
    super(plotter);
    this.group = null;
  }

  preRender() {
    super.preRender();
  }

  mkGroup() {
    var baseGroup = this.svg.select(this.plotter.nvType + ' > g'), 
        group = baseGroup.select('g.nvd3.nv-distribution'),
        type = this.data.chart_type || 'line',
        isLine = (type === 'line'),
        wrapType = (isLine) ? LINESWRAP_CLASSNAME : BARWRAP_CLASSNAME;
    if (group.empty()) {
      group = baseGroup.insert('g', '.' + wrapType)
        .classed('nvd3 nv-distribution', true);
    }
    this.group = group;
  }

  render() {
    var goalValue = this.data.goal,
        hasGoal = !!goalValue,
        goalColor = this.data.goal_color || '#ff0000',
        xMax = this.xScale(this.plotter.domain[1].valueOf()),
        yPos = Math.floor(this.yScale(goalValue)),        
        goal,
        line,
        text;
    if (!hasGoal) return;
    this.mkGroup();
    // JOIN goal group (contains line, text) selection to singular null-data
    goal = this.group.selectAll('g.nv-dist.nv-goal').data([null]);
    // enter JOIN, set group to use goal color, add line, config coords:
    line = goal.enter()
      .append('g')
        .attr('class', 'nv-dist nv-goal')
        .style('color', goalColor)
        .append('line')
          .classed('nv-goal-line', true)
          .attr({
            x1: 0,
            y1: yPos,
            x2: xMax,
            y2: yPos
          });
    // add text with explicit coordinates
    text = goal
      .append('text')
        .classed('nv-goal-lbl', true)
        .text(`Goal: ${goalValue}`)
        .attr({
          'text-anchor': 'start',
          'fill-opacity': 0,      // can be overridden in CSS
          'x': 3,
          'y': yPos - 3
        });
  }

  clear() {
    if (this.group) {
      this.group.remove();
    }
  }

}

