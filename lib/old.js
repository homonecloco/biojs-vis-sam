 
 Biojs.BAMViewer = Biojs.extend (
  /** @lends Biojs.BAMViewer# */
  {
   

  




      ,

    add_selected_change_callback: function(component){
      this.visible_change_callbacks.push(component)
    },
    _selected_change: function(region){
      var arrayLength= this.visible_change_callbacks.length;
      for (var i = 0; i < arrayLength; i++) {
       this.visible_change_callbacks[i].setSelectedRegion(this.visible_region.toString());
      }

    },



   


    ,

      ,

      ,

  /**
  * Loads a region and stores it in the cache 
  */
  ,

,


_invalidate_rendered_divs: function(){
  for (var key in this.alignments){
    //console.log("[_invalidate_rendered_divs]" + key);
    var current = this.alignments[key];
    //console.log(current);
    for (var i in current) {
      //console.log(current[i].div);
      current[i].div = undefined;
    };
  }
},

_create_control_div: function(outer_div){
  var settings_div = document.createElement("div");

  settings_div.className = "bam_settings_button";
  settings_div.innerHTML ="S";
  var settings_id = this.opt.target + "_settings_window";
  settings_div.onclick = function(){
      $( "#"  + settings_id ).dialog( "open" );
  };
  this._container.append(settings_div); 
  var settings_alert = document.createElement("div");
  settings_alert.id = settings_id;
  settings_alert.title = "Settings";


/*<label for=\"" + this.slider_pos + "\">Position:</label>\
    <input type=\"text\" id=\"" + this.slider_pos + "\" class=\"bam_selector_text\">  \*/
  var form_html = '\
    <input type="checkbox" name="display_options" value="display_orientation"> Show orientation<br/>\
    <input type="checkbox" name="display_options" value="display_bases"> Show bases<br/>\
    <input type="checkbox" name="display_options" value="display_mates"> Show mates<br/>'
  settings_alert.innerHTML =  form_html;

  this._container.append(settings_alert);
  var self = this;
  var options = this.opt;
  $("#" + settings_id ).dialog({
      autoOpen: false,
      open: function( event, ui ) {
        var inputs = settings_alert.childNodes;
        console.log("Inputs: ");
        for (var i = 0; i < inputs.length; i++) {
          var el = inputs[i];
          if(el.type && el.type === 'checkbox'){
            if(self.opt[el.value]){
              el.checked = true;
            }else{
              el.checked = false;
            }
          }
          
        };
      },
      close: function( event, ui ) {
        var inputs = settings_alert.childNodes;
        console.log("Outputs: ");
        for (var i = 0; i < inputs.length; i++) {
          var el = inputs[i];
          if(el.type && el.type === 'checkbox'){
            self.opt[el.value] = el.checked;
            console.log(el);
          }
         

        };
        self._invalidate_rendered_divs();
        self.force = true;
        self.force_render();
      },
      show: {
        effect: "fadeIn",
        duration: 400

      },
      hide: {
        effect: "fadeOut",
        duration: 400
      }
    });

},

_create_render_div: function(){
  var outter_div = document.createElement("div");
  outter_div.style.width = this.opt.width;

  outter_div.style.position = "absolute";
  outter_div.style.overflowX = "hidden";
  outter_div.style.overflowY = "scroll";
  outter_div.style.height = this.opt.height;
  var new_div = document.createElement("div");
  new_div.classList.add("ui-widget-content");
  new_div.style.left = "0px";
  
  //jQuery(new_div).draggable({ axis: "x" });
  var start_pos = -1; 
  var self = this  ;
  
  this._make_div_draggable(new_div);

   new_div.left_offset = 0;
   this._render_div = new_div;    
   outter_div.appendChild(new_div);
   this._container.append(outter_div); 
},

_select_chromosome: function(full_region){
  this._container.empty();
  this.alignments = {};
  this.loaded_regions =  new Array();
  this.full_region = this.parse_region(full_region); //New object, to avoid modifying the current region unintentionally.
  this._create_render_div();
  this._create_control_div();   


var visible_bases = this.visible_bases();

this.visible_region = this.parse_region(full_region);
vr = this.visible_region
this.visible_region.end = parseInt(visible_bases);



//SETTING UP THE BOTTOM THING
var info_div = document.createElement("div");
//info_div.style.width - this.opt.base_width;
info_div.classList.add("bam_info_panel");
info_div.appendChild(info_div.ownerDocument.createTextNode("Visible: " +  this.visible_region.toString()));

outer_info = document.getElementById(this.opt.info_panel);
if(outer_info != null){
  outer_info.removeChild(outer_info.lastChild);
  outer_info.appendChild(info_div);  
}

}, 

visible_bases: function(){
  var computedStyle = getComputedStyle(this._render_div, null);
  var visible_bases = Math.round(parseInt(computedStyle.width) / this.opt.base_width);
  console.log("[visible_bases] how many?!" + visible_bases + "Base width: " + this.opt.base_width + " render_width: " + computedStyle.width) ;
  return visible_bases;
},

move_rendered_div: function(offset){
  old_left = parseInt(this._render_div.style.left);
  this._render_div.style.left = old_left - (offset * this.opt.base_width) + "px";
},

set_central_base: function(position){
  var pos = parseInt(position);
  var visible_bases = this.visible_bases();
  var half_bases = visible_bases / 2;
  if(pos > this.full_region.end - half_bases ){
      pos = this.full_region.end - half_bases;
  }
  if(pos <= half_bases ){
     pos = half_bases;
  }

  if(! this.full_region.valid_position(pos)){
    console.log("Invalid position");
    return;
  }

  
  var flank_size = Math.round(visible_bases/2);
  new_region = this.visible_region.clone();
  new_region.start = pos - flank_size;
  new_region.end = pos + flank_size;

  

  //TODO: improve info_div;
  //info_div.removeChild(info_div.lastChild);
  //info_div.appendChild(info_div.ownerDocument.createTextNode("Visible: " +  self.visible_region.toString()));

  if(!this.rendered_region.subset(new_region)){
    this.visible_region = new_region;
    this.load_region(this.visible_region);
 
  }else{
    var mid =this.visible_middle() ;
    console.log("Moving: " + mid + " to " + pos);
    var drag_offset_bases = pos-mid ;

    console.log("Bases to move: " + drag_offset_bases); 
    console.log(this.visible_region.toString());
    this.visible_region.move(drag_offset_bases);
    this.move_rendered_div(drag_offset_bases);
    console.log(this.visible_region.toString());

  }

  if(this.force){
    this.visible_region = new_region;
    this.force_render();

  }

},
force_render : function(){
  this.load_region(this.visible_region);
  this.force = false;
},




      setRegion: function(region){
        var reg = this.parse_region(region);

        if("undefined" ===  typeof this.current_region || reg.entry != this.current_region.entry){
         this._select_chromosome(region);
       }

       local_width=this._render_div.clientWidth;
       region_end = Math.ceil( local_width/this.opt.base_width);
       reg.end = reg.start + region_end;
       console.log(reg.start +  ":" + region_end);
       this._container.reg;
       this.current_region = reg;
       this.load_region(reg);
     }


   });



