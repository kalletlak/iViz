
(function() {
    'use strict';

/**************
  GUID generator
**************/
  var generateUUID = function() {
    var d = new Date().getTime();
    if(window.performance && typeof window.performance.now === 'function'){
        d += window.performance.now();
    }
    var uuid = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c)      {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c==='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
  };
// Session object prototype
  var virtualStudy = {
    id : '',
    color : 'white',
    studyName : 'My virtual study',
    studyPatientMap: '',
    studySampleMap: '',
    scope:'DEFAULT',
    description:'My virtual study - Description',
    sampleFilters:'',
    patientFilters:'',
    samplesLength:'',
    patientsLength:''
  };
  var sutdySampleMap = {
    studyID : '',
    samples : []
  };
  var sutdyPatientMap = {
    studyID : '',
    patients : []
  };

  angular
    .module('iViz')
    .controller('CoreController', CoreController);

    /* @ngInject */
    function CoreController($scope, ModalService, $filter, $http,localStorageService) {
    $scope.virtualStudies = localStorageService.get('virtualStudies') || [];
    $scope.$watch('virtualStudies', function () {
      localStorageService.set('virtualStudies', $scope.virtualStudies);
    }, true);


      $scope.show = function() {
        ModalService.showModal({
            templateUrl: 'views/modal.html',
            controller: "ModalController"
        }).then(function(modal) {
            modal.element.modal();
           
        });
    };

    $scope.addVirtualStudy = function (selected_patients,selected_samples,patient_charts_inst_filters,sample_charts_inst_filters) {
        var _virtualStudy = $.extend( true,{}, virtualStudy);
       
       
        _virtualStudy.id = generateUUID();
        _virtualStudy.sampleFilters = JSON.stringify(sample_charts_inst_filters);
        _virtualStudy.patientFilters = JSON.stringify(patient_charts_inst_filters);
        _virtualStudy.samplesLength = selected_samples.length;
        _virtualStudy.patientsLength = selected_patients.length;

        var _sutdyPatientMap = $.extend( true,{}, sutdyPatientMap);
        _sutdyPatientMap.studyID='-';
        _sutdyPatientMap.patients=selected_patients;
        _virtualStudy.studyPatientMap = _sutdyPatientMap;
    
        var _sutdySampleMap = $.extend( true,{}, sutdySampleMap);
        _sutdySampleMap.studyID='-';
        _sutdySampleMap.samples=selected_samples;
        _virtualStudy.studySampleMap = _sutdySampleMap;
        //var jsonData = JSON.stringify(_virtualStudy);
        $scope.virtualStudies.push(_virtualStudy);

        if(localStorageService.get("sessionID")==null){
          console.log("session is not null");
           /*$http.get("http://localhost:8080/api/sessions/",{headers: {
                "Accept":"application/json",
                "Access-Control-Allow-Origin": "*"
            }}).success(function(data, status) {
            });*/
        }else{
           console.log("session is null");
        }
    };
  }
  CoreController.$inject = ['$scope', 'ModalService', '$filter', '$http','localStorageService'];

})();
