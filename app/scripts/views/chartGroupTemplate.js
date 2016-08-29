/**
 * Created by Karthik Kalletla on 4/6/16.
 */
'use strict';
(function(Vue, dc, iViz, crossfilter, _) {
  Vue.component('chartGroup', {
    template: ' <div is="individual-chart"' +
    ' :ndx="ndx" :groupid="groupid"' +
    ' :attributes.sync="attribute" v-for="attribute in attributes"></div>',
    props: [
      'attributes', 'type', 'id', 'groupid', 'redrawgroups', 'mappedcases'
    ], created: function() {
      // TODO: update this.data
      var _self = this;
      var data_ = iViz.getAttrData(this.type);
      var ndx_ = crossfilter(data_);
      this.invisibleBridgeDimension = ndx_.dimension(function(d) {
        return d[_self.type + '_id'];
      });
      this.groupid = this.id;
      this.ndx = ndx_;
      this.invisibleChartFilters = [];

      if (this.mappedcases !== undefined && this.mappedcases.length > 0) {
        this.$nextTick(function() {
          _self.updateInvisibleChart(_self.mappedcases);
        });
      }
    }, destroyed: function() {
      dc.chartRegistry.clear(this.groupid);
    },
    data: function() {
      return {
        clearGroup: false,
        syncCases: true
      };
    },
    watch: {
      mappedcases: function(val) {
        if (this.syncCases) {
          this.updateInvisibleChart(val);
        } else {
          this.syncCases = true;
        }
      }
    },
    events: {
      'clear-group': function() {
        this.clearGroup = true;
        this.invisibleBridgeDimension.filterAll();
        this.invisibleChartFilters = [];
        iViz.deleteGroupFilteredCases(this.id);
        this.$broadcast('clear-chart-filters');
        var self_ = this;
        this.$nextTick(function() {
          self_.clearGroup = false;
        });
      },
      /*
       *This event is invoked whenever there is a filter update on any chart
       * STEPS involved
       *
       * 1. Clear filters on invisible group bridge chart
       * 2. Get all the filtered cases fot that particular chart group
       * 3. If those filtered cases length not same as original cases length
       *    then save that case list in the groupFilterMap
       * 4. Apply back invisible group bridge chart filters
       */
      'update-filters': function() {
        if (!this.clearGroup) {
          this.syncCases = false;
          if (this.invisibleChartFilters.length > 0) {
            this.invisibleBridgeDimension.filterAll();
          }
          var filteredCases = _.pluck(
            this.invisibleBridgeDimension.top(Infinity),
            this.type + '_id').sort();
          // Hacked way to check if filter selected filter cases is same
          // as original case list
          if (filteredCases.length === this.ndx.size()) {
            iViz.deleteGroupFilteredCases(this.id);
          } else {
            iViz.setGroupFilteredCases(this.id, this.type, filteredCases);
          }

          if (this.invisibleChartFilters.length > 0) {
            var filtersMap = {};
            _.each(this.invisibleChartFilters, function(filter) {
              if (filtersMap[filter] === undefined) {
                filtersMap[filter] = true;
              }
            });
            this.invisibleBridgeDimension.filterFunction(function(d) {
              return (filtersMap[d] !== undefined);
            });
          }
          this.$dispatch('update-all-filters', this.type);
        }
      }
    },
    methods: {
      updateInvisibleChart: function(val) {
        var _groupCases = iViz.getGroupFilteredCases();
        var _selectedCases = val;
        var _self = this;
        _.each(_groupCases, function(_group, id) {
          if (_group !== undefined && _group.type === _self.type &&
            (_self.id.toString() !== id)) {
            _selectedCases =
              iViz.util.intersection(_selectedCases, _group.cases);
          }
        });
        this.invisibleChartFilters = [];
        this.invisibleBridgeDimension.filterAll();
        if (_selectedCases.length > 0) {
          this.invisibleChartFilters = _selectedCases;
          var filtersMap = {};
          _.each(_selectedCases, function(filter) {
            if (filtersMap[filter] === undefined) {
              filtersMap[filter] = true;
            }
          });
          this.invisibleBridgeDimension.filterFunction(function(d) {
            return (filtersMap[d] !== undefined);
          });
        }
        this.redrawgroups.push(this.id);
      }
    }
  });
})(
  window.Vue,
  window.dc,
  window.iViz,
  window.crossfilter,
  window._
);
