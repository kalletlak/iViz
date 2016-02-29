
(function () {
  'use strict';

  angular
    .module('iViz')
    .config(localStorageServiceProvider);

  localStorageServiceProvider.$inject = ['localStorageServiceProvider'];
  function localStorageServiceProvider(localStorageServiceProvider) {
    localStorageServiceProvider.setPrefix('iVixLS');
  }


})();


