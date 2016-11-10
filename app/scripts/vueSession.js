'use strict';
var vcSessionsManagement = (function(Vue) {
  var vmInstance_;

  return {
    init: function() {
      vmInstance_ = new Vue({
        el: '#cohort-component',
        data: {
          selectedPatientsNum: 0,
          selectedSamplesNum: 0,
          userid: 'DEFAULT',
          showSaveButton: true,
          showManageButton: true,
          cohortData: {},
          stats: {},
          updateStats: false
        },
        watch: {
          updateStats: function(newVal) {
            if (newVal) {
              var self_ = this;
              $.ajax({
                url: '/data/sample.json',
                dataType: 'json',
                async: false,
                success: function(_data) {
                  self_.stats = {};
                  self_.selectedSamplesNum = _data.samplesLength;
                  self_.selectedPatientsNum = _data.patientsLength;
                  self_.updateStats = false;
                }
              });
            }
          }
        }
      });
    },
    getInstance: function() {
      if (typeof vmInstance_ === 'undefined') {
        this.init();
      }
      return vmInstance_;
    }
  };
})(window.Vue);