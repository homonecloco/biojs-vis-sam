var sam = require("biojs-vis-sam");
var bw = 5;
var flanking_cache = 50;

var instance = new sam.BAMViewer({
  target : "bam_viewer_1",
  selectionBackgroundColor : '#99FF00',
  dataSet:"./data/minitest.txt", 
  base_width: bw,
  flanking_cache: flanking_cache ,
  default_region: "chr_1:1-404",
  height: "200px",
  width:"800px",         
  display_orientation: true,
  display_bases: true
}); 
console.log(instance);
instance.load_default_region(); 

var region_selector = new sam.BAMRegionSelector({
  target :"selected_region", 
 });

//Add listeners.
region_selector.add_center_callback(instance);
region_selector.setRegion("gnl|UG|Ta#S58863387:1-404");
instance.add_selected_change_callback(region_selector);
region_selector.add_center_callback(instance);
