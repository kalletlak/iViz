(function() {
    'use strict';

    angular
        .module('iViz')
        .controller('ModalController', function($scope, $filter, $http,localStorageService) {
          var tmparr = [];
          $scope.vcList = localStorageService.get('virtualStudies');

          //Update virtual cohort
          $scope.saveVC = function(data, id,index) {
            var tempLS = localStorageService.get('virtualStudies');
            tempLS[index].studyName = data.studyName;
            tempLS[index].description = data.description;
            localStorageService.set('virtualStudies', tempLS);
            /*
              TODO : Take it to iViz page
            */
            //angular.extend(data, {});
            //return $http.post('/saveVC', data);
          };

          // remove virtual cohort
          $scope.removeVC = function(index) {
            $scope.vcList.splice(index, 1);
            localStorageService.set('virtualStudies', $scope.vcList);
          };

          // add virtual cohort
          $scope.addVC = function() {
              /*
              TODO : Take it to iViz page
              */
          };
          // share virtual cohort
          $scope.shareVC = function(index) {
              /*
              TODO : Share
              */
          };
          // filter virtual cohort
          $scope.filterVC = function(index) {
              /*
              TODO : redirect to iViz page and apply filters
              */
          };
      });

})();
