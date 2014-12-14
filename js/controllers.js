'use strict';

/* Controllers */

angular.module('myApp.controllers', []).
controller('InputCtrl', function($scope, $http, $localStorage, $q, $filter) {

  $scope.$storage = $localStorage.$default({
    my_email: "",
  });

  // $scope.server = "http://mesh-board.appspot.com/";
  // $scope.server = "http://localhost:8080/";
  $scope.server = "http://mesh0-1-dot-mesh-board.appspot.com/";
  // $scope.server = "http://mesh0-1-1-dot-mesh-board.appspot.com/";

  $scope.error_has_occured = false; // for that message..
  $scope.share_error = false;
  $scope.url = "";
  $scope.url_title = "";
  $scope.url_description = "";
  $scope.url_title_show = false;
  $scope.me = $scope.$storage.my_email;
  $scope.me_gravatar = "";
  $scope.best_friends = [];
  $scope.most_recent = [];
  $scope.share_with = [];
  $scope.share_in_progress = false;
  $scope.tags = [
    // { text: 'cool' },
    // { text: 'tags' }
  ];
  $scope.message = "";
  $scope.token = "";
  $scope.google_mails = [];

  // GET URL
  chrome.tabs.getSelected(null, function(tab) {
    $scope.url = tab.url;
    $scope.url_title = tab.title;
    $scope.url_title_show = false;
    $scope.analyse();
  });

  chrome.identity.getProfileUserInfo(function(data) {
    console.log(data);
    $scope.me = data.email;
    $scope.me_hashed = CryptoJS.MD5($scope.me).toString();
    var gravatar_profile_url = 'https://www.gravatar.com/'+$scope.me_hashed+'.json';
    // $http.get(gravatar_profile_url).
    //   success(function(data, status, headers, config) {
    //     console.log("gravatar success");
    //     console.log(data);
    //   }).
    //   error(function(data, status, headers, config) {
    //     console.log("gravatar fail");
    //   });

    $scope.suggest();
  });

  // console.log(chrome.identity);
  chrome.identity.getAuthToken({
    'interactive': true
  }, function(token) {
    if (chrome.runtime.lastError) {
      console.log("chrome.runtime.lastError:");
      console.log(chrome.runtime.lastError);
    } else {
      console.log('Token acquired:');
      // console.log('Token acquired:' + token +
        // '. See chrome://identity-internals for details.');
      $scope.token = token;

      var contacts_url = 'https://www.google.com/m8/feeds/contacts/default/full/?access_token=' + $scope.token + '&alt=json&max-results=10000';

      $http.get(contacts_url).
      success(function(data, status, headers, config) {
        var arr = data.feed.entry[0].gd$email;
        for (var i = 0; i < data.feed.entry.length; i++) {
          var c = data.feed.entry[i];
          // console.log(c.gd$email[0].address);
          var arr = data.feed.entry[i].gd$email;
          // console.log(arr[0].address);
          try {
            $scope.google_mails.push(arr[0].address);
          } catch (err) {};
        };
      }).
      error(function(data, status, headers, config) {
        console.log("contacts fail, revoking token...");
        var obj = {};
        obj.token = $scope.token;
        chrome.identity.removeCachedAuthToken(obj, function(data) {
          console.log("token revoked.");
        });
      });
    }
  });

  $scope.suggest = function() {
    console.log("suggest");
    $http.get($scope.server + 'rest/suggest?me=' + $scope.me).
    success(function(data, status, headers, config) {
      $scope.most_recent = data.most_recent;
      $scope.best_friends = data.best_friends;
    }).
    error(function(data, status, headers, config) {
      console.log("suggest fail.");
    });
  }
  $scope.suggest();

  $scope.loadEmails = function(query) {
    var deferred = $q.defer();
    deferred.resolve($filter('filter')($scope.google_mails, query));
    return deferred.promise;
  };

  $scope.email_changed = function() {
    console.log("email changed");
    $scope.suggest();
    $scope.loadEmails();
  };

  $scope.showRecent = function() {
    if ($scope.most_recent.length > 0) {
      return true;
    }
    return false;
  }
  $scope.addRecent = function(email) {
    var add = {};
    add.text = email;
    $scope.share_with.push(add); 
    $scope.most_recent.splice($scope.best_friends.indexOf(email), 1);
  };
  $scope.showBest = function() {
    if ($scope.best_friends.length > 0) {
      return true;
    }
    return false;
  }
  $scope.addBest = function(email) {
    console.log("addBest");
    console.log(email);
    var add = {};
    add.text = email;
    $scope.share_with.push(add); 
    $scope.best_friends.splice($scope.best_friends.indexOf(email), 1);
  };

  $scope.analyse = function() {
    console.log("analyse");
    console.log($scope.url);

    var data = {};
    data.url = $scope.url;

    $http.post($scope.server + 'rest/analyse', data).
    success(function(data, status, headers, config) {
      $scope.url_title = data.title;
      $scope.url_description = data.description;
      $scope.url_title_show = true;

    }).
    error(function(data, status, headers, config) {
      $scope.url_title_show = true;
    });

  }

  $scope.message_field_keypress = function($event) {
    if ($event.charCode == 13) {
      $scope.save();
    }
  }

  // validation
  $scope.$watch('url', function() {
    $scope.not_ready_to_share();
  });
  $scope.$watch('me', function() {
    $scope.not_ready_to_share();
  });
  $scope.$watch('share_with', function() {
    $scope.not_ready_to_share();
  });
  $scope.not_ready_to_share = function() {
    if ($scope.url == "") {
      return true;
    }
    if ($scope.me == "") {
      return true;
    }
    if ($scope.share_with.length < 1) {
      return true;
    }
    return false;
  }

  $scope.save = function() {
    // gather data
    var data = {};
    data.url = $scope.url;
    data.title = $scope.url_title;
    data.description = $scope.url_description;
    data.me = $scope.me;
    $scope.$storage.my_email = $scope.me;
    data.share_with = $scope.share_with;
    data.message = $scope.message;
    data.tags = $scope.tags;

    // set in progress to true
    $scope.share_error = false;
    $scope.share_in_progress = true;

    $http.post($scope.server + 'rest/save', data).
    success(function(data, status, headers, config) {
      $scope.url = "";
      $scope.tags = [];
      $scope.url_title_show = false;
      $scope.message = "";
      $scope.share_in_progress = false;
      window.close();
    }).
    error(function(data, status, headers, config) {
      console.log("save fail!");
      $scope.share_in_progress = false;
      $scope.share_error = true;
    });
  
  };

});