'use strict';

/**
 * @ngdoc function
 * @name jschallengeApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the jschallengeApp
 */
angular.module('jschallengeApp')
  .controller('MainCtrl', function ($scope, $http) {

    var querylimit = 24;

    function updateSelection(obj, startNo, length) {
      var i;
      obj.selection.length = 0;
      for (i = startNo; i < startNo + length; i += 1) {
        obj.selection.push(i);
      }
      obj.select = startNo;
    }

    $scope.duration = {};
    $scope.duration.select = 1;
    $scope.duration.selection = [];
    updateSelection($scope.duration, 1, 12);

    $scope.noCarFound = false;

   //Thanks to http://www.geodatasource.com/developers/javascript
    function getDistance(lat1, lon1, lat2, lon2) {
      var radlat1, radlat2, radlon1, radlon2, theta, radtheta, dist, unit;
      unit = 'K';

      radlat1 = Math.PI * lat1 / 180;
      radlat2 = Math.PI * lat2 / 180;
      radlon1 = Math.PI * lon1 / 180;
      radlon2 = Math.PI * lon2 / 180;

      theta = lon1 - lon2;
      radtheta = Math.PI * theta / 180;
      dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
      dist = Math.acos(dist);
      dist = dist * 180 / Math.PI;
      dist = dist * 60 * 1.1515;

      if (unit === 'K') { dist = dist * 1.609344; }
      if (unit === 'N') { dist = dist * 0.8684; }

      return dist;
    }

    //get browser location
    function getLocation(callback) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (data) {
          //location found
          callback(null, data.coords.latitude, data.coords.longitude);

        }, function () {
          //permission denied
          callback('permission denied');

        });
      } else {
        //not supported
        callback('browser does not support');
      }
    }

    function updateCarDistance(cars, lat, lon) {
      cars.forEach(function (car) {
        car.distance = getDistance(car.latitude, car.longitude, lat, lon);
      });
    }

    function sortCarByDistance(cars) {
      cars.sort(function (a, b) {
        return a.distance - b.distance;
      });

      return cars;
    }

    function getCarAvailability(start, end, callback) {
      var url = 'http://jschallenge.smove.sg/provider/1/availability?' + 'book_start=' + start + '&book_end=' + end;

      $http.get(url).success(function (result) {
        callback(null, result, start, end);

      }).error(function (err) {
        callback(err);
      });
    }

    function updateAvailableCarsResult(result, start, end) {
      //get current location and update distance between car and current location
      getLocation(function (err, lat, lon) {
        $scope.$evalAsync(function () {
          if (err) {
            $scope.availableCars = result;

          } else {
            updateCarDistance(result, lat, lon);
            $scope.availableCars = sortCarByDistance(result);
          }

          $scope.start = start;
          $scope.end = end;
        });
      });
    }

    function getNextAvailableCars(duration) {
      var carAvailabilityInterval, queryCount = 0;

      $scope.availableCars = [];
      $scope.noCarFound = false;

      $scope.start = Math.ceil(Date.now() / (60 * 60 * 1000)) * (60 * 60 * 1000);
      if (!duration) { duration = 1; }
      $scope.end = $scope.start + duration * (60 * 60 * 1000);

      carAvailabilityInterval = setInterval(function () {
        queryCount += 1;

        getCarAvailability($scope.start, $scope.end, function (err, result, start, end) {

          if (result && result.length > 0) {
            updateAvailableCarsResult(result, start, end);
            clearInterval(carAvailabilityInterval);

          } else if (queryCount === querylimit) {
            $scope.noCarFound = true;
            clearInterval(carAvailabilityInterval);

          } else {
            $scope.start = $scope.start + 60 * 60 * 1000;
            $scope.end = $scope.start + duration * (60 * 60 * 1000);
          }
        });

      }, 500);
    }

    $scope.$watch('duration.select', function (newVal) {
      getNextAvailableCars(newVal);
    });
  });
