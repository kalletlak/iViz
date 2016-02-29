/**=========================================================
 * Module: ApplicationRun.js
 =========================================================*/

(function() {
    'use strict';

    angular
        .module('iViz')
        .run(appRun);


    function appRun(editableOptions) {

      editableOptions.theme = 'bs3';

    }

})();

