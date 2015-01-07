'use strict';


// Declare app level module which depends on filters, and services
var myApp = angular.module('myApp', ['ngRoute', 'ui.bootstrap', 'ngTagsInput', 'ngStorage', 'myApp.filters', 'myApp.services', 'myApp.directives', 'myApp.controllers']).
  config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/', {templateUrl: 'partials/input.html', controller: 'InputCtrl'});
    $routeProvider.otherwise({redirectTo: '/'});
  }]);

myApp.directive('autofocus', function($timeout) {
  return function(scope, element) {
    var input = element.find('input');
    $timeout(function() { input[0].focus(); }, 300);
  };
});
