'use strict';
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
  #coord;
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
    const coords = this.#coord = [pos.coords.latitude, pos.coords.longitude];

    this.#map = L.map('map').setView(coords, 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));
  }

  _showForm(e) {
    this.#mapEvent = e;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _toggleInput() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _calcDistance(lat, lng) {
    const [beginLat, beginLng] = this.#coord;
    const latDiff = Math.abs(beginLat - lat);
    const lngDiff = Math.abs(beginLng - lng);
    return ((latDiff**2 + lngDiff**2)**0.5 * 111.3).toFixed(2);
  }

  _newWorkout(e) {
    e.preventDefault();
    if (e.target.classList.contains('hidden')) return;

    const checkInputs = (...args) => args.every(arg => Number.isFinite(+arg));

    const checkPositive = (...args) => args.every(arg => +arg > 0);

    let workout;
    const coord = [this.#mapEvent.latlng.lat, this.#mapEvent.latlng.lng];
    // const distance = inputDistance.value;
    const distance = this._calcDistance(...coord);
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
    this._renderWorkout(workout);
    this._resetForm();
  }

  _resetForm() {
    inputCadence.value = inputDistance.value = inputDuration.value = inputElevation.value = '';
    inputType.value = 'running';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => form.style.display = 'grid', 1000);
  }

  _createMarker({ coords, type, distance, description }) {
    const marker = L.marker(coords)
      .addTo(this.#map)
      .bindPopup(L.popup({
        maxWidth: 250,
        minWidth: 100,
        autoClose: false,
        closeOnClick: false,
        className: `${type}-popup`
      }))
      .setPopupContent(`${type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${description}`)
      .openPopup();
  }

  _renderWorkout({ id, type, distance, duration, pace, speed, cadence, elevation, description }) {
    let html = `
    <li class="workout workout--${type}" data-id="${id}">
      <h2 class="workout__title">${description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
        <span class="workout__value">${distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${duration}</span>
        <span class="workout__unit">min</span>
      </div>`;

    if (type === 'running') {
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;
    }

    if (type === 'cycling') {
      html += `
        <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${speed.toFixed(1)}</span>
              <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">⛰</span>
              <span class="workout__value">${elevation}</span>
              <span class="workout__unit">m</span>
            </div>
          </li>`;
    }

    form.insertAdjacentHTML('afterend', html);
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

  _createDescription() {
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(duration, distance, coords, cadence) {
    super(duration, distance, coords);
    this.cadence = cadence;
    this.calcPace();
    this._createDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(duration, distance, coords, elevation) {
    super(duration, distance, coords);
    this.elevation = elevation;
    this.calcSpeed();
    this._createDescription();
  }

  calcSpeed() {
    this.speed = this.distance / this.duration / 60;
    return this.speed;
  }
}
