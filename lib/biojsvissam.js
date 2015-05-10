var jQuery = require("jquery");
var jQueryUI = require("jquery-ui")
var Region = require("biojs-alg-seqregion")
var SamIO = require("biojs-io-sam")
var BAMViewer = function (options) {

	var self = this;

    //The defaults 
    this.opt = {
    	target: "YourOwnDivId",
    	fontFamily: '"Andale mono", courier, monospace',
    	fontColor: "white",
    	backgroundColor: "#7BBFE9",
    	selectionFontColor: "black",
    	selectionBackgroundColor: "yellow",
    	dataSet: "../../main/resources/data/BAMViwerDataSet.tsv", 
		// fontSize: "15px",
		width: "80%",
		height: "200px",
		float_bam: "right",
		new_pos: 10,
		default_read_background:"blue", 
		flanking_size: 300,
		display_bases: false,
		display_orientation: false, 
		display_cigar:false,
		display_mates: false, 
		lazy_loading: false
	};
	//console.log(this.opt);

	jQuery.extend(this.opt, options);

	//console.log(this.opt);
    // For practical use, create an object with the main DIV container 
    // to be used in all of the code of our component
    this._container = jQuery("#"+self.opt.target);

    // Apply options values
    this._container.css({
      'font-family': self.opt.fontFamily, // this is one example of the use of self instead of this

      'font-size': self.opt.base_width + "px",
      'text-align': 'center',
      'vertical-align':'top',
      'display': 'table-cell',
      'width': self.opt.width,
      'height': self.opt.height,
      'overflow': 'auto'    
  });

    // Set the content
    this._container.append('<div>Please select a region</div>');
    this.force = false;
    this._container.addClass( "bam_container");
    //Here starts the real SAM stuff. 
    this.dataSet = options.dataSet
    this.reference = options.reference;

    //An array with all the alignments. Each position represents a position in the chromosome. 
    this.alignments = {};

    //A reverse hash to contain the added sequences
    this.sequences = {};
    
    //list of functions to calback on selection change. 
    this.visible_change_callbacks = [];

    //Setting up the event according to BioJS 2
    this.on('onCentralBaseChanged', function(obj){
 		 this.set_central_base(obj.data);
	  });

    this.on('onBaseSizeChanged', function(obj){
     this.set_size(obj.data);
    });

    this.on('onRegionChanged', function(obj){
     this.setRegion(obj.data);
    });

};

BAMViewer.prototype.set_size = function(size) {

	if ( size != undefined ){
		this.opt.base_width = parseInt(size);
		this._invalidate_rendered_divs();
		this.force = true;

	}
};


BAMViewer.prototype.visible_middle = function(){
	var middle = (this.visible_region.start + this.visible_region.end ) / 2; 
	return middle;
};

BAMViewer.prototype.fill_canvas_aux = function(aln , arr, offset, index){

	var local_index = index ;
	if("undefined" === typeof arr[local_index] ){
		var region_rend = this.rendered_region;
		var size  = region_rend.end - region_rend.start;
		arr[local_index]= Array.apply(null, new Array(size)).map(Number.prototype.valueOf,0);
	}
	var start = aln.pos - offset;
	var end = start + aln.len;

	for(var i=start;i<end;i++){
		arr[local_index][i] ++;  
	}


};

BAMViewer.prototype.find_empty_start= function(aln, arr, offset){
	var start = aln.pos - offset;
	var arr_size = arr.length;
	var i = 0; 
     //var dups = aln.duplicates;

     var found = false
     var out = 0;
     for(; i < arr_size && !found; i++){
     	if(arr[i][start] == 0 ){
     		found = true;
     		out = i;
     		if(found){
     			return i;
     		}
     	}
     }
     return i;
 };

 BAMViewer.prototype.render_visible= function(){
 	this.enable_loading();
 	var region = this.visible_region.expand_flanking_region(this.opt.flanking_size);;
 	this.rendered_region = region;

 	var start = region.start - this.opt.flanking_cache;
 	var end = region.end + this.opt.flanking_cache ;
 	var size = end - start;
      //var rendered_positions = Array.apply(null, new Array(size)).map(Number.prototype.valueOf,0);
      var rendered_positions =  [];
      this._render_div.left_offset = this.visible_region.start;
      
   //   var canvas = this._render_div.cloneNode();
   canvas = this._render_div;
   canvas.innerHTML = "";
   canvas.style.left = "0px";

   var parent = this._render_div.parentNode;
   if(start < 0){
   	start = 1;
   }

      //alert(JSON.stringify(this.alignments));
      for(var i = start; i < end; i++){
      	if("undefined" !== typeof this.alignments[i]){
         // alert(JSON.stringify(this.alignments[i]) + " i:" + i);
         var current_alignments = this.alignments[i];
          //alert(JSON.stringify(current_alignments) + " i:" + i);
          for (var j in current_alignments) {
          	aln = current_alignments[j];
          	if("undefined" === typeof aln.div){
          		this.build_aln_div(aln);
          		//aln.build_div(canvas);
          	}
          	var base_offset = aln.pos - this._render_div.left_offset - 1;
          	var n_pos = ( base_offset) * this.opt.base_width; 
          	aln.div.style.left = n_pos + "px";
          	var l_off = i - start;
          	var start_index = this.find_empty_start(aln, rendered_positions, start);
          	var new_pos = start_index * (4+parseInt(this.opt.base_width) );
          	aln.div.style.top =  new_pos + "px"; 
          	this.fill_canvas_aux(aln, rendered_positions, start, start_index);
          	canvas.appendChild(aln.div);
          }
      }
  }
  this._make_div_draggable(canvas);
  this.disable_loading();

}



BAMViewer.prototype.enable_loading= function(){
	var target = this._container;
	//console.log(target);
	if("undefined" !== target){
		target.addClass("bam_loading");
	}

}; 

BAMViewer.prototype.disable_loading= function(){
	var target = this._container;
	if("undefined" !== target){
		target.removeClass("bam_loading");
	}

};

BAMViewer.prototype.build_aln_div = function(aln){
	var new_div = document.createElement("div");
	new_div.style.height = (parseInt( this.opt.base_width) + 3)  + "px";
	new_div.style.fontSize =  this.opt.base_width + "px";
	new_div.classList.add("bam_tag");
	new_div.style.position = "absolute";
	n_pos = ( this.aln- 1) * this.opt.base_width;
	new_div.style.left = n_pos + "px";

	new_div.id = this.opt.target + "_" + aln.fullId();

	this._display_orientation(new_div, aln);
	this._display_mates(new_div, aln);

        //TODO: make a function that displays or not depending a preference to display duplicates
        if(aln.isDuplicate()){
        	new_div.classList.add("bam_duplicate");
        }
        aln._parseCigar();

        if(this.opt.display_bases){
        	this._draw_seq(new_div, aln);
        }
        new_div.style.width = this.opt.base_width * aln.len + "px"; 
        aln.div = new_div;

        return new_div;
    };

    BAMViewer.prototype._display_orientation = function(new_div, aln){
    	if(this.opt.display_orientation){
    		if(aln.forward()){
    			new_div.classList.add("bam_forward");
    		}else{
    			new_div.classList.add("bam_reverse");
    		}
    	}
    }; 

    BAMViewer.prototype._display_mates = function(new_div, aln){
    	if(this.opt.display_mates){
    		if(aln.first_in_pair()){
    			new_div.classList.add("bam_first");
    		}
    		if(aln.second_in_pair()){
    			new_div.classList.add("bam_second");
    		}
    		if(aln.mate_unmapped){
    			new_div.classList.add("bam_mate_missing");
    		}
    	}
    };

    BAMViewer.prototype.add_alignments = function(alignments){
    	var als = this.alignments;
    	var seqs = this.sequences;
    	var added = 0;
    	var duplicates = 0;
    	var unaligned = 0;
    	for(var i = 0; i < alignments.length; i++){
    		var aln = alignments[i];
    		var add = true;
    		if("undefined" === typeof als[aln.pos]){
    			als[aln.pos] = {}; 
    		}
    		if("undefined" === typeof seqs[aln.pos]){
    			seqs[aln.pos] = {}; 
    		}
    		var current_alignments = als[aln.pos]; 	
    		if("undefined" !==  typeof als[aln.pos][aln.fullId()]){
    			add = false;
    		}
    		if(aln.queryUnmapped()){
    			add = false;
    			unaligned ++;
    		}


    		if(add){
    			var aln_pos_hash = als[aln.pos];   
    			added ++;
    			als[aln.pos][aln.fullId()] = aln;

    		}
    	}
    	
    };

    BAMViewer.prototype._draw_seq = function(new_div, aln){

    	var seq_len = aln.parsedSeq.length;
    	var next_insertion = -1;
    	var index_insertion = 0;
    	if(aln.insertions.size > 0){
    		next_insertion = aln.insertions[0];
    	}

    	for (var i = 0; i < seq_len; i++) {
    		display_base = aln.parsedSeq[i];
    		var current_base_span = document.createElement("div");
    		new_div.appendChild(current_base_span);
    		current_base_span.className = "bam_base_" + display_base;
    		current_base_span.classList.add = "bam_base";
    		current_base_span.style.width = this.opt.base_width + "px";
    		current_base_span.style.cssFloat = "left";
    		current_base_span.appendChild(current_base_span.ownerDocument.createTextNode(display_base));
    		last_div = current_base_span;
    		current_base_span.title = aln.pos + i;

    		if(next_insertion == i ){
    			last_div.classList.add("bam_base_I");
    			next_insertion = aln.insertions[index_insertion++];
    		}

    	}

    };

    BAMViewer.prototype.get_overlapping_region = function(region){
    	var out = null;
    	for (var i = this.loaded_regions.length - 1; i >= 0; i--) {
    		if(this.loaded_regions[i].overlaps(region)){
    			out = this.loaded_regions[i];
    			i = 0;
    		}
    	};
    	return out;
    };


    BAMViewer.prototype.add_overlapping_region= function(region){

    	for (var i = this.loaded_regions.length - 1; i >= 0; i--) {
    		if(this.loaded_regions[i].overlaps ){
    			this.loaded_regions[i] = this.loaded_regions[i].joinRegion(region);
    			return;
    		}
    	};

    	this.loaded_regions[this.loaded_regions.length] = region.clone(); 

    };

    BAMViewer.prototype.load_default_region = function(){
    	this._select_chromosome(this.opt.default_region);

    };

    BAMViewer.prototype.parse_sam = function(data){
    	return SamIO.parse(data);
    };

    BAMViewer.prototype.load_region = function(region_to_add){
    //alert(self.dataSet);
    var region = region_to_add.expand_flanking_region(this.opt.flanking_size);
    var added_reg = region;
    //alert(this.dataSet);
    var reference = this.reference;
    
    var overlapping_region = this.get_overlapping_region(region);
    if(overlapping_region != null){
    	overlapping_region = overlapping_region.getRegionComplement(region);
    	added_reg = overlapping_region;
    }

    if(added_reg == null){
    	this.render_visible();
      return; //Already loaded. 
  }
  var  reg = added_reg.toString();   

    //console.log("Loading: " + reg);
    var container = this;
    container.enable_loading();
  //http://localhost:4567/region?bam=testu&region=chr_1:1-400&ref=test_chr.fasta 
  jQuery.ajax({
  	type: "GET",
  	url: this.dataSet,
  	data: { region: reg } ,
  	dataType: "text",
  	container: this,
  	success: function (data) {
  		correct = true;
  		reads = this.container.parse_sam(data);
  		if(reads.length > 0){
  			this.container.add_overlapping_region(added_reg);
  			this.container.add_alignments(reads);
  		} else {
  			alert("Unknown format detected");
  		}
  		container.disable_loading();
  		this.container.render_visible();
  	},
  	error: function (qXHR, textStatus, errorThrown) {
  		console.log(" Error loading the  SAM File! \n" + textStatus + "\n" + errorThrown + "\n" + qXHR );
  		container.disable_loading();
  	}
  });
};

BAMViewer.prototype._make_div_draggable = function(new_div){
	var grid_w = this.opt.base_width;
	var self = this;
	jQuery(new_div).draggable({
		grid: [ 20, grid_w ] ,
		scroll: true, 
		axis: "x", 
		start: function() {
			start_pos = parseInt(new_div.style.left);
		},

		drag: function() {

		},

		stop: function() {
			var top_pos = parseInt(new_div.style.top);
			var bottom_pos = parseInt(new_div.style.top) + parseInt(new_div.style.height) ;
			var height = parseInt(new_div.style.height);
			var left_pos = parseInt(new_div.style.left);
			var drag_offset = start_pos - left_pos;
			var drag_offset_bases = drag_offset / self.opt.base_width;


			if(bottom_pos <= 50){
				new_div.style.top =  (50 - height ) + "px";
			}
			if(top_pos > 0){
				new_div.style.top =  "0px";
			}

			self.visible_region.move(drag_offset_bases);

      //TODO: improve info_div;
      //info_div.removeChild(info_div.lastChild);
      //info_div.appendChild(info_div.ownerDocument.createTextNode("Visible: " +  self.visible_region.toString()));

      if(!self.rendered_region.subset(self.visible_region) ){
      	self.load_region(self.visible_region);
      }
      

      self._selected_change();
  }

});
new_div.bam_container = this;
};

BAMViewer.prototype.add_selected_change_callback= function(component){
      this.visible_change_callbacks.push(component)
    };
BAMViewer.prototype._selected_change= function(region){
    var arrayLength= this.visible_change_callbacks.length;
    for (var i = 0; i < arrayLength; i++) {

        this.visible_change_callbacks[i].setSelectedRegion(this.visible_region.toString());
    }
};

BAMViewer.prototype._invalidate_rendered_divs= function(){
	for (var key in this.alignments){
    //console.log("[_invalidate_rendered_divs]" + key);
    var current = this.alignments[key];
    //console.log(current);
    for (var i in current) {
      //console.log(current[i].div);
      current[i].div = undefined;
  };
}
};

BAMViewer.prototype._create_control_div= function(outer_div){
	var settings_div = document.createElement("div");

	settings_div.className = "bam_settings_button";
	settings_div.innerHTML ="S";
	var settings_id = this.opt.target + "_settings_window";
	settings_div.onclick = function(){
		jQuery( "#"  + settings_id ).dialog( "open" );
	};
	this._container.append(settings_div); 
	var settings_alert = document.createElement("div");
	settings_alert.id = settings_id;
	settings_alert.title = "Settings";
	var form_html = '\
	<input type="checkbox" name="display_options" value="display_orientation"> Show orientation<br/>\
	<input type="checkbox" name="display_options" value="display_bases"> Show bases<br/>\
	<input type="checkbox" name="display_options" value="display_mates"> Show mates<br/>'
	settings_alert.innerHTML =  form_html;

	this._container.append(settings_alert);
	var self = this;
	var options = this.opt;
	jQuery("#" + settings_id ).dialog({
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

};

BAMViewer.prototype._create_render_div= function(){
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
};

BAMViewer.prototype.parse_region = function(region) {
	return Region.parse_seq_region(region);
};

BAMViewer.prototype._select_chromosome= function(full_region){
	this._container.empty();
	this.alignments = {};
	this.loaded_regions =  new Array();
  	this.full_region = this.parse_region(full_region); //New object, to avoid modifying the current region unintentionally.
  	this._create_render_div();
  	this._create_control_div();   


  	var visible_bases = this.visible_bases();

  	this.visible_region = this.parse_region(full_region);
  	vr = this.visible_region;
  	this.visible_region.end = parseInt(visible_bases);
  	//this.render_visible();
  	this.load_region(this.visible_region);


//SETTING UP THE BOTTOM THING
/*var info_div = document.createElement("div");
//info_div.style.width - this.opt.base_width;
info_div.classList.add("bam_info_panel");
info_div.appendChild(info_div.ownerDocument.createTextNode("Visible: " +  this.visible_region.toString()));

outer_info = document.getElementById(this.opt.info_panel);
if(outer_info != null){
	outer_info.removeChild(outer_info.lastChild);
	outer_info.appendChild(info_div);  
}*/

};

BAMViewer.prototype.visible_bases= function(){
	var computedStyle = getComputedStyle(this._render_div, null);
	var visible_bases = Math.round(parseInt(computedStyle.width) / this.opt.base_width);
	//console.log("[visible_bases] how many?!" + visible_bases + "Base width: " + this.opt.base_width + " render_width: " + computedStyle.width) ;
	return visible_bases;
};

BAMViewer.prototype.move_rendered_div= function(offset){
	old_left = parseInt(this._render_div.style.left);
	this._render_div.style.left = old_left - (offset * this.opt.base_width) + "px";
};

BAMViewer.prototype.set_central_base= function(position){
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
		console.log("Invalid position(" + pos + ") for region:" + this.full_region.toString());
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
  	var drag_offset_bases = pos-mid ;

  	this.visible_region.move(drag_offset_bases);
  	this.move_rendered_div(drag_offset_bases);
  	
  }

  if(this.force){
  	this.visible_region = new_region;
  	this.force_render();

  }

};

BAMViewer.prototype.force_render = function(){
	this.load_region(this.visible_region);
	this.force = false;
};

BAMViewer.prototype.setRegion= function(region){
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
};

require('biojs-events').mixin(BAMViewer.prototype);
module.exports.BAMViewer = BAMViewer;

//From here, maybe a new file could be used. 
var BAMRegionList = function (options) {
	var self = this;
	this.opt = {
		target: "YourOwnDivId",
		fontFamily: '"Andale mono", courier, monospace',
		fontColor: "black",
		backgroundColor: "white",
		selectionFontColor: "blak",
		selectionBackgroundColor: "gray"
	}
	jQuery.extend(this.opt, options);

	  // For practical use, create an object with the main DIV container 
	  // to be used in all of the code of our component
	  this._container = jQuery("#"+self.opt.target);
	  // Apply options values
	  this._container.css({
		  'font-family': self.opt.fontFamily, // this is one example of the use of self instead of this
		  'background-color': self.opt.backgroundColor,
		  'color': self.opt.fontColor	 , 
		  'overflow-y':'scroll'
		});


	  //list of functions to calback on selection change. 
	  this.callbacks = [];

	  // Set the content

	  this._container.empty()
	  this._container.append('<span>Loading...</span>');
	  this._container.BAMRegionList = self;
	  this.load_list();

	  
	};
	BAMRegionList.prototype.parse_list = function (data){
  	//TODO: parse the lines and make sure they are actual regions. 
  	return   data.split("\n"); 
  };
  

  BAMRegionList.prototype.add_region_callback = function(component){
  	this.callbacks.push(component)
  };

  BAMRegionList.prototype._region_click= function(region){
  	arrayLength= this.callbacks.length;
  	for (var i = 0; i < arrayLength; i++) {
  	 	//this.callbacks[i].setRegion(region);
        this.callbacks[i].trigger('onRegionChanged', {
        data : region
      });
  	}

  };

  BAMRegionList.prototype.load_list= function(){
  	url=this.opt.dataSet;
  	reference = this.opt.reference;
  	jQuery.ajax({
  		type: "GET",
  		url: url,
  		data: { bam: this.bam , ref: this.reference } ,
  		dataType: "text",
  		container: this,
  		success: function (data) {
  			correct = true
  			regions = this.container.parse_list(data);
  			if(regions){
  				cont = jQuery("#"+this.container.opt.target);
  				cont.empty();


  				var arrayLength = regions.length;
  				for (var i = 0; i < arrayLength; i++) {
  					var element = document.createElement("div");
  					element.region = regions[i] 
  					var newContent = document.createTextNode(regions[i]); 
  					element.id = this.container.opt.target + "_div_" + regions[i];
  					element.bam_list = this.container
  					element.appendChild(newContent);
  					element.onclick = function(evnt){
  						target=evnt.currentTarget;
  						list_node=target.parentNode;
  						local_container = target.bam_list
  						if ('undefined' !== typeof list_node.selected_node) {
  							list_node.selected_node.style.backgroundColor=local_container.opt.backgroundColor;
  						}
  						list_node.selected_node=target;
  						local_container._region_click(target.region);
  						target.style.backgroundColor = local_container.opt.selectionBackgroundColor;
  					};

  					cont.append(element);
  				}
  			} else {
  				alert("Unknown format detected")
  			}

  		},
  		error : function (qXHR, textStatus, errorThrown) {
  			alert(textStatus);
  		}
  	});
};
require('biojs-events').mixin(BAMRegionList.prototype);
module.exports.BAMRegionList = BAMRegionList;

//BAMRegionSelector (Scroll, zoom)

var BAMRegionSelector = function (options){
	var self = this;

	this.opt = {
		target: "YourOwnDivId",
		fontFamily: '"Andale mono", courier, monospace',
		fontColor: "black",
		backgroundColor: "white",
		selectionFontColor: "blak",
		selectionBackgroundColor: "gray",
		width: "80%",
		height: "100px",
		initial_zoom: 15
	}

	jQuery.extend(this.opt, options);

	target=this.opt.target;
	
	  // For practical use, create an object with the main DIV container 
	  // to be used in all of the code of our component
	  tgt="#"+this.opt.target
	  this._container = jQuery(tgt);
	  
	  // Apply options values
	  this._container.css({
		  'font-family': self.opt.fontFamily, // this is one example of the use of self instead of this
		  'background-color': self.opt.backgroundColor,
		  'color': self.opt.fontColor	  
		});


	  //list of functions to calback on selection change. 
	  this.callbacks = [];
	  this.center_callbacks = [];
	  // Set the content

	  this._container.empty()

	  this._container.append('<span>Loading...</span>');
	  this._container.BAMRegionSelector = this;
	  this._render_scroll();

	};

BAMRegionSelector.prototype.parse_list = function (data){
  	//TODO: parse the lines and make sure they are actual regions. 
  	return   data.split("\n"); 
  };

  BAMRegionSelector.prototype.add_region_callback= function(component){
  	this.callbacks.push(component)
  },

  BAMRegionSelector.prototype._region_click= function(region){
  	arrayLength= this.callbacks.length;
  	for (var i = 0; i < arrayLength; i++) {
  		//this.callbacks[i].setRegion(region);
      this.callbacks[i].trigger('onRegionChanged', {
        data : region
      });
  	}
  };

  BAMRegionSelector.prototype.setRegion= function(region){
  	var reg = Region.parse_seq_region(region);
    //var slider_div  = jQuery("#"+this.slider_id);
    //console.log(JSON.stringify(reg));
    this.slider_div.slider( "option", "min", reg.start);
    this.slider_div.slider( "option", "max", reg.end);
    this.slider_div.slider( "option", "value", reg.start);
};

BAMRegionSelector.prototype.parse_seq_region = function (reg){
  ent=reg.split(":");
  indeces=ent[1].split("-")
  var reg = new Region.SeqRegion(ent[0], indeces[0], indeces[1]);
  return reg;
 };

BAMRegionSelector.prototype.setSelectedRegion= function(region){
	var reg = Region.parse_seq_region(region);
	var middle = reg.middle();
	var old_middle = this.position_value.val();

	console.log("Selecting region middles form: " + middle + " to " + old_middle);
	this.position_value.val(middle);
	this.slider_div.slider("value", middle);
	if(middle != old_middle){
		this.center();  
	}

};

BAMRegionSelector.prototype.center= function(){
	var val = this.position_value.val();
	self.trigger('onCentralBaseChanged', {
	 data : val
	});


	for (var i = this.center_callbacks.length - 1; i >= 0; i--) {
		//this.center_callbacks[i].set_central_base(val);
		this.center_callbacks[i].trigger('onCentralBaseChanged', {
	 		data : val
		});
	}
};

BAMRegionSelector.prototype.set_size= function(){
	var val = this.position_value_zoom.val();
	for (var i = this.center_callbacks.length - 1; i >= 0; i--) {
		//this.center_callbacks[i].set_size(val);
    this.center_callbacks[i].trigger('onBaseSizeChanged', {
      data : val
    });
	}
	this.center();
};

BAMRegionSelector.prototype.add_center_callback= function(component){
	this.center_callbacks.push(component);

};

BAMRegionSelector.prototype._render_scroll= function(){
	this.slider_id =  this.opt.target + "_slider";
	this.slider_pos = this.opt.target + "_position";
	this.slider_id_zoom =  this.opt.target + "_slider_zoom";
	this.slider_pos_zoom = this.opt.target + "_position_zoom";
	self = this;
	var blank_html = "\
	<div style=\"width:"+this.opt.width + "\">\
	<div style=\"width:70%\">\
	<label for=\"" + this.slider_pos + "\">Position:</label>\
	<input type=\"text\" id=\"" + this.slider_pos + "\" class=\"bam_selector_text\">  \
	<div id=\"" + this.slider_id + "\" style=width:100%;height:20px\"></div>\
	<div style=\"width:30%\">\
	<label for=\"" + this.slider_pos_zoom + "\">Size:</label>\
	<input type=\"text\" id=\"" + this.slider_pos_zoom + "\" class=\"bam_selector_text\">  \
	<div id=\"" + this.slider_id_zoom + "\" style=width:100%;height:20px\"></div>\
	</div> ";
	this._container.html(blank_html)  ;
	var sp =  this.slider_pos;

//Region scroll
this.slider_div  = jQuery("#"+this.slider_id)

this.slider_div.slider({
	orientation: "horizontal",
	min: 0,
	max: 100,
	value: 60,
	slide: function( event, ui ) {
		pos_div = jQuery( "#" + sp);
		pos_div.val( ui.value );
	}, 
	stop: function(event, ui){
		self.center();
	}
});
this.position_value = jQuery( "#" + this.slider_pos );
this.position_value.val( jQuery( "#" + this.slider_id ).slider( "value" ) );
this.position_value.change(function() {
	self.slider_div.slider( "value", this.value);
	self.center();
});
this.position_value.keypress(function( event ) {
	if(event.keycode == "13"){
		self.slider_div.slider( "value", this.value);
		self.center();
	}
});

    //Zoom scroll

    this.slider_div_zoom  = jQuery("#"+this.slider_id_zoom )
    var spz = this.slider_pos_zoom;
    var initial_size = this.opt.initial_zoom;
    this.slider_div_zoom.slider({
    	orientation: "horizontal",
    	min: 1,
    	max: 25,
    	value: initial_size,
    	slide: function( event, ui ) {
    		pos_div = jQuery( "#" + spz);
    		pos_div.val( ui.value );
    	}, 
    	stop: function(event, ui){
    		self.set_size();
    	}
    });
    this.position_value_zoom = jQuery( "#" + this.slider_pos_zoom );
    this.position_value_zoom.val( jQuery( "#" + this.slider_id_zoom ).slider( "value" ) );
    this.position_value_zoom.change(function() {
    	self.slider_div_zoom.slider( "value", this.value);
    	self.center();
    });
    this.position_value_zoom.keypress(function( event ) {
    	if(event.keycode == "13"){
    		self.slider_div_zoom.slider( "value", this.value);
    		self.set_size();
    	}
    });
};
require('biojs-events').mixin(BAMRegionSelector.prototype);
module.exports.BAMRegionSelector = BAMRegionSelector;

