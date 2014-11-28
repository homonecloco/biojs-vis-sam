var sam = require("biojs-vis-sam");
var bw = 5;
var flanking_cache = 50;

var instance = new sam.BAMViewer({
  target : "yourDiv",
  selectionBackgroundColor : '#99FF00',
  dataSet:"./data/minitest.txt", 
  base_width: bw,
  flanking_cache: flanking_cache ,
  default_region: "chr_1:1-404",
  height: "500px",
  //width:"1000px",         
  display_orientation: true, 
  display_bases: true
}); 
console.log(instance);
instance.load_default_region(); 
