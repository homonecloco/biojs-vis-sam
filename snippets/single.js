
//var biojsvissam = require("biojs-vis-sam");
var bw = 10;
var flanking_cache = 50;

var instance = new  biojsvissam.BAMViewer({
  target : "bam_viewer_1",
  selectionBackgroundColor : '#99FF00',
  dataSet:"./data/minitest.sam", 
  base_width: bw,
  flanking_cache: flanking_cache ,
  default_region: "chr_1:1-404",
  height: "500px",
  //width:"1000px",         
  display_orientation: true
}); 
console.log(instance);
instance.load_default_region(); 

var region_selector = new biojsvissam.BAMRegionSelector({
  target :"selected_region", 
 });

//Add listeners.
region_selector.add_center_callback(instance);
region_selector.setRegion("gnl|UG|Ta#S58863387:1-404");
instance.add_selected_change_callback(region_selector);
region_selector.add_center_callback(instance);
