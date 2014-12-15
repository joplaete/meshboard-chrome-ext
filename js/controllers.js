'use strict';

/* Controllers */

angular.module('myApp.controllers', []).
controller('InputCtrl', function($scope, $http, $localStorage, $q, $filter, $timeout) {

  $scope.$storage = $localStorage.$default({
    my_email: "",
    history: {}
  });

  // $scope.server = "http://localhost:8080/";
  $scope.server = "http://mesh0-2-dot-mesh-board.appspot.com/";

  $scope.error_has_occured = false; // for that message..
  $scope.share_error = false;
  $scope.url = "";
  $scope.url_hash = "";
  $scope.url_title = "";
  $scope.url_description = "";
  $scope.url_title_show = false;
  $scope.me = $scope.$storage.my_email;
  $scope.me_avatar = "";
  $scope.me_name = "";
  $scope.best_friends = [];
  $scope.most_recent = [];
  $scope.share_with = [];
  $scope.share_in_progress = false;
  $scope.share_complete_hide = false;
  $scope.tags = [
    // { text: 'cool' },
    // { text: 'tags' }
  ];
  $scope.message = "";
  $scope.token = "";
  $scope.mails = [];
  $scope.EMAIL_REGEXP = /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+@[a-z0-9-]+(\.[a-z0-9-]+)*$/i;

  // GET URL
  chrome.tabs.getSelected(null, function(tab) {
    $scope.url = tab.url;
    $scope.url_title = tab.title;
    $scope.url_title_show = false;
    $scope.url_hash = CryptoJS.MD5($scope.url);

    // restore session if exists
    try{
      if($scope.$storage.history[$scope.url_hash]){
        $scope.share_with = JSON.parse(JSON.stringify($scope.$storage.history[$scope.url_hash].share_with));
        $scope.message = $scope.$storage.history[$scope.url_hash].message;
      }else{
        $scope.$storage.history[$scope.url_hash] = {};
        $scope.$storage.history[$scope.url_hash].share_with = [];
        $scope.$storage.history[$scope.url_hash].message = "";
      }
    } catch (err) {
      // if anything goes wrong with this structure, reset it
      $scope.$storage.history = {};
    };

    // analyse link
    $scope.analyse();

  });

  $scope.getProfileUserInfo = function(){
    chrome.identity.getProfileUserInfo(function(data) {
      $scope.me = data.email;
      $scope.add_to_mails([$scope.me]);

      var userinfo_url = 'https://www.googleapis.com/oauth2/v1/userinfo?access_token='+$scope.token+'&alt=json';
      $http.get(userinfo_url).
      success(function(data, status, headers, config) {
        $scope.me_avatar = data.picture;
        $scope.me_name = data.name;
      }).
      error(function(data, status, headers, config) {
        console.log("userinfo_url fail.");
      });

      $scope.suggest();
    });
  };

  chrome.identity.getAuthToken({
    'interactive': true
  }, function(token) {
    if (chrome.runtime.lastError) {
      console.log("chrome.runtime.lastError:");
      console.log(chrome.runtime.lastError);
    } else {
      // store the token
      $scope.token = token;
      // get profile
      $scope.getProfileUserInfo();
      // get contacts (shld be function)
      var contacts_url = 'https://www.google.com/m8/feeds/contacts/default/full/?access_token=' + $scope.token + '&alt=json&max-results=10000';

      $http.get(contacts_url).
      success(function(data, status, headers, config) {
        var arr = data.feed.entry[0].gd$email;
        for (var i = 0; i < data.feed.entry.length; i++) {
          var c = data.feed.entry[i];
          var arr = data.feed.entry[i].gd$email;
          try {
            // don't add duplis
            $scope.add_to_mails([arr[0].address]);
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

  $scope.add_to_mails = function(mails){
    // takes array, avoids adding duplis
    for (var i = mails.length - 1; i >= 0; i--) {
      var mail = mails[i];
      if($scope.mails.indexOf(mail)==-1){
        $scope.mails.push(mail);
      }
    };
  }

  $scope.suggest = function() {
    $http.get($scope.server + 'rest/suggest?me=' + $scope.me).
    success(function(data, status, headers, config) {
      $scope.most_recent = data.most_recent;
      $scope.best_friends = data.best_friends;

      $scope.add_to_mails(data.emails);
      $scope.add_to_mails(['mon@gool.me']);

    }).
    error(function(data, status, headers, config) {
      console.log("suggest fail.");
    });
  }

  $scope.loadEmails = function(query) {
    var deferred = $q.defer();
    deferred.resolve($filter('filter')($scope.mails, query));
    return deferred.promise;
  };

  $scope.email_changed = function() {
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
    if(!$scope.email_in_share_with(email)){
      $scope.share_with.push(add); 
    };
    $scope.most_recent.splice($scope.most_recent.indexOf(email), 1);
  };
  $scope.showBest = function() {
    if ($scope.best_friends.length > 0) {
      return true;
    }
    return false;
  }
  $scope.addBest = function(email) {
    var add = {};
    add.text = email;
    if(!$scope.email_in_share_with(email)){
      $scope.share_with.push(add); 
    };
    $scope.best_friends.splice($scope.best_friends.indexOf(email), 1);
  };

  $scope.email_in_share_with = function(email){
    for (var i = $scope.share_with.length - 1; i >= 0; i--) {
      var obj = $scope.share_with[i];
      if(obj.text==email){
        return true;
      }
    };
    return false;
  };

  $scope.remove_invalid_in_share_with = function(email){
    for (var i = $scope.share_with.length - 1; i >= 0; i--) {
      var obj = $scope.share_with[i];
      if(!$scope.valid_email(obj.text)){
        $scope.share_with.splice($scope.share_with.indexOf(obj));
      }
    };
  };

  $scope.valid_email = function(email) { 
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  } 

  $scope.analyse = function() {
    // console.log("analyse");
    // console.log($scope.url);

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
    $scope.$storage.history[$scope.url_hash].message = $scope.message;
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
    // remove invalid emails
    $scope.remove_invalid_in_share_with();

    // store this in history
    if($scope.url_hash){
      $scope.$storage.history[$scope.url_hash].share_with = $scope.share_with;
    };

  }, true);
  $scope.not_ready_to_share = function() {
    if ($scope.share_in_progress){
      return true;
    }
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
    data.me_name = $scope.me_name;
    data.me_avatar = $scope.me_avatar;
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

      delete $scope.$storage.history[$scope.url_hash];

      $scope.share_complete_hide = true;

      $timeout(function(){
        window.close();
      }, 3000);

    }).
    error(function(data, status, headers, config) {
      console.log("save fail!");
      $scope.share_in_progress = false;
      $scope.share_error = true;
    });
  
  };

});