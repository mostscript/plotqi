/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

import {BaseRenderingPlugin} from './plugin';
var d3 = require('d3');

export class CompactLayoutPlugin extends BaseRenderingPlugin {

  constructor(plotter) {
    super(plotter);
    this.colCount = this.plotter.options.columns || 4;
    this.container = d3.select(this.plotter.plotDiv[0][0].parentNode);
  }

  isEnabled() {
    return (this.plotter.options.layout === 'compact');
  }

  sizeColumns() {
    var padding_mult = 0.89,
        pct = Math.floor((100 / this.colCount) * padding_mult),
        spec = '' + pct + '%',
        clientWidth;
    this.plotDiv.style({
      width: spec,
      float: 'left'
    });
    clientWidth = this.plotDiv[0][0].getBoundingClientRect().width;
    this.plotter.plotWidth = clientWidth;
    this.plotter.plotHeight = Math.floor(clientWidth * 0.85);
    this.chart.width(this.plotter.plotWidth);    // width before margins
    this.chart.height(this.plotter.plotHeight);  // height before margins
    this.plotter.baseFontSize = Math.max(11, Math.floor(clientWidth/45 * 2) / 2.0);
    this.plotter.plotCore.style({
      'font-size': '' + this.plotter.baseFontSize + 'px',
      height: '' + this.plotter.plotHeight + 'px'
    });
  }

  markerSize(d) {
    return (d.size || 8) * Math.pow(this.plotter.plotWidth / 220, 2);
  }

  layoutAdjustments() {
    // toggle small plot:
    this.plotter.options.small = true;
    this.plotter.relativeWidth = true;
    this.plotter.options.tiny = true;
  }

  expandAll() {
    window.plotqi.plotters.forEach(function (plotter) {
      plotter.options.layout = 'normal';
      plotter.options.interactive = true;
      plotter.refresh();
    });
  }

  contractAll() {
    // first, mark state on all plotters as incomplete (needed for onComplete)
    window.plotqi.plotters.forEach(function (plotter) {
      plotter.complete = false;
    });
    // then re-render:
    window.plotqi.plotters.forEach(function (plotter) {
      plotter.options.layout = 'compact';
      plotter.refresh();
    });
  }

  hookupToggle() {
    var control = d3.select('.upiq-report-control'),
        hasControl = (!!control.size()),
        hookedUp = hasControl && window.plotqi.compactControlReady,
        alreadyCompact = this.enabled,
        labelStandard = 'Standard',
        labelCompact = 'Compact',
        linkText = (alreadyCompact) ? labelStandard : labelCompact,
        otherText = (!alreadyCompact) ? labelStandard : labelCompact,
        href = (alreadyCompact) ? '#standard' : '#compact',
        toggleState = alreadyCompact,
        self = this,
        link;
    if (hasControl && !hookedUp) {
      control
        .html('')
        .append('span')
          .classed('control-subtle', true)
          .text('Layout: ');
      control
        .append('span')
          .classed('control-current-layout', true)
          .text(otherText);
      control.append('span').classed('divider', true).text(' | '); 
      link = control
        .append('a')
        .classed('upiq-compact-toggle', true)
        .attr({
          href: href
        })
        .text(linkText);
      link.on('click', function (d, i) {
        var newState = !toggleState,
            href = (newState) ? '#compact' : '#standard',
            linkText = (newState) ? labelStandard : labelCompact,
            otherText = (toggleState) ? labelStandard : labelCompact,
            action = (newState) ? self.contractAll : self.expandAll;
        link
          .attr({
            href: href
          })
          .text(linkText);
        control.select('span.control-current-layout').text(otherText);
        toggleState = newState;  // flip
        action();
      });
      // finally set state to avoid duplication:
      window.plotqi.compactControlReady = true; 
    }
  }

  preRender() {
    super.preRender();
    this.enabled = this.isEnabled();
    this.hookupToggle();  // hookup regardless of initial state, if div
    if (this.enabled) {
      this.chart = this.plotter.chart;
      // ensure container marked as compact:
      this.container.classed('compact', true);
      // Disable interactive features:
      this.originally_interactive = this.plotter.options.interactive || false;
      this.plotter.options.interactive = false;
      // get column css spec from count:
      this.sizeColumns();
      // other various layout adjustments:
      this.layoutAdjustments();
      // use slightly larger point markers on line than usual vs. width
      if (this.data.chart_type === 'line') {
        this.plotter.chart.pointSize(this.markerSize.bind(this));
      }
    } else {
      this.container.classed('compact', false);
    }
  }

  plotClicked() {
    var url = this.plotter.data.url || null;
    if (url) {
      // just open plot url in a new window
      window.open(url, '_blank');
    }
  }

  postRender() {
    var self = this;
    if (this.enabled && this.originally_interactive) {
      this.svg.on('click', function (d, i) {
        self.plotClicked();
      });
    }
  }

  rowPlotters(plotter) {
    var plotters = window.plotqi.plotters,
        plotIdx = plotters.indexOf(plotter),
        colCount = this.colCount,
        plotRow = Math.floor(plotIdx / colCount);
    return plotters.filter(function (p) {
      var idx = plotters.indexOf(p),
          sameRow = Math.floor(idx/colCount) === plotRow;
      return sameRow;
    });
  }

  rowHeight(plotter) {
    var rowPlotters = this.rowPlotters(plotter);
    return Math.ceil(
      Math.max.apply(null, rowPlotters.map(p => p.plotHeight))
    );
  }

  adjustHeight(plotter) {
    var title = plotter.plotDiv.select('.plot-title'),
        titleHeight = title[0][0].getBoundingClientRect().height,
        titleDifferential = (this.tallestTitle - titleHeight),
        topLine = this.topLine;
    plotter.plotCore.style({
      'margin-top': `${Math.ceil(titleDifferential)}px`
    });
    plotter.plotHeight = this.rowHeight(plotter); //this.maxHeight;
    plotter.plotCore.style({
      height: '' + plotter.plotHeight + 'px'
    });
    plotter.svg.select('.upiq-plot').attr({
      transform: `translate(0 ${topLine})`
    });
  }

  swapLegends(plotter) {
    var plotHeight = plotter.plotGroup[0][0].getBoundingClientRect().height;
    plotter.abovePlotGroup.attr({
      transform: `translate(0 ${plotHeight})`
    });
    plotter.plotGroup.attr({
      transform: `translate(0 0)`
    });
  }

  allDone() {
    var colCount = this.colCount,
        container = this.container,
        firstOfRow = this.container.selectAll('.plotdiv').filter(
          (d, i) => (i % colCount === 0 && i !== 0) ? this : null
        ),
        plotters = window.plotqi.plotters,
        maxHeight = Math.ceil(
          Math.max.apply(null, plotters.map(p => p.plotHeight))
        );
    // Insert line-break div between "rows"
    firstOfRow.each(function (d, i) {
      container.insert('div', d => this).classed('rowbreak', true);
    });
    // Adjust uniform height, and set main plot group to uniform position
    this.maxHeight = maxHeight;
    this.tallestTitle = Math.max.apply(null, plotters.map(function (plotter) {
      var title = plotter.plotDiv.select('.plot-title');
      return title[0][0].getBoundingClientRect().height;
    }));
    this.topLine = Math.max.apply(null, plotters.map(function (plotter) {
      return plotter.abovePlotGroup[0][0].getBoundingClientRect().height;
    }));
    plotters.forEach(this.adjustHeight, this);
    plotters.forEach(this.swapLegends, this);
  }

  isDone() {
    var plotters = window.plotqi.plotters,
        expected = window.plotqi.plotCount,
        completed = plotters.filter(p => p.complete);
    return completed.length === expected;
  }

  onComplete() {
    if (this.enabled) {
      if (this.isDone()) {
        this.allDone();
      }
    }
  }

  update() {
    if (this.enabled) {
      this.clear();
      this.render();
    }
  }
}

