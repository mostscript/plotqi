// tinyOverlay.es6.js -- a minimal JavaScript (ES6) overlay library
// Author: Sean Upton <sean.upton@hsc.utah.edu>
// (c) 2013, 2015 University of Utah / MIT-licensed, text at:
//          https://teamspace.upiq.org/trac/wiki/Copyright

/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

import {uuid4} from './utils';

var document = window.document;

function toArray(v) {
  if (v instanceof Array) return v;
  if (v instanceof window.HTMLCollection || v instanceof window.NodeList) {
    return Array.prototype.slice.call(v, 0);
  }
  return [v];
}

function attr(target, name, value) {
  // multi-attr
  if (typeof name !== 'string') {
    Object.keys(name).forEach(k => attr(target, k, name[k]));
    return;
  }
  if (!value) return target.getAttribute(name);
  target.setAttribute(name, value);
}

function style(target, spec, value) {
  var name;
  if (!value && spec instanceof Object) {
    Object.keys(spec).forEach(k => style(target, k, spec[k]));
    return;
  }
  target.style.removeProperty(spec);
  if (value === undefined) return;
  target.style.setProperty(spec, value);
}

function create(tagname, classname, html) {
  var el, id;
  if (tagname.indexOf('.') !== -1) {
    [tagname, classname] = tagname.split('.');
  }
  if (tagname.indexOf('#') !== -1) {
    [tagname, id] = tagname.split('#');
  }
  el = document.createElement(tagname);
  attr(el, {
    id: id,
    'class': classname
  });
  if (html) {
    el.innerHTML = html;
  }
  return el;
}

function toDOM(html, wrapperTag, wrapperClass) {
  /** make DOM object(s) from HTML snippets */
  var wrapper = create((wrapperTag || 'div'), wrapperClass, html),
      children = wrapper.childNodes;
  if (children.length === 1) {
    return children[0];
  }
  return wrapper;  // fallback
}

var snippets = {
  CONTROL: String() +
    '<div class="olControl">' +
    '  <span class="olControlBtn">' +
    '   <a class="close" title="close">&times;</a>' +
    '  </span>' +
    '</div>'
};

export class Overlay {
  /** Overlay objects are rendered on construction, but only shown and
    * attached on open(), destroyed on close().
    */

  constructor(html, options, onclose) {
    var id = (options || {}).id || uuid4(),
        body = document.getElementsByTagName('body')[0],
        inner = create('div#' + id + '.overlayInner', null, html),
        userClass = (options || {}).classname,
        classname = 'tinyOverlay' + ((userClass) ? ' ' + userClass : ''),
        overlayDiv = create('div.' + classname),
        control = toDOM(snippets.CONTROL);
    // setup instance attrs:
    this.id = id;
    this.options = options;
    this.container = this.options.container || document.querySelector('body');
    // detached overlay div element; latern will be attached/shown:
    this.target = overlayDiv;
    this.options = options || {};
    this.options.style = this.options.style || { width: '120px' };
    // Set passed styles for overlay div:
    style(this.target, this.options.style);
    // append content to outermost overlay DIV:
    overlayDiv.appendChild(control);
    overlayDiv.appendChild(inner);
    // Array of onclose callbacks, if provided:
    onclose = (onclose === undefined) ? [] : onclose;
    this.onclose = (onclose instanceof Array) ? onclose : [onclose];
  }

  open() {
    var self = this,
        container = this.container,
        otherOverlays = toArray(container.querySelectorAll('div.tinyOverlay')),
        closeBtn = this.target.querySelector('span.olControlBtn a.close');
    // destroy any other overlays on page:
    otherOverlays.forEach(n => n.parentNode.removeChild(n));
    // append detached div to overlay:
    this.container.appendChild(this.target);
    // hookup action for close button:
    closeBtn.addEventListener('click', function (event) { self.close(); });
  }

  close() {
    this.target.parentNode.removeChild(this.target);
    this.onclose.forEach(callback => callback.call(this));
  }

}

