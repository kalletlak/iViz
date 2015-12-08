/*
 * Copyright (c) 2015 Memorial Sloan-Kettering Cancer Center.
 *
 * This library is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY, WITHOUT EVEN THE IMPLIED WARRANTY OF MERCHANTABILITY OR FITNESS
 * FOR A PARTICULAR PURPOSE. The software and documentation provided hereunder
 * is on an "as is" basis, and Memorial Sloan-Kettering Cancer Center has no
 * obligations to provide maintenance, support, updates, enhancements or
 * modifications. In no event shall Memorial Sloan-Kettering Cancer Center be
 * liable to any party for direct, indirect, special, incidental or
 * consequential damages, including lost profits, arising out of the use of this
 * software and its documentation, even if Memorial Sloan-Kettering Cancer
 * Center has been advised of the possibility of such damage.
 */

/*
 * This file is part of cBioPortal.
 *
 * cBioPortal is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


var StudyViewInitTopComponents = (function() {
    function liClickCallBack(_id, _text) {
        StudyViewInitCharts.createNewChart(_id, _text);
    };


    function addEvents() {

        $('#study-view-header-left-2').unbind('click');
        $('#study-view-header-left-2').click(function (){
            // clear all breadcrumbs
            BreadCrumbs.clearAllBreadCrumbs();

            var i,
                _charts = StudyViewInitCharts.getCharts(),
                _chartsLength = _charts.length;

            StudyViewInitScatterPlot.setclearFlag(true);

            //Previous using dc.filterAll(), but this will redraw word cloud
            //several times based on the number of charts. Right now, only
            //redraw word cloud if the chart has filter
            for( i = 0; i < _chartsLength; i++){
                if(_charts[i] !== "" &&
                        _charts[i].getChart().filter() !== null){

                    _charts[i].getChart().filter(null);
                }
            }

            //If set the filter to null the update scatterplot in charts do
            //not work, so need to update scatter plot here
            //StudyViewInitCharts.redrawScatter();

            dc.redrawAll();
            StudyViewInitTables.clearAllSelected();
            StudyViewInitCharts.resetBars();
            StudyViewInitCharts.redrawSpecialPlots();
            setTimeout(function() {
                StudyViewInitScatterPlot.setclearFlag(false);
            }, StudyViewParams.summaryParams.transitionDuration);
            StudyViewInitCharts.changeHeader();
        });


        $("#study-view-case-select-custom-submit-btn").click(function() {
            var ids = $('#study-view-case-select-custom-input').val().trim().split(/\s+/);
            StudyViewInitCharts.filterChartsByGivingIDs(convertIds(ids));
            $('#study-view-header-right-1').qtip('toggle');
            BreadCrumbs.updateSelectCaseIDdBreadCrumb('study-view-select-case', 'Custom', 'User defined cases', ids);
        });

        $("#study-view-tutorial").click(function() {
            StudyViewInitIntroJS.init();
        });

        $("#study-view-header-left-4").click(function() {
            var _url;
            var _selectedCaseIds = StudyViewInitCharts.getSelectedCasesID();
            var _selectedPatientIds = StudyViewProxy.getPatientIdsBySampleIds(_selectedCaseIds);

            _selectedPatientIds = _selectedPatientIds.sort();
            _url =  "case.do?cancer_study_id="+
                    StudyViewParams.params.studyId+
                    "&case_id="+_selectedPatientIds[0]+
                    "#nav_case_ids="+_selectedPatientIds.join(",");

            window.open(_url);
        });

        $("#study-view-header-left-6").click(function () {
            var content = '';
            var sampleIds = StudyViewInitCharts.getSelectedCasesID();
            var attr = StudyViewProxy.getAttrData();
            var arr = [];
            var attrL = 0, arrL = 0;
            var strA = [];

            if (sampleIds.length === StudyViewProxy.getSampleIds().length) {
                arr = StudyViewProxy.getArrData();
            } else {
                arr = StudyViewProxy.getArrDataBySampleIds(sampleIds);
            }

            attrL = attr.length;
            for (var i = 0; i < attrL; i++) {
                strA.push(attr[i].display_name || 'Unknown');
            }
            content = strA.join('\t');
            strA.length =0;

            arrL = arr.length;

            for (var i = 0; i < arrL; i++) {
                strA.length = 0;
                for (var j = 0; j < attrL; j++) {
                    strA.push(arr[i][attr[j].attr_id]);
                }
                content += '\r\n' + strA.join('\t');
            }

            var downloadOpts = {
                filename: StudyViewParams.params.studyId + "_clinical_data.txt",
                contentType: "text/plain;charset=utf-8",
                preProcess: false
            };

            cbio.download.initDownload(content, downloadOpts);
        })
    }

    //The selected id should be sample based. Check patient list if unidentified id exists.
    function convertIds(ids) {
        var radioVal = $('input[name=study-view-case-select-custom-radio]:checked').val();
        var sampleIds = ids;
        if(radioVal === 'patient') {
            sampleIds = StudyViewProxy.getSampleIdsByPatientIds(ids)
        }
        //var sampleIds = StudyViewProxy.getSampleIds();
        //var unidentifiedIds = [];
        //var identifiedIds = [];
        //_.each(ids, function(id){
        //    if(sampleIds.indexOf(id) === -1) {
        //        unidentifiedIds.push(id);
        //    }else{
        //        identifiedIds.push(id);
        //    }
        //});
        //
        //identifiedIds = identifiedIds.concat(StudyViewProxy.getSampleIdsByPatientIds(unidentifiedIds));

        return sampleIds;
    }

    function changeHeader(_filteredResult, _numOfCases, _removedChart){
        var _caseID = [],
            _resultLength = _filteredResult.length,
            _charts = StudyViewInitCharts.getCharts(),

            //Check whether page has been scrolled or not, The position of
            //left-3 will be different
            windowScolled = false;

        for(var i=0; i<_filteredResult.length ; i++){
            _caseID.push(_filteredResult[i].CASE_ID);
        }


        $("#study-view-header-left-1").css('display','');
        $("#study-view-header-left-4").css('display','');

        $("#study-view-header-left-3").css('display','')
        $("#study-view-header-left-3").text("Samples selected: ");
        $("#study-view-header-left-5").css('display','');
        $("#study-view-header-left-5").text(_resultLength);

        if(_resultLength !== _numOfCases){
            if(_resultLength === 0){
                $("#study-view-header-left-1").css('display','none');
                $("#study-view-header-left-4").css('display','none');
            }else if(_resultLength === 1){
                $("#study-view-header-left-4").css('display','none');
                $("#study-view-header-left-3").css('display','');
                $("#study-view-header-left-3").html("");
                $("#study-view-header-left-3")
                        .append("<a title='Go to sample view' href='"
                        + cbio.util.getLinkToSampleView(StudyViewParams.params.studyId, _caseID[0])
                        + "'><span style='color: red'>" + _caseID[0] +
                        "</span></a>" + " is selected.");
                $("#study-view-header-left-5").css('display','none');
            }
        }
        $("#study-view-header-left-case-ids").val(_caseID.join(" "));
    }

    function initAddCharts(target) {
        AddCharts.init(target);
        AddCharts.initAddChartsButton(StudyViewInitCharts.getShowedChartsInfo());
        AddCharts.liClickCallback(liClickCallBack);
    }

    function createDiv() {
        var _newElement = StudyViewBoilerplate.headerDiv(),
            _customDialogQtip = jQuery.extend(true, {}, StudyViewBoilerplate.headerCaseSelectCustomDialog);

        $("#study-view-header-function").append(_newElement);
        $("#study-view-header-function").append(StudyViewBoilerplate.customDialogDiv);
        $("#study-view-header-left-cancer_study-ids").val(StudyViewParams.params.studyId);
        $("#study-view-header-left-case-ids").val(StudyViewParams.params.sampleIds.join(" "));
        //$("#study-view-header-function").append(StudyViewBoilerplate.tutorialDiv);
        _customDialogQtip.position.target = $(window);
        _customDialogQtip.content.text = $('#study-view-case-select-custom-dialog');
        $('#study-view-header-right-1').qtip(_customDialogQtip);

        $('#study-view-header-left-7').click(function () {
          dataFolder = 'ucs_tcga';
          $('#dc-plots-loading-wait').show();
          $('#study-view-charts').empty();
          $('#study-view-header-function').empty();
          $.ajax({url: "data/" + dataFolder + "/configs.json"})
            .then(function (data) {
              StudyView.preConfig = data;
              StudyViewMainController.init(StudyView.preConfig);
            })
        })
        initAddCharts("#study-view-header-right");
        // ensure header has proper values
        StudyViewInitCharts.changeHeader();
    }



    return {
        init: function() {
            createDiv();
            addEvents();
        },

        changeHeader: changeHeader,
    };
})();