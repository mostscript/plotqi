/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

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
    window.clearTimeout(timeout);
    timeout = window.setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}
