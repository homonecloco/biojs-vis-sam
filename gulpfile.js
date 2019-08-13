/*
 * biojs-vis-blast
 * https://github.com/homonecloco/biojs-vis-sam
 *
 * Copyright (c) 2014Ricardo H. Ramirez-Gonzalez 
 * Licensed under the Apache 2 license.
 */


// browserify build config
var buildDir = "build";
var outputFile = "biojs-vis-sam";

// packages
var gulp   = require('gulp');

// browser builds
var browserify = require('browserify');
var watchify = require('watchify')
var uglify = require('gulp-uglify');


// testing
var mocha = require('gulp-mocha'); 


// code style 

// gulp helper
var source = require('vinyl-source-stream'); // converts node streams into vinyl streams
var gzip = require('gulp-gzip');
var rename = require('gulp-rename');
var chmod = require('gulp-chmod');
var streamify = require('gulp-streamify'); // converts streams into buffers (legacy support for old plugins)
var watch = require('gulp-watch');

// path tools
var fs = require('fs');
var path = require('path');
var join = path.join;
var mkdirp = require('mkdirp');
var del = require('del');

// auto config
var outputFileMin = join(buildDir,outputFile + ".min.js");
var packageConfig = require('./package.json');

// will remove everything in build
gulp.task('clean', function(cb) {
  console.log("clean-------")
  del([buildDir], cb);
  cb();
});

// just makes sure that the build dir exists
gulp.task('init', function(done){
  mkdirp(buildDir, function (err) {
    if (err) console.error(err)
  });
  console.log("In init!");
  done();
});


// browserify debug
gulp.task('build-browser-exec',function(done) {
  var b = browserify({debug: true,hasExports: true});
  exposeBundles(b);
  return b.bundle().on('error', console.error)
    .pipe(source(outputFile + ".js"))
    .pipe(chmod(644))
    .pipe(gulp.dest(buildDir));
});

gulp.task('build-browser-min-exec', function() {
  var b = browserify({hasExports: true, standalone: "biojs-vis-bam", debug:false});
  exposeBundles(b);
  return b.bundle()
    .pipe(source(outputFile + ".min.js"))
    .pipe(chmod(644))
    .pipe(streamify(uglify()))
    .pipe(gulp.dest(buildDir));
});

gulp.task('build-browser', gulp.series(['init', 'build-browser-exec']));
gulp.task('build-browser-min', gulp.series(['init', 'build-browser-min-exec']));

// browserify min
 
gulp.task('build-browser-gzip', gulp.series('build-browser-min'), function() {
  return gulp.src(outputFileMin)
    .pipe(gzip({append: false, gzipOptions: { level: 9 }}))
    .pipe(rename(outputFile + ".min.gz.js"))
    .pipe(gulp.dest(buildDir));
});

gulp.task('test-unit', function () {
    return gulp.src('./test/unit/**/*.js', {read: false})
        .pipe(mocha({reporter: 'spec',
                    useColors: true}));
});

gulp.task('test', gulp.series(['test-unit']));
// a failing test breaks the whole build chain
//gulp.task('build', gulp.series('build-browser'));
gulp.task('build', gulp.series(['build-browser', 'build-browser-gzip']));

gulp.task('default', gulp.series(['test',  'build']));

gulp.task('test-watch', function() {
   gulp.watch(['./src/**/*.js','./lib/**/*.js', './test/**/*.js'], function() {
     gulp.run('test');
   });
});

// exposes the main package
// + checks the config whether it should expose other packages
function exposeBundles(b){
  b.add('./index.js', {expose: packageConfig.name });
  if(packageConfig.sniper !== undefined && packageConfig.sniper.exposed !== undefined){
    for(var i=0; i<packageConfig.sniper.exposed.length; i++){
      b.require(packageConfig.sniper.exposed[i]);
      //write(i);
    }
  }
}

// watch task for browserify 
// watchify has an internal cache -> subsequent builds are faster
gulp.task('watch', function() {
  var util = require('gulp-util')

  var b = browserify({debug: true,hasExports: true, cache: {}, packageCache: {} });
  b.add('./index.js', {expose: packageConfig.name});
  // expose other bundles
  exposeBundles(b);

  function rebundle(ids){
    b.bundle()
    .on("error", function(error) {
      util.log(util.colors.red("Error: "), error);
     })
    .pipe(source(outputFile + ".js"))
    .pipe(chmod(644))
    .pipe(gulp.dest(buildDir));
  }

  var watcher = watchify(b);
  watcher.on("update", rebundle)
   .on("log", function(message) {
      util.log("Refreshed:", message);
  });
  return rebundle();
});
