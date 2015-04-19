/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

export class BaseRenderingPlugin {

  constructor(plotter) {
    this.plotter = plotter;
    this.data = plotter.data;
    this.plotDiv = plotter.plotDiv;
    this.plotCore = plotter.plotCore;
    this.margins = plotter.margins;
    // Note: plotter.svg, scales may be undefined on the plotter at the
    //        time of plugin construction; preRender() should re-bind always
    this.svg = plotter.svg;
    this.xScale = plotter.xScale;
    this.yScale = plotter.yScale;
  }

  preRender() {
    /** hook to be called after plotter.preRender, for things like plot
      * plot size or margin adjustment
      */
    this.svg = this.plotter.svg;
    this.xScale = this.plotter.xScale;
    this.yScale = this.plotter.yScale;
  }

  clear() {

  }

  render() {

  }

  update() {
    this.clear();
    this.render();
  }
}

// things to add as plugins: tabular legend, point labels, trendline, goal line
// then once all these things are adapters, the way to make this actually a plugin
// architecture is to make a list of plugins on the renderer... there ought to be
// a way to override by setting a global in an addressable namespace (such that
// registration of additional items in sequence is possible).
//
// Need to call these phase 2 plugins (or after draw?)
