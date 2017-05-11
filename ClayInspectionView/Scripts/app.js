(function () {
  "use strict";

  angular.module('InspectionView',
    ['ngMaterial', 'esri.map'])

    .config(function ($mdThemingProvider) {
      $mdThemingProvider.theme('default').primaryPalette('blue');
    });

})();