'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapEvent;
  #workouts;
  static id = 1;

  constructor() {
    this._getGeoCoords();
    inputType.addEventListener('change', this._toggleInput);
    form.addEventListener('submit', this._newWorkout.bind(this));
    this.#workouts = [];
  }

  _getGeoCoords() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () => {
        alert('Geo error');
      });
    }
  }

  _loadMap(pos) {
    const coords = [pos.coords.latitude, pos.coords.longitude];

    this.#map = L.map('map').setView(coords, 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));
  }

  _showForm(e) {
    this.#mapEvent = e;
    console.log(e);
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _toggleInput() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();
    if (e.target.classList.contains('hidden')) return;

    const checkInputs = (...args) => args.every(arg => Number.isFinite(+arg));

    const checkPositive = (...args) => args.every(arg => +arg > 0);

    let workout;
    const coord = [this.#mapEvent.latlng.lat, this.#mapEvent.latlng.lng];
    const distance = inputDistance.value;
    const duration = inputDuration.value;
    const type = inputType.value;

    if (type === 'running') {
      const cadence = inputCadence.value;
      if (!checkInputs(distance, duration, cadence) ||
        !checkPositive(distance, duration, cadence)) {
        alert('Numbers must be positive!');
        return;
      }
      workout = new Running(duration, distance, coord, cadence);
    }

    if (type === 'cycling') {
      const elevation = inputElevation.value;
      if (!checkInputs(distance, duration, elevation) ||
        !checkPositive(distance, duration)) {
        alert('Numbers must be positive!');
        return;
      }
      workout = new Cycling(duration, distance, coord, elevation);
    }

    this._createMarker(workout);
    this.#workouts.push(workout);
    this._resetForm();
  }

  _resetForm() {
    inputCadence.value = inputDistance.value = inputDuration.value = inputElevation.value = '';
    inputType.value = 'running';
    form.classList.add('hidden');
  }
  
  _createMarker({coords, type, distance}) {
    const marker = L.marker(coords)
    .addTo(this.#map)
    .bindPopup(L.popup({
      maxWidth: 250,
      minWidth: 100,
      autoClose: false,
      closeOnClick: false,
      className: `${type}-popup`
    }))
    .setPopupContent(`${type}: ${distance}km`)
    .openPopup();
  }

  static createID() {
    return `${this.id++}`.padStart(10, 0);
  }
}

const app = new App();

class Workout {
  id = App.createID();
  date = new Date();
  constructor(duration, distance, coords) {
    this.duration = duration;
    this.distance = distance;
    this.coords = coords;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(duration, distance, coords, cadence) {
    super(duration, distance, coords);
    this.cadence = cadence;
    this.calcPace();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(duration, distance, coords, elevationGain) {
    super(duration, distance, coords);
    this.elevationGain = elevationGain;
    this.calcSpeed();
  }

  calcSpeed() {
    this.speed = this.distance / this.duration / 60;
    return this.speed;
  }
}
