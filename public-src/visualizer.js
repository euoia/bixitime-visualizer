var $ = require('jquery'),
	_ = require('lodash'),
	check = require('check-types');

var Visualizer = module.exports = function (options) {
	/**
	 * @property {HTMLElement} element The HTMLElement to draw the visuals in.
	 */
	check.assert.assigned(options.element);
	this.element = options.element;

	/**
	 * @property {string} apiUrl The API endpoint for bike updates.
	 */
	check.assert.string(options.apiUrl);
	this.apiUrl = options.apiUrl;

	/**
	 * @property {number} pollInterval The polling interval for new map data in
	 * seconds.
	 */
	this.pollInterval = options.pollInterval || 30;

	this.element.onclick = function (e) {
		console.log(e.layerX, e.layerY);
		this.drawCircleAtPosition(e.layerX, e.layerY, '#FF0000', 10);
	}.bind(this);

	var	canvas = document.createElement('canvas');
	canvas.width = 1000;
	canvas.height = 800;
	canvas.style.width = '1000px';
	canvas.style.height = '800px';
	canvas.style.backgroundColor = 'white';
	this.element.appendChild(canvas);

	this.context = canvas.getContext('2d');
	this.drawUpdates();
};

Visualizer.prototype.drawDebugCircles = function () {
	/**
	 *
	 *	xPos, yPos = long, lat
	 *	189, 180 = -73.6249, 45.5378 Villeray and St Dominique (station 355)
	 *	722, 452 = -73.5539, 45.5121 Berri and St. Antoine (station 4)
	 *
	 *	Latitude (north of equator)
	 *		45.5378 => 180 (355)
	 *		45.5121 => 453 (4)
	 *	Delta   0.0257 => 273
	 *	Multiplier = 273 / 0.0257 = 10622
	 *
	 *	Longitude (east Grenwich Meridian)
	 *			-73.6249 => 189 (355)
	 *			-73.5539 => 722 (4)
	 *	Delta     0.0710 => 533
	 *	Multiplier = 533 / 0.0710 = 7507
	 */
	var station4Pos = this.coordsToScreenPosition(45.5121, -73.5539);
	var station355Pos = this.coordsToScreenPosition(45.5378, -73.6249);
	this.drawCircleAtPosition(station4Pos.x, station4Pos.y, '#000000', 10);
	this.drawCircleAtPosition(station355Pos.x, station355Pos.y, '#000000', 10);

};

Visualizer.prototype.coordsToScreenPosition = function(lat, long) {
	check.assert.number(lat);
	check.assert.number(long);

	return {
		x: (long + 73.652) * 7507,
		y: (lat - 45.553) * -10622
	};
};

Visualizer.prototype.drawUpdates = function() {
	var lastPollDate = null;

	this.drawMap();

	var draw = function () {
		console.log('Making request to', this.apiUrl);
		$.getJSON(this.apiUrl)
			.then(function (result) {
				console.log('Got a result', result);
				if (result.pollDate === lastPollDate) {
					// No new updates.
					console.log('No updates');
					return;
				}

				var updates = result.updates;
				var startTime = new Date(updates[0].latestUpdateTime);

				lastPollDate = result.pollDate;

				_.map(updates, function (update) {
					var timeout = new Date(update.latestUpdateTime) - startTime;

					setTimeout(function () {
						this.logUpdate(update);
						this.drawUpdate(update);
					}.bind(this), timeout);
				}.bind(this));
			}.bind(this));
	}.bind(this);

	draw();
	setInterval(draw, this.pollInterval * 1000);
};

Visualizer.prototype.drawMap = function() {
	var image = new Image();
	image.src = '/img/map-overlay.png';
	image.onload = function () {
		this.context.drawImage(image, 0, 0);
	}.bind(this);
};

Visualizer.prototype.drawUpdate = function (update) {
	var pos = this.coordsToScreenPosition(update.stationLat, update.stationLong);

	var color;
	if (update.bikesAfter > update.bikesBefore) {
		color = '#00FF00';
	} else {
		color = '#FF0000';
	}

	var numBikesChanged = Math.abs(update.bikesAfter - update.bikesBefore);
	var size = numBikesChanged + 5;

	this.drawCircleAtPosition(pos.x, pos.y, color, size);
};

Visualizer.prototype.drawCircleAtPosition = function(xPos, yPos, color, size) {
	console.log('Drawing station at', xPos, yPos);

	this.context.beginPath();
	this.context.strokeStyle = color;
	this.context.fillStyle = color;
	this.context.arc(xPos, yPos, size, 0, Math.PI * 2);
	this.context.stroke();
	this.context.fill();
};

Visualizer.prototype.logUpdate = function(update) {
	var action;
	var numBikesChanged = Math.abs(update.bikesAfter - update.bikesBefore);
	if (update.bikesAfter > update.bikesBefore) {
		action = 'bike returned';
	} else {
		action = 'bike taken';
	}

	var localTime = new Date(update.latestUpdateTime);

	console.log(localTime + ': ' + numBikesChanged + ' ' +
		action + ' at ' + update.stationName);
};
