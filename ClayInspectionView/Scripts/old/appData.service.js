(function () {
  "use strict";

  angular.module('InspectionView')
.factory('appData', ['$http', appData]);

  function appData($http) {
    return {
      getInspections: getInspections,
      getTotalInspections: getTotalInspections
    };

    function getInspections(d) {
      return $http.get('API/Inspections/' + d, {cache: false})
      .then(function (response) {
        return response;
      }, function (response) {
        console.log('inspections error', response);
        return response;
      });
    }

    function getTotalInspections(d) {
      return $http.get('API/TotalInspections/' + d, {cache: false})
      .then(function (response) {
        return response;
      }, function (response) {
        console.log('inspections error', response);
        return response;
      });
    }

  }

})();