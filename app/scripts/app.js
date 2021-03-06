
(function() {
  'use strict';

  var initialWeatherForecast = {
    key: 'newyork',
    label: 'New York, NY',
    currently: {
      time: 1453489481,
      summary: 'Clear',
      icon: 'partly-cloudy-day',
      temperature: 52.74,
      apparentTemperature: 74.34,
      precipProbability: 0.20,
      humidity: 0.77,
      windBearing: 125,
      windSpeed: 1.52
    },
    daily: {
      data: [
        {icon: 'clear-day', temperatureMax: 55, temperatureMin: 34},
        {icon: 'rain', temperatureMax: 55, temperatureMin: 34},
        {icon: 'snow', temperatureMax: 55, temperatureMin: 34},
        {icon: 'sleet', temperatureMax: 55, temperatureMin: 34},
        {icon: 'fog', temperatureMax: 55, temperatureMin: 34},
        {icon: 'wind', temperatureMax: 55, temperatureMin: 34},
        {icon: 'partly-cloudy-day', temperatureMax: 55, temperatureMin: 34}
      ]
    }
  };

  var app = {
    hasRequestPending: false,
    isLoading: true,
    visibleCards: {},
    selectedCities: [],
    spinner: document.querySelector('.loader'),
    cardTemplate: document.querySelector('.cardTemplate'),
    container: document.querySelector('.main'),
    addDialog: document.querySelector('.dialog-container'),
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  };


  /*****************************************************************************
   *
   * Event listeners for UI elements
   *
   ****************************************************************************/

  document.getElementById('butRefresh').addEventListener('click', function() {
    // Refresh all of the forecasts
    app.updateForecasts();
  });

  document.getElementById('butAdd').addEventListener('click', function() {
    // Open/show the add new city dialog
    app.toggleAddDialog(true);
  });

  document.getElementById('butAddCity').addEventListener('click', function() {
    // Add the newly selected city
    var select = document.getElementById('selectCityToAdd');
    var selected = select.options[select.selectedIndex];
    var key = selected.value;
    var label = selected.textContent;
    // check if this city already exists
    if (hasCity(key)) {
      sweetAlert("Oops...", label + " already exists!", "error");
    } else {
      app.getForecast(key, label);
      app.selectedCities.push({key: key, label: label});
      app.saveSelectedCities();
    }
    app.toggleAddDialog(false);
  });

  document.getElementById('butAddCancel').addEventListener('click', function() {
    // Close the add new city dialog
    app.toggleAddDialog(false);
  });


  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/

  // Toggles the visibility of the add new city dialog.
  app.toggleAddDialog = function(visible) {
    if (visible) {
      app.addDialog.classList.add('dialog-container--visible');
    } else {
      app.addDialog.classList.remove('dialog-container--visible');
    }
  };

  app.deleteForecastCard = function(key) {
    var card = app.visibleCards[key];
    if (card) {
      app.container.removeChild(card);
      delete app.visibleCards[key];
      var cityIndex = app.selectedCities.map(function (city) {
        return city.key;
      }).indexOf(key);
      // remove the city from array
      ~cityIndex && app.selectedCities.splice(cityIndex, 1);
      app.saveSelectedCities();
    }
  };

  // Updates a weather card with the latest weather forecast. If the card
  // doesn't already exist, it's cloned from the template.
  app.updateForecastCard = function(data) {
    var card = app.visibleCards[data.key];
    if (!card) {
      card = app.cardTemplate.cloneNode(true);
      card.classList.remove('cardTemplate');
      card.querySelector('.city-key').textContent = data.key;
      card.querySelector('.location').textContent = data.label;
      card.removeAttribute('hidden');
      app.container.appendChild(card);
      app.visibleCards[data.key] = card;

      card.querySelector('.mdl-button').addEventListener('click', function() {
        // Delete the selected city
        var key = card.querySelector('.city-key').textContent;
        console.log('[App] Deleting city ' + key);
        app.deleteForecastCard(key);
      });

    }
    card.querySelector('.description').textContent = data.currently.summary;
    card.querySelector('.date').textContent =
      new Date(data.currently.time * 1000);
    card.querySelector('.current .icon').classList.add(data.currently.icon);
    card.querySelector('.current .temperature .value').textContent =
      Math.round(data.currently.temperature);
    card.querySelector('.current .feels-like .value').textContent =
      Math.round(data.currently.apparentTemperature);
    card.querySelector('.current .precip').textContent =
      Math.round(data.currently.precipProbability * 100) + '%';
    card.querySelector('.current .humidity').textContent =
      Math.round(data.currently.humidity * 100) + '%';
    card.querySelector('.current .wind .value').textContent =
      Math.round(data.currently.windSpeed);
    card.querySelector('.current .wind .direction').textContent =
      data.currently.windBearing;
    var nextDays = card.querySelectorAll('.future .oneday');
    var today = new Date();
    today = today.getDay();
    for (var i = 0; i < 7; i++) {
      var nextDay = nextDays[i];
      var daily = data.daily.data[i];
      if (daily && nextDay) {
        nextDay.querySelector('.date').textContent =
          app.daysOfWeek[(i + today) % 7];
        nextDay.querySelector('.icon').classList.add(daily.icon);
        nextDay.querySelector('.temp-high .value').textContent =
          Math.round(daily.temperatureMax);
        nextDay.querySelector('.temp-low .value').textContent =
          Math.round(daily.temperatureMin);
      }
    }
    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
  };


  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/

  // Gets a forecast for a specific city and update the card with the data
  app.getForecast = function(key, label) {
    var url = 'https://publicdata-weather.firebaseio.com/';
    url += key + '.json';
    if ('caches' in window) {
      caches.match(url).then(function(response) {
        if (response) {
          response.json().then(function(json) {
            // Only update if the XHR is still pending, otherwise the XHR
            // has already returned and provided the latest data.
            if (app.hasRequestPending) {
              console.log('updated from cache');
              json.key = key;
              json.label = label;
              app.updateForecastCard(json);
            }
          });
        }
      });
    }
    // Make the XHR to get the data, then update the card
    app.hasRequestPending = true;
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          var response = JSON.parse(request.response);
          response.key = key;
          response.label = label;
          app.hasRequestPending = false;
          app.updateForecastCard(response);
        }
      }
    };
    request.open('GET', url);
    request.send();
  };

  // Iterate all of the cards and attempt to get the latest forecast data
  app.updateForecasts = function() {
    var keys = Object.keys(app.visibleCards);
    keys.forEach(function(key) {
      app.getForecast(key);
    });
  };

  // Save list of cities to localStorage, see note below about localStorage.
  app.saveSelectedCities = function() {
    var selectedCities = JSON.stringify(app.selectedCities);
    // IMPORTANT: See notes about use of localStorage.
    // localStorage.selectedCities = selectedCities;
    // Save to indexedDB
    saveSelectedCities();
  };

  /************************************************************************
   *
   * Code required to start the app
   *
   * NOTE: To simplify this codelab, we've used localStorage.
   *   localStorage is a synchronous API and has serious performance
   *   implications. It should not be used in production applications!
   *   Instead, check out IDB (https://www.npmjs.com/package/idb) or
   *   SimpleDB (https://gist.github.com/inexorabletash/c8069c042b734519680c)
   ************************************************************************/
  // 'global' variable to store reference to the database
  var db;
  var cityMap = {};

  // Using indexedDb
  function openDb() {
    var req = indexedDB.open("weatherdb", 1);
    req.onsuccess = function (evt) {
      // Better use "this" than "req" to get the result to avoid problems with
      // garbage collection.
      // db = req.result;
      db = this.result;
      console.log("openDb DONE");

      var store = db.transaction("selectedcities", "readonly").objectStore("selectedcities");

      store.get("selectedCities").onsuccess = function(event) {
        console.log("Result is " + event.target.result);
        if (event.target.result === undefined) {
          app.selectedCities = undefined;
        } else {
          app.selectedCities = event.target.result;
        }
        if (app.selectedCities) {
          app.selectedCities = JSON.parse(app.selectedCities);
          app.selectedCities.forEach(function(city) {
            app.getForecast(city.key, city.label);
          });
        } else {
          app.updateForecastCard(initialWeatherForecast);
          app.selectedCities = [
            {key: initialWeatherForecast.key, label: initialWeatherForecast.label}
          ];
          saveSelectedCities();
        }
      };

    };
    req.onerror = function (evt) {
      console.error("openDb:", evt.target.errorCode);
    };
    // this method will trigger only once and on subsequent version changes
    req.onupgradeneeded = function (evt) {
      console.log("openDb.onupgradeneeded");
      var store = evt.currentTarget.result.createObjectStore("selectedcities");
      console.log("Object Stored created");
      // Use transaction oncomplete to make sure the objectStore creation is
      // finished before adding data into it.
      store.transaction.oncomplete = function(event) {
        console.log("openDb.store.transaction.oncomplete");
      };
    };
  }

  function saveSelectedCities() {
    var selectedCities = JSON.stringify(app.selectedCities);
    var store = getObjectStore("selectedcities", 'readwrite');
    var req;
    try {
      req = store.put(selectedCities, "selectedCities");
    } catch (e) {
      console.log(e);
    }
    req.onsuccess = function (evt) {
      console.log("addSelectedCities successful");
    };
    req.onerror = function() {
      console.error("addSelectedCities error", this.error);
    };
  }

  function getSelectedCities() {
    var store = getObjectStore("selectedcities", 'readonly');
    store("selectedcities").get("selectedCities").onsuccess = function(event) {
      console.log("Result is " + event.target.result);
      return event.target.result;
    };
  }

  function getObjectStore(store_name, mode) {
    var tx = db.transaction(store_name, mode);
    return tx.objectStore(store_name);
  }

  openDb();

  // check if the city already exists in the database
  var hasCity = function(city) {
    var i = null;
    for (i = 0; app.selectedCities.length > i; i += 1) {
      cityMap[app.selectedCities[i].key] = app.selectedCities[i];
    }
    return cityMap[city];
  };

  // service worker registration
  if('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./service-worker.js')
      .then(function() { console.log('Service Worker Registered'); });
  }
})();
