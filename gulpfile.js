'use strict';

const gulp = require('gulp');
const mocha = require('gulp-mocha');
const istanbul = require('gulp-istanbul');
const isparta = require('isparta');
const eslint = require('gulp-eslint');
const checkDeps = require('gulp-check-deps');

const coreSourceFiles = ['lib/**/*.js'];
const testSourceFiles = ['test/**/*.spec.js'];
const allFiles = coreSourceFiles.concat(testSourceFiles);

gulp.task('pre-test', function () {
  return gulp.src(coreSourceFiles)
             // Covering files
             .pipe(istanbul({
               instrumenter: isparta.Instrumenter,
               includeUntested: true
             }))
             // Force `require` to return covered files
             .pipe(istanbul.hookRequire());
});

gulp.task('test', ['pre-test'], function () {

  return gulp.src(testSourceFiles)
             .pipe(mocha())
             .pipe(istanbul.writeReports())
             .pipe(istanbul.enforceThresholds({
               thresholds: {
                 // TODO: Make as close to 100% as possible
                 global: 85
               }
             }));
});

gulp.task('lint', function () {
  return gulp.src(allFiles)
             .pipe(eslint())
             .pipe(eslint.format())
             .pipe(eslint.failAfterError());
});

gulp.task('check-deps', function () {
  return gulp.src('package.json')
             .pipe(checkDeps());
});

gulp.task('check', ['lint', 'check-deps']);

gulp.task('default', ['test', 'check']);
