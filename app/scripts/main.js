'use strict';
var iViz = (function(_, $, cbio, QueryByGeneUtil, QueryByGeneTextArea) {
  var data_;
  var vm_;
  var tableData_ = [];
  var groupFiltersMap_ = {};
  var groupNdxMap_ = {};
  var charts = {};
  var configs_ = {
    styles: {
      vars: {
        width: {
          one: 195,
          two: 400
        },
        height: {
          one: 170,
          two: 350
        },
        chartHeader: 17,
        borderWidth: 2,
        scatter: {
          width: 398,
          height: 331
        },
        survival: {
          width: 398,
          height: 331
        },
        specialTables: {
          width: 398,
          height: 306
        },
        piechart: {
          width: 140,
          height: 140
        },
        barchart: {
          width: 398,
          height: 134
        }
      }
    },
    numOfSurvivalCurveLimit: 20,
    dc: {
      transitionDuration: 400
    }
  };

  return {

    init: function(_rawDataJSON, configs) {
      vm_ = iViz.vue.manage.getInstance();

      data_ = _rawDataJSON;

      if (_.isObject(configs)) {
        configs_ = $.extend(true, configs_, configs);
      }

      var chartsCount = 0;
      var patientChartsCount = 0;
      var groupAttrs = [];
      var groups = [];

      _.each(data_.groups.patient.attr_meta, function(attrData) {
        attrData.group_type = 'patient';
        if (chartsCount < 20 && patientChartsCount < 10) {
          if (attrData.show) {
            attrData.group_id = vm_.groupCount;
            groupAttrs.push(attrData);
            chartsCount++;
            patientChartsCount++;
          }
        } else {
          attrData.show = false;
        }
        charts[attrData.attr_id] = attrData;
        if (attrData.view_type === 'survival' && attrData.show) {
          vm_.numOfSurvivalPlots++;
        }
      });
      groups.push({
        type: 'patient',
        id: vm_.groupCount,
        selectedcases: [],
        hasfilters: false,
        attributes: groupAttrs});

      groupAttrs = [];
      vm_.groupCount += 1;
      _.each(data_.groups.sample.attr_meta, function(attrData) {
        attrData.group_type = 'sample';
        if (chartsCount < 20) {
          if (attrData.show) {
            attrData.group_id = vm_.groupCount;
            groupAttrs.push(attrData);
            chartsCount++;
          }
        } else {
          attrData.show = false;
        }
        charts[attrData.attr_id] = attrData;
      });

      groups.push({
        type: 'sample',
        id: vm_.groupCount,
        selectedcases: [],
        hasfilters: false,
        attributes: groupAttrs});
      vm_.groupCount += 1;
      var _self = this;
      var requests = groups.map(function(group) {
        var _def = new $.Deferred();
        _self.createGroupNdx(group).then(function() {
          _def.resolve();
        }).fail(function() {
          _def.reject();
        });
        return _def.promise();
      });
      $.when.apply($, requests).then(function() {
        vm_.isloading = false;
        vm_.selectedsampleUIDs = _.pluck(data_.groups.sample.data, 'sample_uid');
        vm_.selectedpatientUIDs = _.pluck(data_.groups.patient.data, 'patient_uid');
        vm_.groups = groups;
        vm_.charts = charts;
        vm_.$nextTick(function() {
          _self.fetchCompleteData('patient');
          _self.fetchCompleteData('sample');
        });
      });
    }, // ---- close init function ----groups
    createGroupNdx: function(group) {
      var def = new $.Deferred();
      var _caseAttrId = group.type === 'patient' ? 'patient_uid' : 'sample_uid';
      var _attrIds = [_caseAttrId, 'study_id'];
      _attrIds = _attrIds.concat(_.pluck(group.attributes, 'attr_id'));
      $.when(iViz.getDataWithAttrs(group.type, _attrIds)).then(function(selectedData_) {
        groupNdxMap_[group.id] = {};
        groupNdxMap_[group.id].type = group.type;
        groupNdxMap_[group.id].data = selectedData_;
        groupNdxMap_[group.id].attributes = _attrIds;
        def.resolve();
      });
      return def.promise();
    },
    updateGroupNdx: function(groupId, attrId) {
      var def = new $.Deferred();
      var groupNdxData_ = groupNdxMap_[groupId];
      var attrIds = groupNdxData_.attributes;
      if (attrIds.indexOf(attrId) > -1) {
        def.resolve(false);
      } else {
        attrIds.push(attrId);
        $.when(iViz.getDataWithAttrs(groupNdxData_.type, attrIds)).then(function(selectedData_) {
          groupNdxData_.data = selectedData_;
          def.resolve(true);
        });
      }
      return def.promise();
    },
    getGroupNdx: function(groupId) {
      return groupNdxMap_[groupId].data;
    },
    setGroupFilteredCases: function(groupId_, type_, filters_) {
      groupFiltersMap_[groupId_] = {};
      groupFiltersMap_[groupId_].type = type_;
      groupFiltersMap_[groupId_].cases = filters_;
    },
    getGroupFilteredCases: function(groupId_) {
      if (groupId_ !== undefined) {
        return groupFiltersMap_[groupId_];
      }
      return groupFiltersMap_;
    },
    deleteGroupFilteredCases: function(groupId_) {
      groupFiltersMap_[groupId_] = undefined;
    },
    getDataWithAttrs: function(type, attrIds) {
      var def = new $.Deferred();
      var isPatientAttributes = (type === 'patient');
      var hasAttrDataMap = isPatientAttributes ? data_.groups.patient.has_attr_data : data_.groups.sample.has_attr_data;
      var attrDataToGet = [];
      var updatedAttrIds = [];
      _.each(attrIds, function(_attrId) {
        if (charts[_attrId] === undefined) {
          updatedAttrIds = updatedAttrIds.concat(_attrId);
        } else {
          updatedAttrIds = updatedAttrIds.concat(charts[_attrId].attrList);
        }
      });
      updatedAttrIds = iViz.util.unique(updatedAttrIds);
      _.each(updatedAttrIds, function(attrId) {
        if (hasAttrDataMap[attrId] === undefined) {
          attrDataToGet.push(attrId);
        }
      });
      var _def = new $.Deferred();
      $.when(_def).done(function() {
        var _data = isPatientAttributes ? data_.groups.patient.data : data_.groups.sample.data;
        var toReturn = [];
        _.each(_data, function(_caseData, _index) {
          toReturn[_index] = _.pick(_caseData, updatedAttrIds);
        });
        def.resolve(toReturn);
      });
      if (attrDataToGet.length > 0) {
        $.when(this.updateDataObject(type, attrDataToGet))
          .then(function() {
            _def.resolve();
          }, function() {
            _def.reject();
          });
      } else {
        _def.resolve();
      }
      return def.promise();
    },
    fetchCompleteData: function(_type, _processData) {
      var _def = new $.Deferred();
      var _attrIds = _.pluck(_.filter(charts, function(_chart) {
        return _chart.group_type === _type;
      }), 'attr_id');
      if (_processData) {
        $.when(iViz.getDataWithAttrs(_type, _attrIds))
          .then(function() {
            _def.resolve();
          }, function() {
            _def.reject();
          });
      } else {
        $.when(window.iviz.datamanager.getClinicalData(_attrIds, (_type === 'patient')))
          .then(function() {
            _def.resolve();
          }, function() {
            _def.reject();
          });
      }
      return _def.promise();
    },
    updateDataObject: function(type, attrIds) {
      var def = new $.Deferred();
      var self_ = this;
      var isPatientAttributes = (type === 'patient');
      var _data = isPatientAttributes ? data_.groups.patient.data : data_.groups.sample.data;
      var hasAttrDataMap = isPatientAttributes ?
        data_.groups.patient.has_attr_data : data_.groups.sample.has_attr_data;

      $.when(
        window.iviz.datamanager.getClinicalData(attrIds, isPatientAttributes))
        .then(function(clinicalData) {
          var idType = isPatientAttributes ? 'patient_id' : 'sample_id';
          var type = isPatientAttributes ? 'patient' : 'sample';
          _.each(clinicalData, function(_clinicalAttributeData, _attrId) {
            var selectedAttrMeta = charts[_attrId];

            hasAttrDataMap[_attrId] = '';
            selectedAttrMeta.keys = {};
            selectedAttrMeta.numOfDatum = 0;

            _.each(_clinicalAttributeData, function(_dataObj) {
              _data[self_.getCaseIndex(type, _dataObj.study_id, _dataObj[idType])][_dataObj.attr_id] = _dataObj.attr_val;

              if (!selectedAttrMeta.keys
                  .hasOwnProperty(_dataObj.attr_val)) {
                selectedAttrMeta.keys[_dataObj.attr_val] = 0;
              }
              ++selectedAttrMeta.keys[_dataObj.attr_val];
              ++selectedAttrMeta.numOfDatum;
            });
          });

          def.resolve();
        }, function() {
          def.reject();
        });
      return def.promise();
    },
    extractMutationData: function(_mutationData) {
      var _mutGeneMeta = {};
      var _mutGeneMetaIndex = 0;
      var self = this;
      _.each(_mutationData, function(_mutGeneDataObj) {
        var _uniqueId = _mutGeneDataObj.gene_symbol;
        _.each(_mutGeneDataObj.caseIds, function(_caseId) {
          var _caseUIdIndex = self.getCaseIndex('sample', _mutGeneDataObj.study_id, _caseId);
          if (_mutGeneMeta[_uniqueId] === undefined) {
            _mutGeneMeta[_uniqueId] = {};
            _mutGeneMeta[_uniqueId].gene = _uniqueId;
            _mutGeneMeta[_uniqueId].num_muts = 1;
            _mutGeneMeta[_uniqueId].case_uids = [_caseUIdIndex];
            _mutGeneMeta[_uniqueId].qval = (window.iviz.datamanager.getCancerStudyIds().length === 1 && _mutGeneDataObj.hasOwnProperty('qval')) ? _mutGeneDataObj.qval : null;
            _mutGeneMeta[_uniqueId].index = _mutGeneMetaIndex;
            if (data_.groups.sample.data[_caseUIdIndex].mutated_genes === undefined) {
              data_.groups.sample.data[_caseUIdIndex].mutated_genes = [_mutGeneMetaIndex];
            } else {
              data_.groups.sample.data[_caseUIdIndex].mutated_genes.push(_mutGeneMetaIndex);
            }
            _mutGeneMetaIndex += 1;
          } else {
            _mutGeneMeta[_uniqueId].num_muts += 1;
            _mutGeneMeta[_uniqueId].case_uids.push(_caseUIdIndex);
            if (data_.groups.sample.data[_caseUIdIndex].mutated_genes === undefined) {
              data_.groups.sample.data[_caseUIdIndex].mutated_genes = [_mutGeneMeta[_uniqueId].index];
            } else {
              data_.groups.sample.data[_caseUIdIndex].mutated_genes.push(_mutGeneMeta[_uniqueId].index);
            }
          }
        });
      });
      tableData_.mutated_genes = {};
      tableData_.mutated_genes.geneMeta = _mutGeneMeta;
      return tableData_.mutated_genes;
    },
    extractCnaData: function(_cnaData) {
      var _cnaMeta = {};
      var _cnaMetaIndex = 0;
      var self = this;
      $.each(_cnaData, function(_studyId, _cnaDataPerStudy) {
        $.each(_cnaDataPerStudy.caseIds, function(_index, _caseIdsPerGene) {
          var _geneSymbol = _cnaDataPerStudy.gene[_index];
          var _altType = '';
          switch (_cnaDataPerStudy.alter[_index]) {
            case -2:
              _altType = 'DEL';
              break;
            case 2:
              _altType = 'AMP';
              break;
            default:
              break;
          }
          var _uniqueId = _geneSymbol + '-' + _altType;
          _.each(_caseIdsPerGene, function(_caseId) {
            var _caseIdIndex = self.getCaseIndex('sample', _studyId, _caseId);
            if (_cnaMeta[_uniqueId] === undefined) {
              _cnaMeta[_uniqueId] = {};
              _cnaMeta[_uniqueId].gene = _geneSymbol;
              _cnaMeta[_uniqueId].cna = _altType;
              _cnaMeta[_uniqueId].cytoband = _cnaDataPerStudy.cytoband[_index];
              _cnaMeta[_uniqueId].case_uids = [_caseIdIndex];
              if ((window.iviz.datamanager.getCancerStudyIds().length !== 1) || _cnaDataPerStudy.gistic[_index] === null) {
                _cnaMeta[_uniqueId].qval = null;
              } else {
                _cnaMeta[_uniqueId].qval = _cnaDataPerStudy.gistic[_index][0];
              }
              _cnaMeta[_uniqueId].index = _cnaMetaIndex;
              if (data_.groups.sample.data[_caseIdIndex].cna_details === undefined) {
                data_.groups.sample.data[_caseIdIndex].cna_details = [_cnaMetaIndex];
              } else {
                data_.groups.sample.data[_caseIdIndex].cna_details.push(_cnaMetaIndex);
              }
              _cnaMetaIndex += 1;
            } else {
              _cnaMeta[_uniqueId].case_uids.push(_caseIdIndex);
              if (data_.groups.sample.data[_caseIdIndex].cna_details === undefined) {
                data_.groups.sample.data[_caseIdIndex].cna_details = [_cnaMeta[_uniqueId].index];
              } else {
                data_.groups.sample.data[_caseIdIndex].cna_details.push(_cnaMeta[_uniqueId].index);
              }
            }
          });
        });
      });
      tableData_.cna_details = {};
      tableData_.cna_details.geneMeta = _cnaMeta;
      return tableData_.cna_details;
    },
    getTableData: function(attrId) {
      var def = new $.Deferred();
      var self = this;
      if (tableData_[attrId] === undefined) {
        if (attrId === 'mutated_genes') {
          $.when(window.iviz.datamanager.getMutData())
            .then(function(_data) {
              def.resolve(self.extractMutationData(_data));
            }, function() {
              def.reject();
            });
        } else if (attrId === 'cna_details') {
          $.when(window.iviz.datamanager.getCnaData())
            .then(function(_data) {
              def.resolve(self.extractCnaData(_data));
            }, function() {
              def.reject();
            });
        }
      } else {
        def.resolve(tableData_[attrId]);
      }
      return def.promise();
    },
    getCasesMap: function(type) {
      if (type === 'sample') {
        return data_.groups.group_mapping.sample_to_patient;
      }
      return data_.groups.group_mapping.patient_to_sample;
    },
    getCaseUIDs: function(type) {
      return Object.keys(this.getCasesMap(type));
    },
    getCaseIndex: function(type, study_id, case_id) {
      if (type === 'sample') {
        return data_.groups.group_mapping.studyMap[study_id].sample_to_uid[case_id];
      }
      return data_.groups.group_mapping.studyMap[study_id].patient_to_uid[case_id];
    },
    getCaseUID: function(type, case_id) {
      return Object.keys(data_.groups.group_mapping.studyMap).reduce(function(a, b) {
        var _uid = data_.groups.group_mapping.studyMap[b][type + '_to_uid'][case_id];
        return (_uid === undefined) ? a : a.concat(_uid);
      }, []);
    },
    getCaseIdUsingUID: function(type, study_id, case_uid) {
      if (type === 'sample') {
        return data_.groups.group_mapping.studyMap[study_id].uid_to_sample[case_uid];
      }
      return data_.groups.group_mapping.studyMap[study_id].uid_to_patient[case_uid];
    },
    getPatientUIDs: function(sampleUID) {
      return this.getCasesMap('sample')[sampleUID];
    },
    getSampleUIDs: function(patientUID) {
      return this.getCasesMap('patient')[patientUID];
    },
    getPatientId: function(studyId, sampleId) {
      return data_.groups.group_mapping.studyMap[studyId].sample_to_patient[sampleId];
    },
    getSampleIds: function(studyId, patientId) {
      return data_.groups.group_mapping.studyMap[studyId].patient_to_sample[patientId];
    },
    openCases: function() {
      var _selectedCasesMap = {};
      var _patientData = data_.groups.patient.data;
      $.each(vm_.selectedpatientUIDs, function(key, patientUID) {
        var _caseDataObj = _patientData[patientUID];
        if (!_selectedCasesMap[_caseDataObj.study_id]) {
          _selectedCasesMap[_caseDataObj.study_id] = [];
        }
        _selectedCasesMap[_caseDataObj.study_id].push(_caseDataObj.patient_id);
      });
      if (Object.keys(_selectedCasesMap).length === 1) {
        var _study_id = Object.keys(_selectedCasesMap)[0];
        var _selectedCaseIds = _selectedCasesMap[_study_id].sort();
        var _url = window.cbioURL + 'case.do#/patient?studyId=' +
          _study_id + '&caseId=' + _selectedCaseIds[0] +
          '&navCaseIds=' + _selectedCaseIds.join(',');
        window.open(_url);
      } else {
        new Notification().createNotification(
          'This feature is not available to Virtual Cohort(s) for now!',
          {message_type: 'info'});
      }
    },
    downloadCaseData: function() {
      var sampleUIds_ = vm_.selectedsampleUIDs;
      var attr = {};
      var self = this;

      $.when(this.fetchCompleteData('patient', true), this.fetchCompleteData('sample', true)).then(function() {
        attr.CANCER_TYPE_DETAILED = 'Cancer Type Detailed';
        attr.CANCER_TYPE = 'Cancer Type';
        attr.study_id = 'Study ID';
        attr.patient_id = 'Patient ID';
        attr.sample_id = 'Sample ID';
        attr.mutated_genes = 'With Mutation Data';
        attr.cna_details = 'With CNA Data';

        var arr = [];
        var strA = [];

        var sampleAttr_ = data_.groups.sample.attr_meta;
        var patientAttr_ = data_.groups.patient.attr_meta;

        _.each(sampleAttr_, function(_attr) {
          if (attr[_attr.attr_id] === undefined &&
            _attr.view_type !== 'scatter_plot') {
            attr[_attr.attr_id] = _attr.display_name;
          }
        });

        _.each(patientAttr_, function(_attr) {
          if (attr[_attr.attr_id] === undefined &&
            _attr.view_type !== 'survival') {
            attr[_attr.attr_id] = _attr.display_name;
          }
        });

        _.each(attr, function(displayName) {
          strA.push(displayName || 'Unknown');
        });
        var content = strA.join('\t');
        strA.length = 0;
        _.each(sampleUIds_, function(sampleUId) {
          var temp = data_.groups.sample.data[sampleUId];
          var temp1 = $.extend({}, temp,
            data_.groups.patient.data[self.getPatientUIDs(sampleUId)[0]]);
          arr.push(temp1);
        });

        for (var i = 0; i < arr.length; i++) {
          strA.length = 0;
          strA = iViz.util.getAttrVal(attr, arr[i]);
          content += '\r\n' + strA.join('\t');
        }

        var downloadOpts = {
          filename: 'study_view_clinical_data.txt',
          contentType: 'text/plain;charset=utf-8',
          preProcess: false
        };

        cbio.download.initDownload(content, downloadOpts);
      }, function() {
        // TODO: give warning/error message to user if the download is failed
      });
    },
    submitForm: function() {
      var _self = this;
      _self.selectedsamples = _.keys(iViz.getCasesMap('sample'));
      _self.selectedpatients = _.keys(iViz.getCasesMap('patient'));
      _self.cohorts_ = window.cohortIdsList; // queried cohorts (vc or regular study)

      // Remove all hidden inputs
      $('#iviz-form input:not(:first)').remove();

      if (_self.cohorts_.length === 1) { // to query single study
        if (QueryByGeneTextArea.isEmpty()) {
          QueryByGeneUtil.toMainPage(_self.cohorts_[0], _self.stat().selectedCases);
        } else {
          QueryByGeneTextArea.validateGenes(this.decideSubmitSingleCohort, false);
        }
      } else { // to query multiple studies, always generate a tmp VC and save to session service only. 
        $.when(vcSession.utils.buildVCObject(_self.stat().filters, _self.stat().selectedCases, "Selected patients / samples", "")).done(function (_vc) {
          vcSession.model.saveSessionWithoutWritingLocalStorage(_vc, function (_vcId) {
            if (QueryByGeneTextArea.isEmpty()) {
              QueryByGeneUtil.toMainPage(_vcId, _self.stat().selectedCases);
            } else {
              QueryByGeneUtil.toMultiStudiesQueryPage(_vcId, _self.stat().selectedCases, QueryByGeneTextArea.getGenes());
            }
          });
        });
      }
    },
    decideSubmitSingleCohort: function(allValid) {
      // if all genes are valid, submit, otherwise show a notification
      if (allValid) {
        var _self = this;
        QueryByGeneUtil.toQueryPageSingleCohort(window.cohortIdsList[0], iViz.stat().selectedCases,
          QueryByGeneTextArea.getGenes(), window.mutationProfileId,
          window.cnaProfileId);
      } else {
        new Notification().createNotification(
          'Invalid gene symbols.',
          {message_type: 'danger'});
        $('#query-by-gene-textarea').focus();
      }
    },
    stat: function() {
      var _result = {};
      _result.filters = {};
      var self = this;

      // extract and reformat selected cases
      var _selectedCases = [];
      var _selectedStudyCasesMap = {};
      var _sampleData = data_.groups.sample.data;

      $.each(vm_.selectedsampleUIDs, function(key, sampleUID) {
        var _caseDataObj = _sampleData[sampleUID];
        if (!_selectedStudyCasesMap[_caseDataObj.study_id]) {
          _selectedStudyCasesMap[_caseDataObj.study_id] = {};
          _selectedStudyCasesMap[_caseDataObj.study_id].studyID = _caseDataObj.study_id;
          _selectedStudyCasesMap[_caseDataObj.study_id].samples = [];
          _selectedStudyCasesMap[_caseDataObj.study_id].patients = [];
        }
        _selectedStudyCasesMap[_caseDataObj.study_id].samples.push(_caseDataObj.sample_id);
        var temp = self.getPatientUIDs(sampleUID);
        _selectedStudyCasesMap[_caseDataObj.study_id].patients.push(data_.groups.patient.data[temp[0]].patient_id);
      });
      $.each(_selectedStudyCasesMap, function(key, val) {
        _selectedCases.push(val);
      });
      _result.filterspatients = [];
      _result.filters.samples = [];
      _.each(vm_.groups, function(group) {
        var filters_ = [];
        var temp;
        var array;

        if (group.type === 'patient') {
          _.each(group.attributes, function(attributes) {
            if (attributes.filter.length > 0) {
              filters_[attributes.attr_id] = attributes.filter;
            }
          });
          temp = $.extend(true, _result.filters.patients, filters_);
          array = $.extend(true, {}, temp);
          _result.filters.patients = array;
        } else if (group.type === 'sample') {
          _.each(group.attributes, function(attributes) {
            if (attributes.filter.length > 0) {
              filters_[attributes.attr_id] = attributes.filter;
            }
          });
          temp = $.extend(true, _result.filters.samples, filters_);
          array = $.extend(true, {}, temp);
          _result.filters.samples = array;
        }
      });
      _result.selectedCases = _selectedCases;
      return _result;
    },

    vm: function() {
      return vm_;
    },
    view: {
      component: {}
    },
    util: {},
    opts: configs_,
    data: {},
    styles: configs_.styles,
    applyVC: function(_vc) {
      var _selectedSamples = [];
      var _selectedPatients = [];
      _.each(_.pluck(_vc.selectedCases, 'samples'), function(_arr) {
        _selectedSamples = _selectedSamples.concat(_arr);
      });
      _.each(_.pluck(_vc.selectedCases, 'patients'), function(_arr) {
        _selectedPatients = _selectedPatients.concat(_arr);
      });
      iViz.init(data_, _selectedSamples, _selectedPatients);
    }
  };
})(window._,
  window.$,
  window.cbio,
  window.QueryByGeneUtil,
  window.QueryByGeneTextArea);
