require=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

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
    		if(aln.firstInPair()){
    			new_div.classList.add("bam_first");
    		}
    		if(aln.secondInPair()){
    			new_div.classList.add("bam_second");
    		}
    		if(aln.mateUnmapped){
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
  var obj = jQuery(new_div);
	//console.log(obj);
  obj.draggable({
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
			//console.log("Inputs: ");
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

			for (var i = 0; i < inputs.length; i++) {
				var el = inputs[i];
				if(el.type && el.type === 'checkbox'){
					self.opt[el.value] = el.checked;
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

	//console.log("Selecting region middles form: " + middle + " to " + old_middle);
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


},{"biojs-alg-seqregion":4,"biojs-events":6,"biojs-io-sam":8}],2:[function(require,module,exports){
/**
 * Standalone extraction of Backbone.Events, no external dependency required.
 * Degrades nicely when Backone/underscore are already available in the current
 * global context.
 *
 * Note that docs suggest to use underscore's `_.extend()` method to add Events
 * support to some given object. A `mixin()` method has been added to the Events
 * prototype to avoid using underscore for that sole purpose:
 *
 *     var myEventEmitter = BackboneEvents.mixin({});
 *
 * Or for a function constructor:
 *
 *     function MyConstructor(){}
 *     MyConstructor.prototype.foo = function(){}
 *     BackboneEvents.mixin(MyConstructor.prototype);
 *
 * (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
 * (c) 2013 Nicolas Perriault
 */
/* global exports:true, define, module */
(function() {
  var root = this,
      nativeForEach = Array.prototype.forEach,
      hasOwnProperty = Object.prototype.hasOwnProperty,
      slice = Array.prototype.slice,
      idCounter = 0;

  // Returns a partial implementation matching the minimal API subset required
  // by Backbone.Events
  function miniscore() {
    return {
      keys: Object.keys || function (obj) {
        if (typeof obj !== "object" && typeof obj !== "function" || obj === null) {
          throw new TypeError("keys() called on a non-object");
        }
        var key, keys = [];
        for (key in obj) {
          if (obj.hasOwnProperty(key)) {
            keys[keys.length] = key;
          }
        }
        return keys;
      },

      uniqueId: function(prefix) {
        var id = ++idCounter + '';
        return prefix ? prefix + id : id;
      },

      has: function(obj, key) {
        return hasOwnProperty.call(obj, key);
      },

      each: function(obj, iterator, context) {
        if (obj == null) return;
        if (nativeForEach && obj.forEach === nativeForEach) {
          obj.forEach(iterator, context);
        } else if (obj.length === +obj.length) {
          for (var i = 0, l = obj.length; i < l; i++) {
            iterator.call(context, obj[i], i, obj);
          }
        } else {
          for (var key in obj) {
            if (this.has(obj, key)) {
              iterator.call(context, obj[key], key, obj);
            }
          }
        }
      },

      once: function(func) {
        var ran = false, memo;
        return function() {
          if (ran) return memo;
          ran = true;
          memo = func.apply(this, arguments);
          func = null;
          return memo;
        };
      }
    };
  }

  var _ = miniscore(), Events;

  // Backbone.Events
  // ---------------

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  Events = {

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    on: function(name, callback, context) {
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
      this._events || (this._events = {});
      var events = this._events[name] || (this._events[name] = []);
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context) {
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
      var self = this;
      var once = _.once(function() {
        self.off(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
      return this.on(name, once, context);
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    off: function(name, callback, context) {
      var retain, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
      if (!name && !callback && !context) {
        this._events = {};
        return this;
      }

      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        if (events = this._events[name]) {
          this._events[name] = retain = [];
          if (callback || context) {
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                  (context && context !== ev.context)) {
                retain.push(ev);
              }
            }
          }
          if (!retain.length) delete this._events[name];
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) return this;
      var events = this._events[name];
      var allEvents = this._events.all;
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, arguments);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(obj, name, callback) {
      var listeners = this._listeners;
      if (!listeners) return this;
      var deleteListener = !name && !callback;
      if (typeof name === 'object') callback = this;
      if (obj) (listeners = {})[obj._listenerId] = obj;
      for (var id in listeners) {
        listeners[id].off(name, callback, this);
        if (deleteListener) delete this._listeners[id];
      }
      return this;
    }

  };

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;

    // Handle event maps.
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // Handle space separated event names.
    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
    }
  };

  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  _.each(listenMethods, function(implementation, method) {
    Events[method] = function(obj, name, callback) {
      var listeners = this._listeners || (this._listeners = {});
      var id = obj._listenerId || (obj._listenerId = _.uniqueId('l'));
      listeners[id] = obj;
      if (typeof name === 'object') callback = this;
      obj[implementation](name, callback, this);
      return this;
    };
  });

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Mixin utility
  Events.mixin = function(proto) {
    var exports = ['on', 'once', 'off', 'trigger', 'stopListening', 'listenTo',
                   'listenToOnce', 'bind', 'unbind'];
    _.each(exports, function(name) {
      proto[name] = this[name];
    }, this);
    return proto;
  };

  // Export Events as BackboneEvents depending on current context
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = Events;
    }
    exports.BackboneEvents = Events;
  }else if (typeof define === "function"  && typeof define.amd == "object") {
    define(function() {
      return Events;
    });
  } else {
    root.BackboneEvents = Events;
  }
})(this);

},{}],3:[function(require,module,exports){
module.exports = require('./backbone-events-standalone');

},{"./backbone-events-standalone":2}],4:[function(require,module,exports){
module.exports = require("./lib/biojsalgseqregion");

},{"./lib/biojsalgseqregion":5}],5:[function(require,module,exports){
/*
 * biojs-alg-seqregion
 * https://github.com/homonecloco/biojs-alg-seqregion
 *
 * Copyright (c) 2014 Ricardo H. Ramirez-Gonzalez
 * Licensed under the Apache 2 license.
 */

/**
@class biojsalgseqregion
*/

/**
 * Private Methods
 */

/*
 * Public Methods
 */

 var parse_seq_region = function (reg){
 	ent=reg.split(":");
 	indeces=ent[1].split("-")
 	var reg = new SeqRegion(ent[0], indeces[0], indeces[1]);
 	return reg;
 };

module.exports.parse_seq_region = parse_seq_region;

 var SeqRegion = function(entry, start, end) {
 	this.entry = entry,10;
 	this.start = parseInt(start,10);
 	this.end = parseInt(end,10);
 };

 SeqRegion.prototype.toString = function() {
 	return  this.entry + ":" + this.start  + "-" + this.end;
 };

 SeqRegion.prototype.clone = function(){
 	return new SeqRegion(this.entry, this.start, this.end);
 };

 SeqRegion.prototype.length = function(){
 	return this.end - this.start;
 };

 SeqRegion.prototype.move = function(bases) {
 	var len = this.length();
 	this.end += bases;
 	this.start += bases;
 };


 SeqRegion.prototype.overlaps = function(other){
 	if(other.entry != this.entry){
 		return false;
 	}
 	if(other.start >= this.start && other.start <= this.end){
 		return true;
 	}

 	if(other.end <= this.start &&  other.end >= this.end){
 		return true;
 	}

 	if(other.start <= this.start && (other.end <= this.end && other.end >= this.start )){
 		return true;
 	}
 	return false;
 };

 SeqRegion.prototype.subset = function(other){
 	if(other.start >= this.start && other.end <= this.end){
 		return true;
 	}
 	return false;
 }; 

 SeqRegion.prototype.valid_position = function(pos){
 	if(this.start <= pos && this.end >= pos){
 		return true;
 	}else{
 		return false;
 	}
 };



 SeqRegion.prototype.expand_flanking_region = function(flanking_size){
 	out = this.clone();
 	out.end += flanking_size;
 	out.start -= flanking_size;
 	if(out.start < 1){
 		out.start = 1;
 	}
 	return out;
 };

 SeqRegion.prototype.middle = function(){
 	var middle = (this.start + this.end ) / 2; 
 	return middle;
 };

 SeqRegion.prototype.joinRegion = function(other){
 	var out = this.clone();

 	if(other.start < out.start){
 		out.start = other.start;
 	}

 	if(other.end > out.end){
 		out.end = other.end;
 	}

 	return out;
 };

  //This returns the region that is missing from the cache
  SeqRegion.prototype.getRegionComplement = function(other){

    //console.log("getRegionComplement comparing: ");
    //console.log(JSON.stringify(other));
    //console.log(JSON.stringify(this));
    var  out = other.clone();
    if (!this.overlaps(other)){
     // console.log("Doesnt overlap!");
     return out;
 }

 if(this.subset(other)){
      //console.log("other is a subset");
      return null;
  }
  if(other.subset(this)){
      //console.log("this is a subset");
      return null; //A null tells you don't need to load again. 
  }

  if(other.start < this.start){
      //console.log("other.start < this.start");
      out.end = this.start;
  }

  if (other.end > this.end){
      //console.log("other.end < this.end");
      out.start = this.end;
  }
  return out;
};


module.exports.SeqRegion = SeqRegion;
},{}],6:[function(require,module,exports){
var events = require("backbone-events-standalone");

events.onAll = function(callback,context){
  this.on("all", callback,context);
  return this;
};

// Mixin utility
events.oldMixin = events.mixin;
events.mixin = function(proto) {
  events.oldMixin(proto);
  // add custom onAll
  var exports = ['onAll'];
  for(var i=0; i < exports.length;i++){
    var name = exports[i];
    proto[name] = this[name];
  }
  return proto;
};

module.exports = events;

},{"backbone-events-standalone":3}],7:[function(require,module,exports){
var GenericReader;

var xhr = require('request');
var vow = require('vow');

module.exports = GenericReader = (function() {
  function GenericReader() {}

  // returns a promise if callback is undefined
  GenericReader.read = function(url, callback) {
    var onret;
    onret = (function(_this) {
      return function(err, response, text) {
        return GenericReader._onRetrieval(err, text, callback, _this);
      };
    })(this);

    if(typeof callback === "undefined"){
      var prom = vow.defer();
      callback = function(err, res){
        if(err){
          prom.reject(err);
        }else{
          prom.resolve(res);
        }
      };
      xhr(url, onret);
      return prom.promise();
    }else{
      return xhr(url, onret);
    }
  };

  GenericReader._onRetrieval = function(err, text, callback, _this) {
    var rText;
    if(typeof err !== "undefined"){
      rText = _this.parse(text);
    }
    return callback.call(_this, err, rText);
  };

  // provide a convenient shortcut to inherit
  GenericReader.extend = function(obj, statics){
    return extend(GenericReader, obj, statics); 
  };
  // Mixin utility
  GenericReader.mixin = function(proto) {
    var exports = ['read'];
    if(typeof proto !== "object"){
      proto = proto.prototype;
    }
    exports.forEach(function(name) {
      proto[name] = GenericReader[name];
    }, this);
    return proto;
  };

  return GenericReader;

})();

},{"request":38,"vow":37}],8:[function(require,module,exports){
module.exports = require("./lib/biojsiosam");
},{"./lib/biojsiosam":9}],9:[function(require,module,exports){
  /*
 * biojs-io-sam
 * https://github.com/homonecloco/biojs-io-sam
 *
 * Copyright (c) 2014 Ricardo H. Ramirez-Gonzalez
 * Licensed under the Apache 2 license.
 */

var parser = require('biojs-io-parser');
parser.mixin(module.exports);

module.exports.parse = function(sam){

    var lines=sam.split('\n'); 
    var result = [];
	var obj;
    for(var i=0;i<lines.length;i++){
      obj = this.parseLine(lines[i]);
      result.push(obj);
    }
    return result; //JavaScript object
  };

module.exports.parseLine =  function(samLine){
    var currentLine = samLine.split('\t');
    var container = this;
    var sequence = currentLine[9] ;
    var obj = {
      qname : currentLine[0] ,
      flags : parseInt(currentLine[1],10),
      rname : currentLine[2] ,
      pos   : parseInt(currentLine[3],10) ,
      mapq  : parseInt(currentLine[4],10) ,
      cigar : currentLine[5] ,
      rnext : currentLine[6] ,
      pnext : parseInt(currentLine[7],10),
      tlen  : parseInt(currentLine[8],10) ,
      seq   : sequence,
      qual  : currentLine[10] ,
      duplicates : 1,
      fullId: function(){
        //var id =container.opt.target; 
        var id =  this.qname;
        if(this.firstInPair()){
          id += '/1';
        }
        if(this.secondInPair()){
          id += '/2';
        }
        return id;
      },
      len   : 100,  

    /*     1 @isPaired  = (@flag & 0x0001) > 0
           2 @isMapped             = @flag & 0x0002 > 0
           4 @queryUnmapped        = @flag & 0x0004 > 0
           8 @mateUnmapped         = @flag & 0x0008 > 0
          16 @query_strand          = !(@flag & 0x0010 > 0)
          32 @mate_strand           = !(@flag & 0x0020 > 0)
          64 @firstInPair         = @flag & 0x0040 > 0
         128 @secondInPair        = @flag & 0x0080 > 0
         256 @primary               = !(@flag & 0x0100 > 0)
         512 @failedQuality        = @flag & 0x0200 > 0
        1024 @isDuplicate          = @flag & 0x0400 > 0*/ 
      hasFlag : function (f){ 
        f = parseInt(f);
        return (this.flags & f) === f ;
      },
      forward:   function(){return this.hasFlag(16);},
      isPaired: function(){return this.hasFlag(1);},
      isMapped: function(){return this.hasFlag(2);},
      queryUnmapped: function(){return this.hasFlag(4);}, 
      mateUnmapped: function(){return this.hasFlag(8);}, 
      reverse:   function(){return !this.hasFlag(16);},
      mateForward:   function(){return this.hasFlag(32);},
      mateReverse:   function(){return !this.hasFlag(32);},
      firstInPair: function(){return this.hasFlag(64);},
      secondInPair: function(){return this.hasFlag(128);}, 
      primary: function(){return !this.hasFlag(256);},
      failedQuality: function(){return this.hasFlag(512);},
      isDuplicate: function(){return this.hasFlag(1024);},
      /* displayBases: false,
    displayOrientation: false, 
    display_cigar:false,
    display_mate_missing: false*/
      
      _displayOrientation: function(newDiv){
        if(container.opt.displayOrientation){
          if(this.forward()){
            newDiv.classList.add('bam_forward');
          }else{
            newDiv.classList.add('bam_reverse');
          }
        }
      }, 

      _displayMates: function(newDiv){
        if(container.opt.displayMates){
          if(this.firstInPair()){
            newDiv.classList.add('bam_first');
          }
          if(this.secondInPair()){
            newDiv.classList.add('bam_second');
          }
          if(this.mateUnmapped){
            newDiv.classList.add('bam_mate_missing');
          }
        }
      },

      _drawSeq: function(newDiv){
        
        var seqLen = this.parsedSeq.length;
        var nextInsertion = -1;
        var indexInsertion = 0;
        if(this.insertions.size > 0){
          nextInsertion = this.insertions[0];
        }
       
        for (var i = 0; i < seqLen; i++) {
          var displayBase = this.parsedSeq[i];
          var currentBaseSpan = document.createElement('div');
          newDiv.appendChild(currentBaseSpan);
          currentBaseSpan.className = 'bam_base_' + displayBase;
          currentBaseSpan.classList.add = 'bam_base';
          currentBaseSpan.style.width = container.opt.baseWidth + 'px';
          currentBaseSpan.style.cssFloat = 'left';
		  var textNode = currentBaseSpan.ownerDocument.createTextNode(displayBase);
          currentBaseSpan.appendChild(textNode);
          var lastDiv = currentBaseSpan;
          currentBaseSpan.title = this.pos + i;

          if(nextInsertion === i ){
            lastDiv.classList.add('bam_base_I');
            nextInsertion = this.insertions[indexInsertion++];
          }

        }

      },

      _parseCigar: function(){
        var cigars = this.cigar.replace(/([SIXMND])/g, ':$1,');
        var cigarArray = cigars.split(',');
        var cigarIndex = 0;
        this.len = 0;
        var cigarEnd  = -1;
        var cig ;
        var key;
        var length;
        var parsedSeq = '';
        var insertions = [];
        var changed = true;
		
        for ( var i = 0; i < this.seq.length; i++ ){
          if(i > cigarEnd || changed === true){
            cig = cigarArray[cigarIndex].split(':'); 
            key = cig[1];
            length = parseInt(cig[0]);
            cigarEnd = i + length;
            cigarIndex +=1;
            changed = false;
          }

          if(key === 'M' || key === 'X' || key === '='){
            parsedSeq += this.seq[i];
            this.len += 1;
          }else if(key === 'I'){
            insertions.push(i);
            changed = true;
          }else if(key === 'D' || key === 'N'){
            for (var j  = 0; j < length; j ++ ) {
              parsedSeq += '*';           
           }
            changed = true;
            i--;
          }
        }
        this.len = parsedSeq.length;
        this.parsedSeq = parsedSeq;
        this.insertions = insertions;
      },



      buildDiv: function(){
        var newDiv = document.createElement('div');
        newDiv.style.height = (parseInt( container.opt.baseWidth) + 3)  + 'px';
        newDiv.style.fontSize =  container.opt.baseWidth + 'px';
        newDiv.classList.add('bam_tag');
        newDiv.style.position = 'absolute';
        var nPos = ( this.pos - 1) * container.opt.baseWidth;
        newDiv.style.left = nPos + 'px';
        
        newDiv.id = this.fullId();
        
        this._displayOrientation(newDiv);
        this._displayMates(newDiv);
       
        //TODO: make a function that displays or not depending a 
		//preference to display duplicates
        if(this.isDuplicate()){
          newDiv.classList.add('bam_duplicate');
        }
        this._parseCigar();

        if(container.opt.displayBases){
          this._drawSeq(newDiv);
        }
        
        newDiv.style.width = container.opt.baseWidth * this.len + 'px'; 
        this.div = newDiv;
        return newDiv;
        }};



        for(var j=12;j < currentLine.length;j++){
          var tag = samLine[j].split(':');
          if (tag[1] === 'i'){
           obj[tag[0]] = parseInt(tag[2]);
         }else if (tag[1] === 'f'){
          obj[tag[0]] = parseFloat(tag[2]);
        }
        else{ 
          obj[tag[0]] = tag[2];
        }
      }
      return obj;

    };
 

},{"biojs-io-parser":7}],10:[function(require,module,exports){
'use strict';

var keys = require('object-keys');
var hasSymbols = typeof Symbol === 'function' && typeof Symbol('foo') === 'symbol';

var toStr = Object.prototype.toString;
var concat = Array.prototype.concat;
var origDefineProperty = Object.defineProperty;

var isFunction = function (fn) {
	return typeof fn === 'function' && toStr.call(fn) === '[object Function]';
};

var arePropertyDescriptorsSupported = function () {
	var obj = {};
	try {
		origDefineProperty(obj, 'x', { enumerable: false, value: obj });
		// eslint-disable-next-line no-unused-vars, no-restricted-syntax
		for (var _ in obj) { // jscs:ignore disallowUnusedVariables
			return false;
		}
		return obj.x === obj;
	} catch (e) { /* this is IE 8. */
		return false;
	}
};
var supportsDescriptors = origDefineProperty && arePropertyDescriptorsSupported();

var defineProperty = function (object, name, value, predicate) {
	if (name in object && (!isFunction(predicate) || !predicate())) {
		return;
	}
	if (supportsDescriptors) {
		origDefineProperty(object, name, {
			configurable: true,
			enumerable: false,
			value: value,
			writable: true
		});
	} else {
		object[name] = value;
	}
};

var defineProperties = function (object, map) {
	var predicates = arguments.length > 2 ? arguments[2] : {};
	var props = keys(map);
	if (hasSymbols) {
		props = concat.call(props, Object.getOwnPropertySymbols(map));
	}
	for (var i = 0; i < props.length; i += 1) {
		defineProperty(object, props[i], map[props[i]], predicates[props[i]]);
	}
};

defineProperties.supportsDescriptors = !!supportsDescriptors;

module.exports = defineProperties;

},{"object-keys":28}],11:[function(require,module,exports){
'use strict';

/* globals
	Set,
	Map,
	WeakSet,
	WeakMap,

	Promise,

	Symbol,
	Proxy,

	Atomics,
	SharedArrayBuffer,

	ArrayBuffer,
	DataView,
	Uint8Array,
	Float32Array,
	Float64Array,
	Int8Array,
	Int16Array,
	Int32Array,
	Uint8ClampedArray,
	Uint16Array,
	Uint32Array,
*/

var undefined; // eslint-disable-line no-shadow-restricted-names

var ThrowTypeError = Object.getOwnPropertyDescriptor
	? (function () { return Object.getOwnPropertyDescriptor(arguments, 'callee').get; }())
	: function () { throw new TypeError(); };

var hasSymbols = typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol';

var getProto = Object.getPrototypeOf || function (x) { return x.__proto__; }; // eslint-disable-line no-proto

var generator; // = function * () {};
var generatorFunction = generator ? getProto(generator) : undefined;
var asyncFn; // async function() {};
var asyncFunction = asyncFn ? asyncFn.constructor : undefined;
var asyncGen; // async function * () {};
var asyncGenFunction = asyncGen ? getProto(asyncGen) : undefined;
var asyncGenIterator = asyncGen ? asyncGen() : undefined;

var TypedArray = typeof Uint8Array === 'undefined' ? undefined : getProto(Uint8Array);

var INTRINSICS = {
	'$ %Array%': Array,
	'$ %ArrayBuffer%': typeof ArrayBuffer === 'undefined' ? undefined : ArrayBuffer,
	'$ %ArrayBufferPrototype%': typeof ArrayBuffer === 'undefined' ? undefined : ArrayBuffer.prototype,
	'$ %ArrayIteratorPrototype%': hasSymbols ? getProto([][Symbol.iterator]()) : undefined,
	'$ %ArrayPrototype%': Array.prototype,
	'$ %ArrayProto_entries%': Array.prototype.entries,
	'$ %ArrayProto_forEach%': Array.prototype.forEach,
	'$ %ArrayProto_keys%': Array.prototype.keys,
	'$ %ArrayProto_values%': Array.prototype.values,
	'$ %AsyncFromSyncIteratorPrototype%': undefined,
	'$ %AsyncFunction%': asyncFunction,
	'$ %AsyncFunctionPrototype%': asyncFunction ? asyncFunction.prototype : undefined,
	'$ %AsyncGenerator%': asyncGen ? getProto(asyncGenIterator) : undefined,
	'$ %AsyncGeneratorFunction%': asyncGenFunction,
	'$ %AsyncGeneratorPrototype%': asyncGenFunction ? asyncGenFunction.prototype : undefined,
	'$ %AsyncIteratorPrototype%': asyncGenIterator && hasSymbols && Symbol.asyncIterator ? asyncGenIterator[Symbol.asyncIterator]() : undefined,
	'$ %Atomics%': typeof Atomics === 'undefined' ? undefined : Atomics,
	'$ %Boolean%': Boolean,
	'$ %BooleanPrototype%': Boolean.prototype,
	'$ %DataView%': typeof DataView === 'undefined' ? undefined : DataView,
	'$ %DataViewPrototype%': typeof DataView === 'undefined' ? undefined : DataView.prototype,
	'$ %Date%': Date,
	'$ %DatePrototype%': Date.prototype,
	'$ %decodeURI%': decodeURI,
	'$ %decodeURIComponent%': decodeURIComponent,
	'$ %encodeURI%': encodeURI,
	'$ %encodeURIComponent%': encodeURIComponent,
	'$ %Error%': Error,
	'$ %ErrorPrototype%': Error.prototype,
	'$ %eval%': eval, // eslint-disable-line no-eval
	'$ %EvalError%': EvalError,
	'$ %EvalErrorPrototype%': EvalError.prototype,
	'$ %Float32Array%': typeof Float32Array === 'undefined' ? undefined : Float32Array,
	'$ %Float32ArrayPrototype%': typeof Float32Array === 'undefined' ? undefined : Float32Array.prototype,
	'$ %Float64Array%': typeof Float64Array === 'undefined' ? undefined : Float64Array,
	'$ %Float64ArrayPrototype%': typeof Float64Array === 'undefined' ? undefined : Float64Array.prototype,
	'$ %Function%': Function,
	'$ %FunctionPrototype%': Function.prototype,
	'$ %Generator%': generator ? getProto(generator()) : undefined,
	'$ %GeneratorFunction%': generatorFunction,
	'$ %GeneratorPrototype%': generatorFunction ? generatorFunction.prototype : undefined,
	'$ %Int8Array%': typeof Int8Array === 'undefined' ? undefined : Int8Array,
	'$ %Int8ArrayPrototype%': typeof Int8Array === 'undefined' ? undefined : Int8Array.prototype,
	'$ %Int16Array%': typeof Int16Array === 'undefined' ? undefined : Int16Array,
	'$ %Int16ArrayPrototype%': typeof Int16Array === 'undefined' ? undefined : Int8Array.prototype,
	'$ %Int32Array%': typeof Int32Array === 'undefined' ? undefined : Int32Array,
	'$ %Int32ArrayPrototype%': typeof Int32Array === 'undefined' ? undefined : Int32Array.prototype,
	'$ %isFinite%': isFinite,
	'$ %isNaN%': isNaN,
	'$ %IteratorPrototype%': hasSymbols ? getProto(getProto([][Symbol.iterator]())) : undefined,
	'$ %JSON%': JSON,
	'$ %JSONParse%': JSON.parse,
	'$ %Map%': typeof Map === 'undefined' ? undefined : Map,
	'$ %MapIteratorPrototype%': typeof Map === 'undefined' || !hasSymbols ? undefined : getProto(new Map()[Symbol.iterator]()),
	'$ %MapPrototype%': typeof Map === 'undefined' ? undefined : Map.prototype,
	'$ %Math%': Math,
	'$ %Number%': Number,
	'$ %NumberPrototype%': Number.prototype,
	'$ %Object%': Object,
	'$ %ObjectPrototype%': Object.prototype,
	'$ %ObjProto_toString%': Object.prototype.toString,
	'$ %ObjProto_valueOf%': Object.prototype.valueOf,
	'$ %parseFloat%': parseFloat,
	'$ %parseInt%': parseInt,
	'$ %Promise%': typeof Promise === 'undefined' ? undefined : Promise,
	'$ %PromisePrototype%': typeof Promise === 'undefined' ? undefined : Promise.prototype,
	'$ %PromiseProto_then%': typeof Promise === 'undefined' ? undefined : Promise.prototype.then,
	'$ %Promise_all%': typeof Promise === 'undefined' ? undefined : Promise.all,
	'$ %Promise_reject%': typeof Promise === 'undefined' ? undefined : Promise.reject,
	'$ %Promise_resolve%': typeof Promise === 'undefined' ? undefined : Promise.resolve,
	'$ %Proxy%': typeof Proxy === 'undefined' ? undefined : Proxy,
	'$ %RangeError%': RangeError,
	'$ %RangeErrorPrototype%': RangeError.prototype,
	'$ %ReferenceError%': ReferenceError,
	'$ %ReferenceErrorPrototype%': ReferenceError.prototype,
	'$ %Reflect%': typeof Reflect === 'undefined' ? undefined : Reflect,
	'$ %RegExp%': RegExp,
	'$ %RegExpPrototype%': RegExp.prototype,
	'$ %Set%': typeof Set === 'undefined' ? undefined : Set,
	'$ %SetIteratorPrototype%': typeof Set === 'undefined' || !hasSymbols ? undefined : getProto(new Set()[Symbol.iterator]()),
	'$ %SetPrototype%': typeof Set === 'undefined' ? undefined : Set.prototype,
	'$ %SharedArrayBuffer%': typeof SharedArrayBuffer === 'undefined' ? undefined : SharedArrayBuffer,
	'$ %SharedArrayBufferPrototype%': typeof SharedArrayBuffer === 'undefined' ? undefined : SharedArrayBuffer.prototype,
	'$ %String%': String,
	'$ %StringIteratorPrototype%': hasSymbols ? getProto(''[Symbol.iterator]()) : undefined,
	'$ %StringPrototype%': String.prototype,
	'$ %Symbol%': hasSymbols ? Symbol : undefined,
	'$ %SymbolPrototype%': hasSymbols ? Symbol.prototype : undefined,
	'$ %SyntaxError%': SyntaxError,
	'$ %SyntaxErrorPrototype%': SyntaxError.prototype,
	'$ %ThrowTypeError%': ThrowTypeError,
	'$ %TypedArray%': TypedArray,
	'$ %TypedArrayPrototype%': TypedArray ? TypedArray.prototype : undefined,
	'$ %TypeError%': TypeError,
	'$ %TypeErrorPrototype%': TypeError.prototype,
	'$ %Uint8Array%': typeof Uint8Array === 'undefined' ? undefined : Uint8Array,
	'$ %Uint8ArrayPrototype%': typeof Uint8Array === 'undefined' ? undefined : Uint8Array.prototype,
	'$ %Uint8ClampedArray%': typeof Uint8ClampedArray === 'undefined' ? undefined : Uint8ClampedArray,
	'$ %Uint8ClampedArrayPrototype%': typeof Uint8ClampedArray === 'undefined' ? undefined : Uint8ClampedArray.prototype,
	'$ %Uint16Array%': typeof Uint16Array === 'undefined' ? undefined : Uint16Array,
	'$ %Uint16ArrayPrototype%': typeof Uint16Array === 'undefined' ? undefined : Uint16Array.prototype,
	'$ %Uint32Array%': typeof Uint32Array === 'undefined' ? undefined : Uint32Array,
	'$ %Uint32ArrayPrototype%': typeof Uint32Array === 'undefined' ? undefined : Uint32Array.prototype,
	'$ %URIError%': URIError,
	'$ %URIErrorPrototype%': URIError.prototype,
	'$ %WeakMap%': typeof WeakMap === 'undefined' ? undefined : WeakMap,
	'$ %WeakMapPrototype%': typeof WeakMap === 'undefined' ? undefined : WeakMap.prototype,
	'$ %WeakSet%': typeof WeakSet === 'undefined' ? undefined : WeakSet,
	'$ %WeakSetPrototype%': typeof WeakSet === 'undefined' ? undefined : WeakSet.prototype
};

module.exports = function GetIntrinsic(name, allowMissing) {
	if (arguments.length > 1 && typeof allowMissing !== 'boolean') {
		throw new TypeError('"allowMissing" argument must be a boolean');
	}

	var key = '$ ' + name;
	if (!(key in INTRINSICS)) {
		throw new SyntaxError('intrinsic ' + name + ' does not exist!');
	}

	// istanbul ignore if // hopefully this is impossible to test :-)
	if (typeof INTRINSICS[key] === 'undefined' && !allowMissing) {
		throw new TypeError('intrinsic ' + name + ' exists, but is not available. Please file an issue!');
	}
	return INTRINSICS[key];
};

},{}],12:[function(require,module,exports){
'use strict';

var GetIntrinsic = require('./GetIntrinsic');

var $Object = GetIntrinsic('%Object%');
var $TypeError = GetIntrinsic('%TypeError%');
var $String = GetIntrinsic('%String%');

var assertRecord = require('./helpers/assertRecord');
var $isNaN = require('./helpers/isNaN');
var $isFinite = require('./helpers/isFinite');

var sign = require('./helpers/sign');
var mod = require('./helpers/mod');

var IsCallable = require('is-callable');
var toPrimitive = require('es-to-primitive/es5');

var has = require('has');

// https://es5.github.io/#x9
var ES5 = {
	ToPrimitive: toPrimitive,

	ToBoolean: function ToBoolean(value) {
		return !!value;
	},
	ToNumber: function ToNumber(value) {
		return +value; // eslint-disable-line no-implicit-coercion
	},
	ToInteger: function ToInteger(value) {
		var number = this.ToNumber(value);
		if ($isNaN(number)) { return 0; }
		if (number === 0 || !$isFinite(number)) { return number; }
		return sign(number) * Math.floor(Math.abs(number));
	},
	ToInt32: function ToInt32(x) {
		return this.ToNumber(x) >> 0;
	},
	ToUint32: function ToUint32(x) {
		return this.ToNumber(x) >>> 0;
	},
	ToUint16: function ToUint16(value) {
		var number = this.ToNumber(value);
		if ($isNaN(number) || number === 0 || !$isFinite(number)) { return 0; }
		var posInt = sign(number) * Math.floor(Math.abs(number));
		return mod(posInt, 0x10000);
	},
	ToString: function ToString(value) {
		return $String(value);
	},
	ToObject: function ToObject(value) {
		this.CheckObjectCoercible(value);
		return $Object(value);
	},
	CheckObjectCoercible: function CheckObjectCoercible(value, optMessage) {
		/* jshint eqnull:true */
		if (value == null) {
			throw new $TypeError(optMessage || 'Cannot call method on ' + value);
		}
		return value;
	},
	IsCallable: IsCallable,
	SameValue: function SameValue(x, y) {
		if (x === y) { // 0 === -0, but they are not identical.
			if (x === 0) { return 1 / x === 1 / y; }
			return true;
		}
		return $isNaN(x) && $isNaN(y);
	},

	// https://www.ecma-international.org/ecma-262/5.1/#sec-8
	Type: function Type(x) {
		if (x === null) {
			return 'Null';
		}
		if (typeof x === 'undefined') {
			return 'Undefined';
		}
		if (typeof x === 'function' || typeof x === 'object') {
			return 'Object';
		}
		if (typeof x === 'number') {
			return 'Number';
		}
		if (typeof x === 'boolean') {
			return 'Boolean';
		}
		if (typeof x === 'string') {
			return 'String';
		}
	},

	// https://ecma-international.org/ecma-262/6.0/#sec-property-descriptor-specification-type
	IsPropertyDescriptor: function IsPropertyDescriptor(Desc) {
		if (this.Type(Desc) !== 'Object') {
			return false;
		}
		var allowed = {
			'[[Configurable]]': true,
			'[[Enumerable]]': true,
			'[[Get]]': true,
			'[[Set]]': true,
			'[[Value]]': true,
			'[[Writable]]': true
		};

		for (var key in Desc) { // eslint-disable-line
			if (has(Desc, key) && !allowed[key]) {
				return false;
			}
		}

		var isData = has(Desc, '[[Value]]');
		var IsAccessor = has(Desc, '[[Get]]') || has(Desc, '[[Set]]');
		if (isData && IsAccessor) {
			throw new $TypeError('Property Descriptors may not be both accessor and data descriptors');
		}
		return true;
	},

	// https://ecma-international.org/ecma-262/5.1/#sec-8.10.1
	IsAccessorDescriptor: function IsAccessorDescriptor(Desc) {
		if (typeof Desc === 'undefined') {
			return false;
		}

		assertRecord(this, 'Property Descriptor', 'Desc', Desc);

		if (!has(Desc, '[[Get]]') && !has(Desc, '[[Set]]')) {
			return false;
		}

		return true;
	},

	// https://ecma-international.org/ecma-262/5.1/#sec-8.10.2
	IsDataDescriptor: function IsDataDescriptor(Desc) {
		if (typeof Desc === 'undefined') {
			return false;
		}

		assertRecord(this, 'Property Descriptor', 'Desc', Desc);

		if (!has(Desc, '[[Value]]') && !has(Desc, '[[Writable]]')) {
			return false;
		}

		return true;
	},

	// https://ecma-international.org/ecma-262/5.1/#sec-8.10.3
	IsGenericDescriptor: function IsGenericDescriptor(Desc) {
		if (typeof Desc === 'undefined') {
			return false;
		}

		assertRecord(this, 'Property Descriptor', 'Desc', Desc);

		if (!this.IsAccessorDescriptor(Desc) && !this.IsDataDescriptor(Desc)) {
			return true;
		}

		return false;
	},

	// https://ecma-international.org/ecma-262/5.1/#sec-8.10.4
	FromPropertyDescriptor: function FromPropertyDescriptor(Desc) {
		if (typeof Desc === 'undefined') {
			return Desc;
		}

		assertRecord(this, 'Property Descriptor', 'Desc', Desc);

		if (this.IsDataDescriptor(Desc)) {
			return {
				value: Desc['[[Value]]'],
				writable: !!Desc['[[Writable]]'],
				enumerable: !!Desc['[[Enumerable]]'],
				configurable: !!Desc['[[Configurable]]']
			};
		} else if (this.IsAccessorDescriptor(Desc)) {
			return {
				get: Desc['[[Get]]'],
				set: Desc['[[Set]]'],
				enumerable: !!Desc['[[Enumerable]]'],
				configurable: !!Desc['[[Configurable]]']
			};
		} else {
			throw new $TypeError('FromPropertyDescriptor must be called with a fully populated Property Descriptor');
		}
	},

	// https://ecma-international.org/ecma-262/5.1/#sec-8.10.5
	ToPropertyDescriptor: function ToPropertyDescriptor(Obj) {
		if (this.Type(Obj) !== 'Object') {
			throw new $TypeError('ToPropertyDescriptor requires an object');
		}

		var desc = {};
		if (has(Obj, 'enumerable')) {
			desc['[[Enumerable]]'] = this.ToBoolean(Obj.enumerable);
		}
		if (has(Obj, 'configurable')) {
			desc['[[Configurable]]'] = this.ToBoolean(Obj.configurable);
		}
		if (has(Obj, 'value')) {
			desc['[[Value]]'] = Obj.value;
		}
		if (has(Obj, 'writable')) {
			desc['[[Writable]]'] = this.ToBoolean(Obj.writable);
		}
		if (has(Obj, 'get')) {
			var getter = Obj.get;
			if (typeof getter !== 'undefined' && !this.IsCallable(getter)) {
				throw new TypeError('getter must be a function');
			}
			desc['[[Get]]'] = getter;
		}
		if (has(Obj, 'set')) {
			var setter = Obj.set;
			if (typeof setter !== 'undefined' && !this.IsCallable(setter)) {
				throw new $TypeError('setter must be a function');
			}
			desc['[[Set]]'] = setter;
		}

		if ((has(desc, '[[Get]]') || has(desc, '[[Set]]')) && (has(desc, '[[Value]]') || has(desc, '[[Writable]]'))) {
			throw new $TypeError('Invalid property descriptor. Cannot both specify accessors and a value or writable attribute');
		}
		return desc;
	}
};

module.exports = ES5;

},{"./GetIntrinsic":11,"./helpers/assertRecord":13,"./helpers/isFinite":14,"./helpers/isNaN":15,"./helpers/mod":16,"./helpers/sign":17,"es-to-primitive/es5":18,"has":24,"is-callable":25}],13:[function(require,module,exports){
'use strict';

var GetIntrinsic = require('../GetIntrinsic');

var $TypeError = GetIntrinsic('%TypeError%');
var $SyntaxError = GetIntrinsic('%SyntaxError%');

var has = require('has');

var predicates = {
  // https://ecma-international.org/ecma-262/6.0/#sec-property-descriptor-specification-type
  'Property Descriptor': function isPropertyDescriptor(ES, Desc) {
    if (ES.Type(Desc) !== 'Object') {
      return false;
    }
    var allowed = {
      '[[Configurable]]': true,
      '[[Enumerable]]': true,
      '[[Get]]': true,
      '[[Set]]': true,
      '[[Value]]': true,
      '[[Writable]]': true
    };

    for (var key in Desc) { // eslint-disable-line
      if (has(Desc, key) && !allowed[key]) {
        return false;
      }
    }

    var isData = has(Desc, '[[Value]]');
    var IsAccessor = has(Desc, '[[Get]]') || has(Desc, '[[Set]]');
    if (isData && IsAccessor) {
      throw new $TypeError('Property Descriptors may not be both accessor and data descriptors');
    }
    return true;
  }
};

module.exports = function assertRecord(ES, recordType, argumentName, value) {
  var predicate = predicates[recordType];
  if (typeof predicate !== 'function') {
    throw new $SyntaxError('unknown record type: ' + recordType);
  }
  if (!predicate(ES, value)) {
    throw new $TypeError(argumentName + ' must be a ' + recordType);
  }
  console.log(predicate(ES, value), value);
};

},{"../GetIntrinsic":11,"has":24}],14:[function(require,module,exports){
var $isNaN = Number.isNaN || function (a) { return a !== a; };

module.exports = Number.isFinite || function (x) { return typeof x === 'number' && !$isNaN(x) && x !== Infinity && x !== -Infinity; };

},{}],15:[function(require,module,exports){
module.exports = Number.isNaN || function isNaN(a) {
	return a !== a;
};

},{}],16:[function(require,module,exports){
module.exports = function mod(number, modulo) {
	var remain = number % modulo;
	return Math.floor(remain >= 0 ? remain : remain + modulo);
};

},{}],17:[function(require,module,exports){
module.exports = function sign(number) {
	return number >= 0 ? 1 : -1;
};

},{}],18:[function(require,module,exports){
'use strict';

var toStr = Object.prototype.toString;

var isPrimitive = require('./helpers/isPrimitive');

var isCallable = require('is-callable');

// http://ecma-international.org/ecma-262/5.1/#sec-8.12.8
var ES5internalSlots = {
	'[[DefaultValue]]': function (O) {
		var actualHint;
		if (arguments.length > 1) {
			actualHint = arguments[1];
		} else {
			actualHint = toStr.call(O) === '[object Date]' ? String : Number;
		}

		if (actualHint === String || actualHint === Number) {
			var methods = actualHint === String ? ['toString', 'valueOf'] : ['valueOf', 'toString'];
			var value, i;
			for (i = 0; i < methods.length; ++i) {
				if (isCallable(O[methods[i]])) {
					value = O[methods[i]]();
					if (isPrimitive(value)) {
						return value;
					}
				}
			}
			throw new TypeError('No default value');
		}
		throw new TypeError('invalid [[DefaultValue]] hint supplied');
	}
};

// http://ecma-international.org/ecma-262/5.1/#sec-9.1
module.exports = function ToPrimitive(input) {
	if (isPrimitive(input)) {
		return input;
	}
	if (arguments.length > 1) {
		return ES5internalSlots['[[DefaultValue]]'](input, arguments[1]);
	}
	return ES5internalSlots['[[DefaultValue]]'](input);
};

},{"./helpers/isPrimitive":19,"is-callable":25}],19:[function(require,module,exports){
module.exports = function isPrimitive(value) {
	return value === null || (typeof value !== 'function' && typeof value !== 'object');
};

},{}],20:[function(require,module,exports){
'use strict';

var isCallable = require('is-callable');

var toStr = Object.prototype.toString;
var hasOwnProperty = Object.prototype.hasOwnProperty;

var forEachArray = function forEachArray(array, iterator, receiver) {
    for (var i = 0, len = array.length; i < len; i++) {
        if (hasOwnProperty.call(array, i)) {
            if (receiver == null) {
                iterator(array[i], i, array);
            } else {
                iterator.call(receiver, array[i], i, array);
            }
        }
    }
};

var forEachString = function forEachString(string, iterator, receiver) {
    for (var i = 0, len = string.length; i < len; i++) {
        // no such thing as a sparse string.
        if (receiver == null) {
            iterator(string.charAt(i), i, string);
        } else {
            iterator.call(receiver, string.charAt(i), i, string);
        }
    }
};

var forEachObject = function forEachObject(object, iterator, receiver) {
    for (var k in object) {
        if (hasOwnProperty.call(object, k)) {
            if (receiver == null) {
                iterator(object[k], k, object);
            } else {
                iterator.call(receiver, object[k], k, object);
            }
        }
    }
};

var forEach = function forEach(list, iterator, thisArg) {
    if (!isCallable(iterator)) {
        throw new TypeError('iterator must be a function');
    }

    var receiver;
    if (arguments.length >= 3) {
        receiver = thisArg;
    }

    if (toStr.call(list) === '[object Array]') {
        forEachArray(list, iterator, receiver);
    } else if (typeof list === 'string') {
        forEachString(list, iterator, receiver);
    } else {
        forEachObject(list, iterator, receiver);
    }
};

module.exports = forEach;

},{"is-callable":25}],21:[function(require,module,exports){
'use strict';

/* eslint no-invalid-this: 1 */

var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
var slice = Array.prototype.slice;
var toStr = Object.prototype.toString;
var funcType = '[object Function]';

module.exports = function bind(that) {
    var target = this;
    if (typeof target !== 'function' || toStr.call(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slice.call(arguments, 1);

    var bound;
    var binder = function () {
        if (this instanceof bound) {
            var result = target.apply(
                this,
                args.concat(slice.call(arguments))
            );
            if (Object(result) === result) {
                return result;
            }
            return this;
        } else {
            return target.apply(
                that,
                args.concat(slice.call(arguments))
            );
        }
    };

    var boundLength = Math.max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0; i < boundLength; i++) {
        boundArgs.push('$' + i);
    }

    bound = Function('binder', 'return function (' + boundArgs.join(',') + '){ return binder.apply(this,arguments); }')(binder);

    if (target.prototype) {
        var Empty = function Empty() {};
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
    }

    return bound;
};

},{}],22:[function(require,module,exports){
'use strict';

var implementation = require('./implementation');

module.exports = Function.prototype.bind || implementation;

},{"./implementation":21}],23:[function(require,module,exports){
(function (global){
var win;

if (typeof window !== "undefined") {
    win = window;
} else if (typeof global !== "undefined") {
    win = global;
} else if (typeof self !== "undefined"){
    win = self;
} else {
    win = {};
}

module.exports = win;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],24:[function(require,module,exports){
'use strict';

var bind = require('function-bind');

module.exports = bind.call(Function.call, Object.prototype.hasOwnProperty);

},{"function-bind":22}],25:[function(require,module,exports){
'use strict';

var fnToStr = Function.prototype.toString;

var constructorRegex = /^\s*class\b/;
var isES6ClassFn = function isES6ClassFunction(value) {
	try {
		var fnStr = fnToStr.call(value);
		return constructorRegex.test(fnStr);
	} catch (e) {
		return false; // not a function
	}
};

var tryFunctionObject = function tryFunctionToStr(value) {
	try {
		if (isES6ClassFn(value)) { return false; }
		fnToStr.call(value);
		return true;
	} catch (e) {
		return false;
	}
};
var toStr = Object.prototype.toString;
var fnClass = '[object Function]';
var genClass = '[object GeneratorFunction]';
var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';

module.exports = function isCallable(value) {
	if (!value) { return false; }
	if (typeof value !== 'function' && typeof value !== 'object') { return false; }
	if (typeof value === 'function' && !value.prototype) { return true; }
	if (hasToStringTag) { return tryFunctionObject(value); }
	if (isES6ClassFn(value)) { return false; }
	var strClass = toStr.call(value);
	return strClass === fnClass || strClass === genClass;
};

},{}],26:[function(require,module,exports){
module.exports = isFunction

var toString = Object.prototype.toString

function isFunction (fn) {
  var string = toString.call(fn)
  return string === '[object Function]' ||
    (typeof fn === 'function' && string !== '[object RegExp]') ||
    (typeof window !== 'undefined' &&
     // IE8 and below
     (fn === window.setTimeout ||
      fn === window.alert ||
      fn === window.confirm ||
      fn === window.prompt))
};

},{}],27:[function(require,module,exports){
'use strict';

var keysShim;
if (!Object.keys) {
	// modified from https://github.com/es-shims/es5-shim
	var has = Object.prototype.hasOwnProperty;
	var toStr = Object.prototype.toString;
	var isArgs = require('./isArguments'); // eslint-disable-line global-require
	var isEnumerable = Object.prototype.propertyIsEnumerable;
	var hasDontEnumBug = !isEnumerable.call({ toString: null }, 'toString');
	var hasProtoEnumBug = isEnumerable.call(function () {}, 'prototype');
	var dontEnums = [
		'toString',
		'toLocaleString',
		'valueOf',
		'hasOwnProperty',
		'isPrototypeOf',
		'propertyIsEnumerable',
		'constructor'
	];
	var equalsConstructorPrototype = function (o) {
		var ctor = o.constructor;
		return ctor && ctor.prototype === o;
	};
	var excludedKeys = {
		$applicationCache: true,
		$console: true,
		$external: true,
		$frame: true,
		$frameElement: true,
		$frames: true,
		$innerHeight: true,
		$innerWidth: true,
		$onmozfullscreenchange: true,
		$onmozfullscreenerror: true,
		$outerHeight: true,
		$outerWidth: true,
		$pageXOffset: true,
		$pageYOffset: true,
		$parent: true,
		$scrollLeft: true,
		$scrollTop: true,
		$scrollX: true,
		$scrollY: true,
		$self: true,
		$webkitIndexedDB: true,
		$webkitStorageInfo: true,
		$window: true
	};
	var hasAutomationEqualityBug = (function () {
		/* global window */
		if (typeof window === 'undefined') { return false; }
		for (var k in window) {
			try {
				if (!excludedKeys['$' + k] && has.call(window, k) && window[k] !== null && typeof window[k] === 'object') {
					try {
						equalsConstructorPrototype(window[k]);
					} catch (e) {
						return true;
					}
				}
			} catch (e) {
				return true;
			}
		}
		return false;
	}());
	var equalsConstructorPrototypeIfNotBuggy = function (o) {
		/* global window */
		if (typeof window === 'undefined' || !hasAutomationEqualityBug) {
			return equalsConstructorPrototype(o);
		}
		try {
			return equalsConstructorPrototype(o);
		} catch (e) {
			return false;
		}
	};

	keysShim = function keys(object) {
		var isObject = object !== null && typeof object === 'object';
		var isFunction = toStr.call(object) === '[object Function]';
		var isArguments = isArgs(object);
		var isString = isObject && toStr.call(object) === '[object String]';
		var theKeys = [];

		if (!isObject && !isFunction && !isArguments) {
			throw new TypeError('Object.keys called on a non-object');
		}

		var skipProto = hasProtoEnumBug && isFunction;
		if (isString && object.length > 0 && !has.call(object, 0)) {
			for (var i = 0; i < object.length; ++i) {
				theKeys.push(String(i));
			}
		}

		if (isArguments && object.length > 0) {
			for (var j = 0; j < object.length; ++j) {
				theKeys.push(String(j));
			}
		} else {
			for (var name in object) {
				if (!(skipProto && name === 'prototype') && has.call(object, name)) {
					theKeys.push(String(name));
				}
			}
		}

		if (hasDontEnumBug) {
			var skipConstructor = equalsConstructorPrototypeIfNotBuggy(object);

			for (var k = 0; k < dontEnums.length; ++k) {
				if (!(skipConstructor && dontEnums[k] === 'constructor') && has.call(object, dontEnums[k])) {
					theKeys.push(dontEnums[k]);
				}
			}
		}
		return theKeys;
	};
}
module.exports = keysShim;

},{"./isArguments":29}],28:[function(require,module,exports){
'use strict';

var slice = Array.prototype.slice;
var isArgs = require('./isArguments');

var origKeys = Object.keys;
var keysShim = origKeys ? function keys(o) { return origKeys(o); } : require('./implementation');

var originalKeys = Object.keys;

keysShim.shim = function shimObjectKeys() {
	if (Object.keys) {
		var keysWorksWithArguments = (function () {
			// Safari 5.0 bug
			var args = Object.keys(arguments);
			return args && args.length === arguments.length;
		}(1, 2));
		if (!keysWorksWithArguments) {
			Object.keys = function keys(object) { // eslint-disable-line func-name-matching
				if (isArgs(object)) {
					return originalKeys(slice.call(object));
				}
				return originalKeys(object);
			};
		}
	} else {
		Object.keys = keysShim;
	}
	return Object.keys || keysShim;
};

module.exports = keysShim;

},{"./implementation":27,"./isArguments":29}],29:[function(require,module,exports){
'use strict';

var toStr = Object.prototype.toString;

module.exports = function isArguments(value) {
	var str = toStr.call(value);
	var isArgs = str === '[object Arguments]';
	if (!isArgs) {
		isArgs = str !== '[object Array]' &&
			value !== null &&
			typeof value === 'object' &&
			typeof value.length === 'number' &&
			value.length >= 0 &&
			toStr.call(value.callee) === '[object Function]';
	}
	return isArgs;
};

},{}],30:[function(require,module,exports){
var trim = require('string.prototype.trim')
  , forEach = require('for-each')
  , isArray = function(arg) {
      return Object.prototype.toString.call(arg) === '[object Array]';
    }

module.exports = function (headers) {
  if (!headers)
    return {}

  var result = {}

  forEach(
      trim(headers).split('\n')
    , function (row) {
        var index = row.indexOf(':')
          , key = trim(row.slice(0, index)).toLowerCase()
          , value = trim(row.slice(index + 1))

        if (typeof(result[key]) === 'undefined') {
          result[key] = value
        } else if (isArray(result[key])) {
          result[key].push(value)
        } else {
          result[key] = [ result[key], value ]
        }
      }
  )

  return result
}

},{"for-each":20,"string.prototype.trim":33}],31:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],32:[function(require,module,exports){
'use strict';

var bind = require('function-bind');
var ES = require('es-abstract/es5');
var replace = bind.call(Function.call, String.prototype.replace);

/* eslint-disable no-control-regex */
var leftWhitespace = /^[\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF]+/;
var rightWhitespace = /[\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF]+$/;
/* eslint-enable no-control-regex */

module.exports = function trim() {
	var S = ES.ToString(ES.CheckObjectCoercible(this));
	return replace(replace(S, leftWhitespace, ''), rightWhitespace, '');
};

},{"es-abstract/es5":12,"function-bind":22}],33:[function(require,module,exports){
'use strict';

var bind = require('function-bind');
var define = require('define-properties');

var implementation = require('./implementation');
var getPolyfill = require('./polyfill');
var shim = require('./shim');

var boundTrim = bind.call(Function.call, getPolyfill());

define(boundTrim, {
	getPolyfill: getPolyfill,
	implementation: implementation,
	shim: shim
});

module.exports = boundTrim;

},{"./implementation":32,"./polyfill":34,"./shim":35,"define-properties":10,"function-bind":22}],34:[function(require,module,exports){
'use strict';

var implementation = require('./implementation');

var zeroWidthSpace = '\u200b';

module.exports = function getPolyfill() {
	if (String.prototype.trim && zeroWidthSpace.trim() === zeroWidthSpace) {
		return String.prototype.trim;
	}
	return implementation;
};

},{"./implementation":32}],35:[function(require,module,exports){
'use strict';

var define = require('define-properties');
var getPolyfill = require('./polyfill');

module.exports = function shimStringTrim() {
	var polyfill = getPolyfill();
	define(String.prototype, { trim: polyfill }, {
		trim: function testTrim() {
			return String.prototype.trim !== polyfill;
		}
	});
	return polyfill;
};

},{"./polyfill":34,"define-properties":10}],36:[function(require,module,exports){
(function (setImmediate,clearImmediate){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this,require("timers").setImmediate,require("timers").clearImmediate)
},{"process/browser.js":31,"timers":36}],37:[function(require,module,exports){
(function (process,global,setImmediate){
/**
 * @module vow
 * @author Filatov Dmitry <dfilatov@yandex-team.ru>
 * @version 0.4.20
 * @license
 * Dual licensed under the MIT and GPL licenses:
 *   * http://www.opensource.org/licenses/mit-license.php
 *   * http://www.gnu.org/licenses/gpl.html
 */

(function(global) {

var undef,
    nextTick = (function() {
        var fns = [],
            enqueueFn = function(fn) {
                fns.push(fn);
                return fns.length === 1;
            },
            callFns = function() {
                var fnsToCall = fns, i = 0, len = fns.length;
                fns = [];
                while(i < len) {
                    fnsToCall[i++]();
                }
            };

        var MutationObserver = global.MutationObserver || global.WebKitMutationObserver; // modern browsers
        if(MutationObserver) {
            var num = 1,
                node = document.createTextNode('');

            new MutationObserver(callFns).observe(node, { characterData : true });

            return function(fn) {
                enqueueFn(fn) && (node.data = (num *= -1));
            };
        }

        if(typeof process === 'object' && process.nextTick) {
            return function(fn) {
                enqueueFn(fn) && process.nextTick(callFns);
            };
        }

        if(typeof setImmediate === 'function') {
            return function(fn) {
                enqueueFn(fn) && setImmediate(callFns);
            };
        }

        if(global.postMessage) {
            var isPostMessageAsync = true;
            if(global.attachEvent) {
                var checkAsync = function() {
                        isPostMessageAsync = false;
                    };
                global.attachEvent('onmessage', checkAsync);
                global.postMessage('__checkAsync', '*');
                global.detachEvent('onmessage', checkAsync);
            }

            if(isPostMessageAsync) {
                var msg = '__promise' + Math.random() + '_' +new Date,
                    onMessage = function(e) {
                        if(e.data === msg) {
                            e.stopPropagation && e.stopPropagation();
                            callFns();
                        }
                    };

                global.addEventListener?
                    global.addEventListener('message', onMessage, true) :
                    global.attachEvent('onmessage', onMessage);

                return function(fn) {
                    enqueueFn(fn) && global.postMessage(msg, '*');
                };
            }
        }

        var doc = global.document;
        if('onreadystatechange' in doc.createElement('script')) { // ie6-ie8
            var createScript = function() {
                    var script = doc.createElement('script');
                    script.onreadystatechange = function() {
                        script.parentNode.removeChild(script);
                        script = script.onreadystatechange = null;
                        callFns();
                };
                (doc.documentElement || doc.body).appendChild(script);
            };

            return function(fn) {
                enqueueFn(fn) && createScript();
            };
        }

        return function(fn) { // old browsers
            enqueueFn(fn) && setTimeout(callFns, 0);
        };
    })(),
    throwException = function(e) {
        nextTick(function() {
            throw e;
        });
    },
    isFunction = function(obj) {
        return typeof obj === 'function';
    },
    isObject = function(obj) {
        return obj !== null && typeof obj === 'object';
    },
    toStr = Object.prototype.toString,
    isArray = Array.isArray || function(obj) {
        return toStr.call(obj) === '[object Array]';
    },
    getArrayKeys = function(arr) {
        var res = [],
            i = 0, len = arr.length;
        while(i < len) {
            res.push(i++);
        }
        return res;
    },
    getObjectKeys = Object.keys || function(obj) {
        var res = [];
        for(var i in obj) {
            obj.hasOwnProperty(i) && res.push(i);
        }
        return res;
    },
    defineCustomErrorType = function(name) {
        var res = function(message) {
            this.name = name;
            this.message = message;
        };

        res.prototype = new Error();

        return res;
    },
    wrapOnFulfilled = function(onFulfilled, idx) {
        return function(val) {
            onFulfilled.call(this, val, idx);
        };
    },
    emitUnhandledRejection = global.PromiseRejectionEvent?
        function(reason, promise) {
            new global.PromiseRejectionEvent(
                'unhandledrejection',
                {
                    promise : promise,
                    reason : reason
                });
        } :
        typeof process === 'object' && process.emit?
            function(reason, promise) {
                process.emit('unhandledRejection', reason, promise);
            } :
            function() {};

/**
 * @class Deferred
 * @exports vow:Deferred
 * @description
 * The `Deferred` class is used to encapsulate newly-created promise object along with functions that resolve, reject or notify it.
 */

/**
 * @constructor
 * @description
 * You can use `vow.defer()` instead of using this constructor.
 *
 * `new vow.Deferred()` gives the same result as `vow.defer()`.
 */
var Deferred = function() {
    this._promise = new Promise();
};

Deferred.prototype = /** @lends Deferred.prototype */{
    /**
     * Returns the corresponding promise.
     *
     * @returns {vow:Promise}
     */
    promise : function() {
        return this._promise;
    },

    /**
     * Resolves the corresponding promise with the given `value`.
     *
     * @param {*} value
     *
     * @example
     * ```js
     * var defer = vow.defer(),
     *     promise = defer.promise();
     *
     * promise.then(function(value) {
     *     // value is "'success'" here
     * });
     *
     * defer.resolve('success');
     * ```
     */
    resolve : function(value) {
        this._promise.isResolved() || this._promise._resolve(value);
    },

    /**
     * Rejects the corresponding promise with the given `reason`.
     *
     * @param {*} reason
     *
     * @example
     * ```js
     * var defer = vow.defer(),
     *     promise = defer.promise();
     *
     * promise.fail(function(reason) {
     *     // reason is "'something is wrong'" here
     * });
     *
     * defer.reject('something is wrong');
     * ```
     */
    reject : function(reason) {
        if(this._promise.isResolved()) {
            return;
        }

        if(vow.isPromise(reason)) {
            reason = reason.then(function(val) {
                var defer = vow.defer();
                defer.reject(val);
                return defer.promise();
            });
            this._promise._resolve(reason);
        }
        else {
            this._promise._reject(reason);
        }
    },

    /**
     * Notifies the corresponding promise with the given `value`.
     *
     * @param {*} value
     *
     * @example
     * ```js
     * var defer = vow.defer(),
     *     promise = defer.promise();
     *
     * promise.progress(function(value) {
     *     // value is "'20%'", "'40%'" here
     * });
     *
     * defer.notify('20%');
     * defer.notify('40%');
     * ```
     */
    notify : function(value) {
        this._promise.isResolved() || this._promise._notify(value);
    }
};

var PROMISE_STATUS = {
    PENDING   : 0,
    RESOLVED  : 1,
    FULFILLED : 2,
    REJECTED  : 3
};

/**
 * @class Promise
 * @exports vow:Promise
 * @description
 * The `Promise` class is used when you want to give to the caller something to subscribe to,
 * but not the ability to resolve or reject the deferred.
 */

/**
 * @constructor
 * @param {Function} resolver See https://github.com/domenic/promises-unwrapping/blob/master/README.md#the-promise-constructor for details.
 * @description
 * You should use this constructor directly only if you are going to use `vow` as DOM Promises implementation.
 * In other case you should use `vow.defer()` and `defer.promise()` methods.
 * @example
 * ```js
 * function fetchJSON(url) {
 *     return new vow.Promise(function(resolve, reject, notify) {
 *         var xhr = new XMLHttpRequest();
 *         xhr.open('GET', url);
 *         xhr.responseType = 'json';
 *         xhr.send();
 *         xhr.onload = function() {
 *             if(xhr.response) {
 *                 resolve(xhr.response);
 *             }
 *             else {
 *                 reject(new TypeError());
 *             }
 *         };
 *     });
 * }
 * ```
 */
var Promise = function(resolver) {
    this._value = undef;
    this._status = PROMISE_STATUS.PENDING;
    this._shouldEmitUnhandledRejection = true;

    this._fulfilledCallbacks = [];
    this._rejectedCallbacks = [];
    this._progressCallbacks = [];

    if(resolver) { // NOTE: see https://github.com/domenic/promises-unwrapping/blob/master/README.md
        var _this = this,
            resolverFnLen = resolver.length;

        try {
            resolver(
                function(val) {
                    _this.isResolved() || _this._resolve(val);
                },
                resolverFnLen > 1?
                    function(reason) {
                        _this.isResolved() || _this._reject(reason);
                    } :
                    undef,
                resolverFnLen > 2?
                    function(val) {
                        _this.isResolved() || _this._notify(val);
                    } :
                    undef);
        }
        catch(e) {
            this._reject(e);
        }
    }
};

Promise.prototype = /** @lends Promise.prototype */ {
    /**
     * Returns the value of the fulfilled promise or the reason in case of rejection.
     *
     * @returns {*}
     */
    valueOf : function() {
        return this._value;
    },

    /**
     * Returns `true` if the promise is resolved.
     *
     * @returns {Boolean}
     */
    isResolved : function() {
        return this._status !== PROMISE_STATUS.PENDING;
    },

    /**
     * Returns `true` if the promise is fulfilled.
     *
     * @returns {Boolean}
     */
    isFulfilled : function() {
        return this._status === PROMISE_STATUS.FULFILLED;
    },

    /**
     * Returns `true` if the promise is rejected.
     *
     * @returns {Boolean}
     */
    isRejected : function() {
        return this._status === PROMISE_STATUS.REJECTED;
    },

    /**
     * Adds reactions to the promise.
     *
     * @param {Function} [onFulfilled] Callback that will be invoked with a provided value after the promise has been fulfilled
     * @param {Function} [onRejected] Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Function} [onProgress] Callback that will be invoked with a provided value after the promise has been notified
     * @param {Object} [ctx] Context of the callbacks execution
     * @returns {vow:Promise} A new promise, see https://github.com/promises-aplus/promises-spec for details
     */
    then : function(onFulfilled, onRejected, onProgress, ctx) {
        this._shouldEmitUnhandledRejection = false;
        var defer = new Deferred();
        this._addCallbacks(defer, onFulfilled, onRejected, onProgress, ctx);
        return defer.promise();
    },

    /**
     * Adds only a rejection reaction. This method is a shorthand for `promise.then(undefined, onRejected)`.
     *
     * @param {Function} onRejected Callback that will be called with a provided 'reason' as argument after the promise has been rejected
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    'catch' : function(onRejected, ctx) {
        return this.then(undef, onRejected, ctx);
    },

    /**
     * Adds only a rejection reaction. This method is a shorthand for `promise.then(null, onRejected)`. It's also an alias for `catch`.
     *
     * @param {Function} onRejected Callback to be called with the value after promise has been rejected
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    fail : function(onRejected, ctx) {
        return this.then(undef, onRejected, ctx);
    },

    /**
     * Adds a resolving reaction (for both fulfillment and rejection).
     *
     * @param {Function} onResolved Callback that will be invoked with the promise as an argument, after the promise has been resolved.
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    always : function(onResolved, ctx) {
        var _this = this,
            cb = function() {
                return onResolved.call(this, _this);
            };

        return this.then(cb, cb, ctx);
    },

    /**
     * Adds a resolving reaction (for both fulfillment and rejection). The returned promise will be fullfiled with the same value or rejected with the same reason as the original promise.
     *
     * @param {Function} onFinalized Callback that will be invoked after the promise has been resolved.
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    'finally' : function(onFinalized, ctx) {
        var _this = this,
            cb = function() {
                return onFinalized.call(this);
            };
        return this
            .then(cb, cb, ctx)
            .then(function() {
                return _this;
            });
    },

    /**
     * Adds a progress reaction.
     *
     * @param {Function} onProgress Callback that will be called with a provided value when the promise has been notified
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    progress : function(onProgress, ctx) {
        return this.then(undef, undef, onProgress, ctx);
    },

    /**
     * Like `promise.then`, but "spreads" the array into a variadic value handler.
     * It is useful with the `vow.all` and the `vow.allResolved` methods.
     *
     * @param {Function} [onFulfilled] Callback that will be invoked with a provided value after the promise has been fulfilled
     * @param {Function} [onRejected] Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Object} [ctx] Context of the callbacks execution
     * @returns {vow:Promise}
     *
     * @example
     * ```js
     * var defer1 = vow.defer(),
     *     defer2 = vow.defer();
     *
     * vow.all([defer1.promise(), defer2.promise()]).spread(function(arg1, arg2) {
     *     // arg1 is "1", arg2 is "'two'" here
     * });
     *
     * defer1.resolve(1);
     * defer2.resolve('two');
     * ```
     */
    spread : function(onFulfilled, onRejected, ctx) {
        return this.then(
            function(val) {
                return onFulfilled.apply(this, val);
            },
            onRejected,
            ctx);
    },

    /**
     * Like `then`, but terminates a chain of promises.
     * If the promise has been rejected, this method throws it's "reason" as an exception in a future turn of the event loop.
     *
     * @param {Function} [onFulfilled] Callback that will be invoked with a provided value after the promise has been fulfilled
     * @param {Function} [onRejected] Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Function} [onProgress] Callback that will be invoked with a provided value after the promise has been notified
     * @param {Object} [ctx] Context of the callbacks execution
     *
     * @example
     * ```js
     * var defer = vow.defer();
     * defer.reject(Error('Internal error'));
     * defer.promise().done(); // exception to be thrown
     * ```
     */
    done : function(onFulfilled, onRejected, onProgress, ctx) {
        this
            .then(onFulfilled, onRejected, onProgress, ctx)
            .fail(throwException);
    },

    /**
     * Returns a new promise that will be fulfilled in `delay` milliseconds if the promise is fulfilled,
     * or immediately rejected if the promise is rejected.
     *
     * @param {Number} delay
     * @returns {vow:Promise}
     */
    delay : function(delay) {
        var timer,
            promise = this.then(function(val) {
                var defer = new Deferred();
                timer = setTimeout(
                    function() {
                        defer.resolve(val);
                    },
                    delay);

                return defer.promise();
            });

        promise.always(function() {
            clearTimeout(timer);
        });

        return promise;
    },

    /**
     * Returns a new promise that will be rejected in `timeout` milliseconds
     * if the promise is not resolved beforehand.
     *
     * @param {Number} timeout
     * @returns {vow:Promise}
     *
     * @example
     * ```js
     * var defer = vow.defer(),
     *     promiseWithTimeout1 = defer.promise().timeout(50),
     *     promiseWithTimeout2 = defer.promise().timeout(200);
     *
     * setTimeout(
     *     function() {
     *         defer.resolve('ok');
     *     },
     *     100);
     *
     * promiseWithTimeout1.fail(function(reason) {
     *     // promiseWithTimeout to be rejected in 50ms
     * });
     *
     * promiseWithTimeout2.then(function(value) {
     *     // promiseWithTimeout to be fulfilled with "'ok'" value
     * });
     * ```
     */
    timeout : function(timeout) {
        var defer = new Deferred(),
            timer = setTimeout(
                function() {
                    defer.reject(new vow.TimedOutError('timed out'));
                },
                timeout);

        this.then(
            function(val) {
                defer.resolve(val);
            },
            function(reason) {
                defer.reject(reason);
            });

        defer.promise().always(function() {
            clearTimeout(timer);
        });

        return defer.promise();
    },

    _vow : true,

    _resolve : function(val) {
        if(this._status > PROMISE_STATUS.RESOLVED) {
            return;
        }

        if(val === this) {
            this._reject(TypeError('Can\'t resolve promise with itself'));
            return;
        }

        this._status = PROMISE_STATUS.RESOLVED;

        if(val && !!val._vow) { // shortpath for vow.Promise
            if(val.isFulfilled()) {
                this._fulfill(val.valueOf());
            }
            else if(val.isRejected()) {
                val._shouldEmitUnhandledRejection = false;
                this._reject(val.valueOf());
            }
            else {
                val.then(
                    this._fulfill,
                    this._reject,
                    this._notify,
                    this);
            }

            return;
        }

        if(isObject(val) || isFunction(val)) {
            var then;
            try {
                then = val.then;
            }
            catch(e) {
                this._reject(e);
                return;
            }

            if(isFunction(then)) {
                var _this = this,
                    isResolved = false;

                try {
                    then.call(
                        val,
                        function(val) {
                            if(isResolved) {
                                return;
                            }

                            isResolved = true;
                            _this._resolve(val);
                        },
                        function(err) {
                            if(isResolved) {
                                return;
                            }

                            isResolved = true;
                            _this._reject(err);
                        },
                        function(val) {
                            _this._notify(val);
                        });
                }
                catch(e) {
                    isResolved || this._reject(e);
                }

                return;
            }
        }

        this._fulfill(val);
    },

    _fulfill : function(val) {
        if(this._status > PROMISE_STATUS.RESOLVED) {
            return;
        }

        this._status = PROMISE_STATUS.FULFILLED;
        this._value = val;

        this._callCallbacks(this._fulfilledCallbacks, val);
        this._fulfilledCallbacks = this._rejectedCallbacks = this._progressCallbacks = undef;
    },

    _reject : function(reason) {
        if(this._status > PROMISE_STATUS.RESOLVED) {
            return;
        }

        this._status = PROMISE_STATUS.REJECTED;
        this._value = reason;

        this._callCallbacks(this._rejectedCallbacks, reason);

        if(!this._rejectedCallbacks.length) {
            var _this = this;
            nextTick(function() {
                if(_this._shouldEmitUnhandledRejection) {
                    emitUnhandledRejection(reason, _this);
                }
            });
        }

        this._fulfilledCallbacks = this._rejectedCallbacks = this._progressCallbacks = undef;
    },

    _notify : function(val) {
        this._callCallbacks(this._progressCallbacks, val);
    },

    _addCallbacks : function(defer, onFulfilled, onRejected, onProgress, ctx) {
        if(onRejected && !isFunction(onRejected)) {
            ctx = onRejected;
            onRejected = undef;
        }
        else if(onProgress && !isFunction(onProgress)) {
            ctx = onProgress;
            onProgress = undef;
        }

        if(onRejected) {
            this._shouldEmitUnhandledRejection = false;
        }

        var cb;

        if(!this.isRejected()) {
            cb = { defer : defer, fn : isFunction(onFulfilled)? onFulfilled : undef, ctx : ctx };
            this.isFulfilled()?
                this._callCallbacks([cb], this._value) :
                this._fulfilledCallbacks.push(cb);
        }

        if(!this.isFulfilled()) {
            cb = { defer : defer, fn : onRejected, ctx : ctx };
            this.isRejected()?
                this._callCallbacks([cb], this._value) :
                this._rejectedCallbacks.push(cb);
        }

        if(this._status <= PROMISE_STATUS.RESOLVED) {
            this._progressCallbacks.push({ defer : defer, fn : onProgress, ctx : ctx });
        }
    },

    _callCallbacks : function(callbacks, arg) {
        var len = callbacks.length;
        if(!len) {
            return;
        }

        var isResolved = this.isResolved(),
            isFulfilled = this.isFulfilled(),
            isRejected = this.isRejected();

        nextTick(function() {
            var i = 0, cb, defer, fn;
            while(i < len) {
                cb = callbacks[i++];
                defer = cb.defer;
                fn = cb.fn;

                if(fn) {
                    var ctx = cb.ctx,
                        res;
                    try {
                        res = ctx? fn.call(ctx, arg) : fn(arg);
                    }
                    catch(e) {
                        defer.reject(e);
                        continue;
                    }

                    isFulfilled || isRejected?
                        defer.resolve(res) :
                        defer.notify(res);
                }
                else if(isFulfilled) {
                    defer.resolve(arg);
                }
                else if(isRejected) {
                    defer.reject(arg);
                }
                else {
                    defer.notify(arg);
                }
            }
        });
    }
};

/** @lends Promise */
var staticMethods = {
    /**
     * Coerces the given `value` to a promise, or returns the `value` if it's already a promise.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    cast : function(value) {
        return vow.cast(value);
    },

    /**
     * Returns a promise, that will be fulfilled only after all the items in `iterable` are fulfilled.
     * If any of the `iterable` items gets rejected, then the returned promise will be rejected.
     *
     * @param {Array|Object} iterable
     * @returns {vow:Promise}
     */
    all : function(iterable) {
        return vow.all(iterable);
    },

    /**
     * Returns a promise, that will be fulfilled only after all the items in `iterable` are fulfilled or rejected.
     *
     * @param {Array|Object} iterable
     * @returns {vow:Promise}
     */
    allSettled : function(iterable) {
        return vow.allSettled(iterable);
    },

    /**
     * Returns a promise, that will be fulfilled only when any of the items in `iterable` are fulfilled.
     * If any of the `iterable` items gets rejected, then the returned promise will be rejected.
     *
     * @param {Array} iterable
     * @returns {vow:Promise}
     */
    race : function(iterable) {
        return vow.anyResolved(iterable);
    },

    /**
     * Returns a promise that has already been resolved with the given `value`.
     * If `value` is a promise, the returned promise will have `value`'s state.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    resolve : function(value) {
        return vow.resolve(value);
    },

    /**
     * Returns a promise that has already been rejected with the given `reason`.
     *
     * @param {*} reason
     * @returns {vow:Promise}
     */
    reject : function(reason) {
        return vow.reject(reason);
    }
};

for(var prop in staticMethods) {
    staticMethods.hasOwnProperty(prop) &&
        (Promise[prop] = staticMethods[prop]);
}

var vow = /** @exports vow */ {
    Deferred : Deferred,

    Promise : Promise,

    /**
     * Creates a new deferred. This method is a factory method for `vow:Deferred` class.
     * It's equivalent to `new vow.Deferred()`.
     *
     * @returns {vow:Deferred}
     */
    defer : function() {
        return new Deferred();
    },

    /**
     * Static equivalent to `promise.then`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Function} [onFulfilled] Callback that will be invoked with a provided value after the promise has been fulfilled
     * @param {Function} [onRejected] Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Function} [onProgress] Callback that will be invoked with a provided value after the promise has been notified
     * @param {Object} [ctx] Context of the callbacks execution
     * @returns {vow:Promise}
     */
    when : function(value, onFulfilled, onRejected, onProgress, ctx) {
        return vow.cast(value).then(onFulfilled, onRejected, onProgress, ctx);
    },

    /**
     * Static equivalent to `promise.fail`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Function} onRejected Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    fail : function(value, onRejected, ctx) {
        return vow.when(value, undef, onRejected, ctx);
    },

    /**
     * Static equivalent to `promise.always`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Function} onResolved Callback that will be invoked with the promise as an argument, after the promise has been resolved.
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    always : function(value, onResolved, ctx) {
        return vow.when(value).always(onResolved, ctx);
    },

    /**
     * Static equivalent to `promise.progress`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Function} onProgress Callback that will be invoked with a provided value after the promise has been notified
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    progress : function(value, onProgress, ctx) {
        return vow.when(value).progress(onProgress, ctx);
    },

    /**
     * Static equivalent to `promise.spread`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Function} [onFulfilled] Callback that will be invoked with a provided value after the promise has been fulfilled
     * @param {Function} [onRejected] Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Object} [ctx] Context of the callbacks execution
     * @returns {vow:Promise}
     */
    spread : function(value, onFulfilled, onRejected, ctx) {
        return vow.when(value).spread(onFulfilled, onRejected, ctx);
    },

    /**
     * Static equivalent to `promise.done`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Function} [onFulfilled] Callback that will be invoked with a provided value after the promise has been fulfilled
     * @param {Function} [onRejected] Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Function} [onProgress] Callback that will be invoked with a provided value after the promise has been notified
     * @param {Object} [ctx] Context of the callbacks execution
     */
    done : function(value, onFulfilled, onRejected, onProgress, ctx) {
        vow.when(value).done(onFulfilled, onRejected, onProgress, ctx);
    },

    /**
     * Checks whether the given `value` is a promise-like object
     *
     * @param {*} value
     * @returns {Boolean}
     *
     * @example
     * ```js
     * vow.isPromise('something'); // returns false
     * vow.isPromise(vow.defer().promise()); // returns true
     * vow.isPromise({ then : function() { }); // returns true
     * ```
     */
    isPromise : function(value) {
        return isObject(value) && isFunction(value.then);
    },

    /**
     * Coerces the given `value` to a promise, or returns the `value` if it's already a promise.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    cast : function(value) {
        return value && !!value._vow?
            value :
            vow.resolve(value);
    },

    /**
     * Static equivalent to `promise.valueOf`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @returns {*}
     */
    valueOf : function(value) {
        return value && isFunction(value.valueOf)? value.valueOf() : value;
    },

    /**
     * Static equivalent to `promise.isFulfilled`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @returns {Boolean}
     */
    isFulfilled : function(value) {
        return value && isFunction(value.isFulfilled)? value.isFulfilled() : true;
    },

    /**
     * Static equivalent to `promise.isRejected`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @returns {Boolean}
     */
    isRejected : function(value) {
        return value && isFunction(value.isRejected)? value.isRejected() : false;
    },

    /**
     * Static equivalent to `promise.isResolved`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @returns {Boolean}
     */
    isResolved : function(value) {
        return value && isFunction(value.isResolved)? value.isResolved() : true;
    },

    /**
     * Returns a promise that has already been resolved with the given `value`.
     * If `value` is a promise, the returned promise will have `value`'s state.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    resolve : function(value) {
        var res = vow.defer();
        res.resolve(value);
        return res.promise();
    },

    /**
     * Returns a promise that has already been fulfilled with the given `value`.
     * If `value` is a promise, the returned promise will be fulfilled with the fulfill/rejection value of `value`.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    fulfill : function(value) {
        var defer = vow.defer(),
            promise = defer.promise();

        defer.resolve(value);

        return promise.isFulfilled()?
            promise :
            promise.then(null, function(reason) {
                return reason;
            });
    },

    /**
     * Returns a promise that has already been rejected with the given `reason`.
     * If `reason` is a promise, the returned promise will be rejected with the fulfill/rejection value of `reason`.
     *
     * @param {*} reason
     * @returns {vow:Promise}
     */
    reject : function(reason) {
        var defer = vow.defer();
        defer.reject(reason);
        return defer.promise();
    },

    /**
     * Invokes the given function `fn` with arguments `args`
     *
     * @param {Function} fn
     * @param {...*} [args]
     * @returns {vow:Promise}
     *
     * @example
     * ```js
     * var promise1 = vow.invoke(function(value) {
     *         return value;
     *     }, 'ok'),
     *     promise2 = vow.invoke(function() {
     *         throw Error();
     *     });
     *
     * promise1.isFulfilled(); // true
     * promise1.valueOf(); // 'ok'
     * promise2.isRejected(); // true
     * promise2.valueOf(); // instance of Error
     * ```
     */
    invoke : function(fn, args) {
        var len = Math.max(arguments.length - 1, 0),
            callArgs;
        if(len) { // optimization for V8
            callArgs = Array(len);
            var i = 0;
            while(i < len) {
                callArgs[i++] = arguments[i];
            }
        }

        try {
            return vow.resolve(callArgs?
                fn.apply(global, callArgs) :
                fn.call(global));
        }
        catch(e) {
            return vow.reject(e);
        }
    },

    /**
     * Returns a promise, that will be fulfilled only after all the items in `iterable` are fulfilled.
     * If any of the `iterable` items gets rejected, the promise will be rejected.
     *
     * @param {Array|Object} iterable
     * @returns {vow:Promise}
     *
     * @example
     * with array:
     * ```js
     * var defer1 = vow.defer(),
     *     defer2 = vow.defer();
     *
     * vow.all([defer1.promise(), defer2.promise(), 3])
     *     .then(function(value) {
     *          // value is "[1, 2, 3]" here
     *     });
     *
     * defer1.resolve(1);
     * defer2.resolve(2);
     * ```
     *
     * @example
     * with object:
     * ```js
     * var defer1 = vow.defer(),
     *     defer2 = vow.defer();
     *
     * vow.all({ p1 : defer1.promise(), p2 : defer2.promise(), p3 : 3 })
     *     .then(function(value) {
     *          // value is "{ p1 : 1, p2 : 2, p3 : 3 }" here
     *     });
     *
     * defer1.resolve(1);
     * defer2.resolve(2);
     * ```
     */
    all : function(iterable) {
        var defer = new Deferred(),
            isPromisesArray = isArray(iterable),
            keys = isPromisesArray?
                getArrayKeys(iterable) :
                getObjectKeys(iterable),
            len = keys.length,
            res = isPromisesArray? [] : {};

        if(!len) {
            defer.resolve(res);
            return defer.promise();
        }

        var i = len;
        vow._forEach(
            iterable,
            function(value, idx) {
                res[keys[idx]] = value;
                if(!--i) {
                    defer.resolve(res);
                }
            },
            defer.reject,
            defer.notify,
            defer,
            keys);

        return defer.promise();
    },

    /**
     * Returns a promise, that will be fulfilled only after all the items in `iterable` are resolved.
     *
     * @param {Array|Object} iterable
     * @returns {vow:Promise}
     *
     * @example
     * ```js
     * var defer1 = vow.defer(),
     *     defer2 = vow.defer();
     *
     * vow.allResolved([defer1.promise(), defer2.promise()]).spread(function(promise1, promise2) {
     *     promise1.isRejected(); // returns true
     *     promise1.valueOf(); // returns "'error'"
     *     promise2.isFulfilled(); // returns true
     *     promise2.valueOf(); // returns "'ok'"
     * });
     *
     * defer1.reject('error');
     * defer2.resolve('ok');
     * ```
     */
    allResolved : function(iterable) {
        var defer = new Deferred(),
            isPromisesArray = isArray(iterable),
            keys = isPromisesArray?
                getArrayKeys(iterable) :
                getObjectKeys(iterable),
            i = keys.length,
            res = isPromisesArray? [] : {};

        if(!i) {
            defer.resolve(res);
            return defer.promise();
        }

        var onResolved = function() {
                --i || defer.resolve(iterable);
            };

        vow._forEach(
            iterable,
            onResolved,
            onResolved,
            defer.notify,
            defer,
            keys);

        return defer.promise();
    },

    allSettled : function(iterable) {
        return vow.allResolved(iterable).then(function() {
            var isPromisesArray = isArray(iterable),
                keys = isPromisesArray?
                    getArrayKeys(iterable) :
                    getObjectKeys(iterable),
                res = isPromisesArray? [] : {},
                len = keys.length, i = 0, key, value, item;

            while(i < len) {
                key = keys[i++];
                promise = iterable[key];
                value = promise.valueOf();
                item = promise.isRejected()?
                    { status : 'rejected', reason : value } :
                    { status : 'fulfilled', value : value };

                isPromisesArray?
                    res.push(item) :
                    res[key] = item;
            }

            return res;
        });
    },

    allPatiently : function(iterable) {
        return vow.allResolved(iterable).then(function() {
            var isPromisesArray = isArray(iterable),
                keys = isPromisesArray?
                    getArrayKeys(iterable) :
                    getObjectKeys(iterable),
                rejectedPromises, fulfilledPromises,
                len = keys.length, i = 0, key, promise;

            if(!len) {
                return isPromisesArray? [] : {};
            }

            while(i < len) {
                key = keys[i++];
                promise = iterable[key];
                if(vow.isRejected(promise)) {
                    rejectedPromises || (rejectedPromises = isPromisesArray? [] : {});
                    isPromisesArray?
                        rejectedPromises.push(promise.valueOf()) :
                        rejectedPromises[key] = promise.valueOf();
                }
                else if(!rejectedPromises) {
                    (fulfilledPromises || (fulfilledPromises = isPromisesArray? [] : {}))[key] = vow.valueOf(promise);
                }
            }

            if(rejectedPromises) {
                throw rejectedPromises;
            }

            return fulfilledPromises;
        });
    },

    /**
     * Returns a promise, that will be fulfilled if any of the items in `iterable` is fulfilled.
     * If all of the `iterable` items get rejected, the promise will be rejected (with the reason of the first rejected item).
     *
     * @param {Array} iterable
     * @returns {vow:Promise}
     */
    any : function(iterable) {
        var defer = new Deferred(),
            len = iterable.length;

        if(!len) {
            defer.reject(Error());
            return defer.promise();
        }

        var i = 0, reason;
        vow._forEach(
            iterable,
            defer.resolve,
            function(e) {
                i || (reason = e);
                ++i === len && defer.reject(reason);
            },
            defer.notify,
            defer);

        return defer.promise();
    },

    /**
     * Returns a promise, that will be fulfilled only when any of the items in `iterable` is fulfilled.
     * If any of the `iterable` items gets rejected, the promise will be rejected.
     *
     * @param {Array} iterable
     * @returns {vow:Promise}
     */
    anyResolved : function(iterable) {
        var defer = new Deferred(),
            len = iterable.length;

        if(!len) {
            defer.reject(Error());
            return defer.promise();
        }

        vow._forEach(
            iterable,
            defer.resolve,
            defer.reject,
            defer.notify,
            defer);

        return defer.promise();
    },

    /**
     * Static equivalent to `promise.delay`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Number} delay
     * @returns {vow:Promise}
     */
    delay : function(value, delay) {
        return vow.resolve(value).delay(delay);
    },

    /**
     * Static equivalent to `promise.timeout`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Number} timeout
     * @returns {vow:Promise}
     */
    timeout : function(value, timeout) {
        return vow.resolve(value).timeout(timeout);
    },

    _forEach : function(promises, onFulfilled, onRejected, onProgress, ctx, keys) {
        var len = keys? keys.length : promises.length,
            i = 0;

        while(i < len) {
            vow.when(
                promises[keys? keys[i] : i],
                wrapOnFulfilled(onFulfilled, i),
                onRejected,
                onProgress,
                ctx);
            ++i;
        }
    },

    TimedOutError : defineCustomErrorType('TimedOut')
};

var defineAsGlobal = true;
if(typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = vow;
    defineAsGlobal = false;
}

if(typeof modules === 'object' && isFunction(modules.define)) {
    modules.define('vow', function(provide) {
        provide(vow);
    });
    defineAsGlobal = false;
}

if(typeof define === 'function') {
    define(function(require, exports, module) {
        module.exports = vow;
    });
    defineAsGlobal = false;
}

defineAsGlobal && (global.vow = vow);

})(typeof window !== 'undefined'? window : global);

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("timers").setImmediate)
},{"_process":31,"timers":36}],38:[function(require,module,exports){
"use strict";
var window = require("global/window")
var isFunction = require("is-function")
var parseHeaders = require("parse-headers")
var xtend = require("xtend")

module.exports = createXHR
// Allow use of default import syntax in TypeScript
module.exports.default = createXHR;
createXHR.XMLHttpRequest = window.XMLHttpRequest || noop
createXHR.XDomainRequest = "withCredentials" in (new createXHR.XMLHttpRequest()) ? createXHR.XMLHttpRequest : window.XDomainRequest

forEachArray(["get", "put", "post", "patch", "head", "delete"], function(method) {
    createXHR[method === "delete" ? "del" : method] = function(uri, options, callback) {
        options = initParams(uri, options, callback)
        options.method = method.toUpperCase()
        return _createXHR(options)
    }
})

function forEachArray(array, iterator) {
    for (var i = 0; i < array.length; i++) {
        iterator(array[i])
    }
}

function isEmpty(obj){
    for(var i in obj){
        if(obj.hasOwnProperty(i)) return false
    }
    return true
}

function initParams(uri, options, callback) {
    var params = uri

    if (isFunction(options)) {
        callback = options
        if (typeof uri === "string") {
            params = {uri:uri}
        }
    } else {
        params = xtend(options, {uri: uri})
    }

    params.callback = callback
    return params
}

function createXHR(uri, options, callback) {
    options = initParams(uri, options, callback)
    return _createXHR(options)
}

function _createXHR(options) {
    if(typeof options.callback === "undefined"){
        throw new Error("callback argument missing")
    }

    var called = false
    var callback = function cbOnce(err, response, body){
        if(!called){
            called = true
            options.callback(err, response, body)
        }
    }

    function readystatechange() {
        if (xhr.readyState === 4) {
            setTimeout(loadFunc, 0)
        }
    }

    function getBody() {
        // Chrome with requestType=blob throws errors arround when even testing access to responseText
        var body = undefined

        if (xhr.response) {
            body = xhr.response
        } else {
            body = xhr.responseText || getXml(xhr)
        }

        if (isJson) {
            try {
                body = JSON.parse(body)
            } catch (e) {}
        }

        return body
    }

    function errorFunc(evt) {
        clearTimeout(timeoutTimer)
        if(!(evt instanceof Error)){
            evt = new Error("" + (evt || "Unknown XMLHttpRequest Error") )
        }
        evt.statusCode = 0
        return callback(evt, failureResponse)
    }

    // will load the data & process the response in a special response object
    function loadFunc() {
        if (aborted) return
        var status
        clearTimeout(timeoutTimer)
        if(options.useXDR && xhr.status===undefined) {
            //IE8 CORS GET successful response doesn't have a status field, but body is fine
            status = 200
        } else {
            status = (xhr.status === 1223 ? 204 : xhr.status)
        }
        var response = failureResponse
        var err = null

        if (status !== 0){
            response = {
                body: getBody(),
                statusCode: status,
                method: method,
                headers: {},
                url: uri,
                rawRequest: xhr
            }
            if(xhr.getAllResponseHeaders){ //remember xhr can in fact be XDR for CORS in IE
                response.headers = parseHeaders(xhr.getAllResponseHeaders())
            }
        } else {
            err = new Error("Internal XMLHttpRequest Error")
        }
        return callback(err, response, response.body)
    }

    var xhr = options.xhr || null

    if (!xhr) {
        if (options.cors || options.useXDR) {
            xhr = new createXHR.XDomainRequest()
        }else{
            xhr = new createXHR.XMLHttpRequest()
        }
    }

    var key
    var aborted
    var uri = xhr.url = options.uri || options.url
    var method = xhr.method = options.method || "GET"
    var body = options.body || options.data
    var headers = xhr.headers = options.headers || {}
    var sync = !!options.sync
    var isJson = false
    var timeoutTimer
    var failureResponse = {
        body: undefined,
        headers: {},
        statusCode: 0,
        method: method,
        url: uri,
        rawRequest: xhr
    }

    if ("json" in options && options.json !== false) {
        isJson = true
        headers["accept"] || headers["Accept"] || (headers["Accept"] = "application/json") //Don't override existing accept header declared by user
        if (method !== "GET" && method !== "HEAD") {
            headers["content-type"] || headers["Content-Type"] || (headers["Content-Type"] = "application/json") //Don't override existing accept header declared by user
            body = JSON.stringify(options.json === true ? body : options.json)
        }
    }

    xhr.onreadystatechange = readystatechange
    xhr.onload = loadFunc
    xhr.onerror = errorFunc
    // IE9 must have onprogress be set to a unique function.
    xhr.onprogress = function () {
        // IE must die
    }
    xhr.onabort = function(){
        aborted = true;
    }
    xhr.ontimeout = errorFunc
    xhr.open(method, uri, !sync, options.username, options.password)
    //has to be after open
    if(!sync) {
        xhr.withCredentials = !!options.withCredentials
    }
    // Cannot set timeout with sync request
    // not setting timeout on the xhr object, because of old webkits etc. not handling that correctly
    // both npm's request and jquery 1.x use this kind of timeout, so this is being consistent
    if (!sync && options.timeout > 0 ) {
        timeoutTimer = setTimeout(function(){
            if (aborted) return
            aborted = true//IE9 may still call readystatechange
            xhr.abort("timeout")
            var e = new Error("XMLHttpRequest timeout")
            e.code = "ETIMEDOUT"
            errorFunc(e)
        }, options.timeout )
    }

    if (xhr.setRequestHeader) {
        for(key in headers){
            if(headers.hasOwnProperty(key)){
                xhr.setRequestHeader(key, headers[key])
            }
        }
    } else if (options.headers && !isEmpty(options.headers)) {
        throw new Error("Headers cannot be set on an XDomainRequest object")
    }

    if ("responseType" in options) {
        xhr.responseType = options.responseType
    }

    if ("beforeSend" in options &&
        typeof options.beforeSend === "function"
    ) {
        options.beforeSend(xhr)
    }

    // Microsoft Edge browser sends "undefined" when send is called with undefined value.
    // XMLHttpRequest spec says to pass null as body to indicate no body
    // See https://github.com/naugtur/xhr/issues/100.
    xhr.send(body || null)

    return xhr


}

function getXml(xhr) {
    // xhr.responseXML will throw Exception "InvalidStateError" or "DOMException"
    // See https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseXML.
    try {
        if (xhr.responseType === "document") {
            return xhr.responseXML
        }
        var firefoxBugTakenEffect = xhr.responseXML && xhr.responseXML.documentElement.nodeName === "parsererror"
        if (xhr.responseType === "" && !firefoxBugTakenEffect) {
            return xhr.responseXML
        }
    } catch (e) {}

    return null
}

function noop() {}

},{"global/window":23,"is-function":26,"parse-headers":30,"xtend":39}],39:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],"biojs-vis-sam":[function(require,module,exports){
module.exports = require("./lib/biojsvissam");
//module.exports = require("./lib/biojsvissamregionlist");


},{"./lib/biojsvissam":1}]},{},[]);
