/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

export class BaseRenderingPlugin {

  constructor(plotter) {
    this.plotter = plotter;
    this.data = plotter.data;
    this.plotDiv = plotter.plotDiv;
    this.plotCore = plotter.plotCore;
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
    this.plotCore = this.plotter.plotCore;
    this.svg = this.plotter.svg;
    this.plotGroup = this.plotter.plotGroup;
    this.abovePlotGroup = this.plotter.abovePlotGroup;
    this.xScale = this.plotter.xScale;
    this.yScale = this.plotter.yScale;
    this.margins = this.plotter.margins;
  }

  clear() {
  }

  prepare() {
    /** optionally called by render() of a plugin, for late-initialized
      * stuff that needs to be done before core rendering, but after the
      * core NVD3 chart is rendered (things that cannot be done in preRender).
      */
  }

  render() {
    this.prepare();
  }

  loadInteractiveFeatures() {
    /** to be called only when relevant, called after rendering is complete;
      * plugins must unwind any event handling in their clear() method if
      * they create interactive features.  This will not be called when 
      * core plotter is not in an interactive mode.
      */
  }

  postRender() {
    /** post-render hook for after-rendering adjustments */
  }

  update() {
    this.clear();
    this.render();
  }
}

