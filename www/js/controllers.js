angular.module('starter.controllers', [])

    .controller('AppCtrl', function($scope, $ionicModal, $timeout, Users, Session, $cordovaPush, $cordovaDialogs) {
      // Form data for the login modal
      $scope.loginData = {};
      $scope.currentUser = null;
      $scope.isAuthorized = false;

      /**
       * Setters
       */

      // Setter for the active user, 'very' secure
      $scope.setCurrentUser = function (user) {
        $scope.currentUser = user;
      };

      // Setter for current auth status
      $scope.setAuth = function(logged) {
        $scope.isAuthorized = logged;
      }

      /**
       * Modal controls
       */

      // Triggered in the login modal to close it
      $scope.closeLogin = function() {
        $scope.modal.hide();
      };

      // Open the login modal
      $scope.loginModal = function() {
        $ionicModal.fromTemplateUrl('templates/login.html', {
          scope: $scope
        }).then(function(modal) {
          $scope.modal = modal;
          $scope.modal.show();
          console.log("Opened the login modal.");
        });
      };

      // Log out the current user, then open the logout modal
      $scope.logoutModal = function() {
        $ionicModal.fromTemplateUrl('templates/logout.html', {
          scope: $scope
        }).then(function(modal) {
          $scope.setCurrentUser(null);
          Session.destroy();
          $scope.setAuth(false);
          $scope.modal = modal;
          $scope.modal.show();
        });
      };

      // Open the login modal
      $scope.pingModal = function() {
        $ionicModal.fromTemplateUrl('templates/ping.html', {
          scope: $scope
        }).then(function(modal) {
          $scope.modal = modal;
          $scope.modal.show();
        });
      };

      // Show the user account creation modal
      $scope.createModal = function() {
        $ionicModal.fromTemplateUrl('templates/create.html', {
          scope: $scope
        }).then(function(modal) {
          $scope.modal = modal;
          $scope.modal.show();
        });
      };

      /**
       * Push helpers
       */

      // Notification Received
      $scope.$on('pushNotificationReceived', function (event, notification) {
        console.log(JSON.stringify([notification]));
        if (ionic.Platform.isAndroid()) {
          //TODO: Android
        }
        else if (ionic.Platform.isIOS()) {
          handleIOS(notification);
          $scope.$apply(function () {
            $scope.notifications.push(JSON.stringify(notification.alert));
          })
        }
      });

      // IOS Notification Received Handler
      function handleIOS(notification) {
        // The app was already open but we'll still show the alert and sound the tone received this way. If you didn't check
        // for foreground here it would make a sound twice, once when received in background and upon opening it from clicking
        // the notification when this code runs (weird).
        if (notification.foreground == "1") {
          // Play custom audio if a sound specified.
          if (notification.sound) {
            var mediaSrc = $cordovaMedia.newMedia(notification.sound);
            mediaSrc.promise.then($cordovaMedia.play(mediaSrc.media));
          }

          if (notification.body && notification.messageFrom) {
            $cordovaDialogs.alert(notification.body, notification.messageFrom);
          }
          else $cordovaDialogs.alert(notification.alert, "Push Notification Received");

          if (notification.badge) {
            $cordovaPush.setBadgeNumber(notification.badge).then(function (result) {
              console.log("Set badge success " + result)
            }, function (err) {
              console.log("Set badge error " + err)
            });
          }
        }
        // Otherwise it was received in the background and reopened from the push notification. Badge is automatically cleared
        // in this case. You probably wouldn't be displaying anything at this point, this is here to show that you can process
        // the data in this situation.
        else {
          if (notification.body && notification.messageFrom) {
            $cordovaDialogs.alert(notification.body, "(RECEIVED WHEN APP IN BACKGROUND) " + notification.messageFrom);
          }
          else $cordovaDialogs.alert(notification.alert, "(RECEIVED WHEN APP IN BACKGROUND) Push Notification Received");
        }
      }
    })

    .controller('PingController', function($scope, $rootScope, $http) {
      $scope.payload = {
        username: '',
        message: ''
      };

      $scope.pingError = false;

      $scope.ping = function (payload) {
        if (payload.message === '') {
          $scope.pingError = true;
        } else {
          $http.post('http://radiant-waters-1521.herokuapp.com/api/messages/', {
            username: payload.username,
            userfrom: $scope.currentUser.email,
            message: payload.message
          }).
              success(function(user, status) {
                $scope.pingError = false;
                $scope.closeLogin();
                console.log(user);
              }).
              error(function(data, status) {
                // TODO: Handle errors
              });
        }
      }
    })

    .controller('CreateController', function ($scope, $rootScope, $http, AUTH_EVENTS, Session, $cordovaPush) {
      $scope.credentials = {
        fullName: '',
        email: '',
        imgLink: '',
        password: '',
        confirmPassword: ''
      };

      $scope.passError = false;

      $scope.createAccount = function (credentials) {
        if (credentials.password !== credentials.confirmPassword){
          $scope.passError = true;
          credentials.password = '';
          credentials.confirmPassword = '';
        } else {
          $http.post('http://radiant-waters-1521.herokuapp.com/api/chatters/', {
            full_name: credentials.fullName,
            email: credentials.email,
            password: credentials.password,
            imgur_url: credentials.imgLink,
            groups: [],
            user_permissions: []
          }).
              success(function(user, status) {
                $scope.passError = false;
                user.fullName = user.full_name;
                user.imgurUrl = user.imgur_url;
                $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
                $scope.setCurrentUser(user);
                Session.create(user.id, user);
                $scope.closeLogin();
                $scope.setAuth(true);
              }).
              error(function(data, status) {
                // TODO: Handle server errors
              });
        }

      };
    })

    .controller('LoginController', function ($ionicPush, $scope, $rootScope, $http, AUTH_EVENTS, Session) {
      // Username and password for the modal
      $scope.credentials = {
        username: '',
        password: ''
      };

      // Calls the AuthService login function
      $scope.login = function (credentials) {
        /**
         * User structure, yo!
         * {id: x, email: y, fullName: z}
         */
        console.log('logging in...');
        $http.post('http://radiant-waters-1521.herokuapp.com/api/auth/', {
          email: credentials.username,
          password: credentials.password
        }).
            success(function(user, status) {
              user.fullName = user.full_name;
              user.imgurUrl = user.imgur_url;
              $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
              $scope.setCurrentUser(user);
              Session.create(user.id, user);
              $scope.closeLogin();
              $scope.setAuth(true);

              $ionicPush.init($scope.currentUser.id);
            }).
            error(function(data, status) {
              console.log(data);
              console.log(status);
              // TODO: Error
            });
      };
    })

    .controller('HomeCtrl', function($scope, $http, Session) {
      $scope.pushRegister = function() {
        var req = {
          method: 'POST',
          url: "https://push.ionic.io/api/v1/register-device-token",
          headers: {
            'X-Ionic-Applicaton-Id': "2074701c",
            'X-Ionic-API-Key': "f11c8c924f90f52df5679b206159f97"
          },
          data: {
            ios_token: token,
            metadata: {
              userid: 101,
              firstname: 'John'
            }
          }
        };
        $http(req)
            .success(function(data, status) {
              alert("Success: " + data);
            })
            .error(function(error, status, headers, config) {
              alert("Error: " + error + " " + status + " " + headers);
            });
      }
    });
