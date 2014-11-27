// browser globals
if (typeof biojs === 'undefined') {
  biojs = {};
}
if (typeof biojs.vis === 'undefined') {
  biojs.vis = {};
}
// use two namespaces
window.sam = biojs.vis.sam = module.exports = require('./index');

// TODO: how should this be bundled

if (typeof biojs.io === 'undefined') {
  biojs.io = {};
}

// just bundle the two parsers
window.biojs.io.sam = require("biojs-io-sam");
//window.biojs.io.clustal = require("biojs-io-clustal");
//window.biojs.xhr = require("nets");

module.exports = require("./index");

//#require('./css/BAMViewer.css');
//require('./css/jquery-ui-1.10.4.custom.min.css');
//require('./css/jquery.tooltip.css');