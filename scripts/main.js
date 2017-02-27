/** Simulate jQuery selector */
window.$ = function(selector) {
  var selectorType = 'querySelectorAll';

  if (selector.indexOf('#') === 0) {
    selectorType = 'getElementById';
    selector = selector.substr(1, selector.length);
  }

  return document[selectorType](selector);
};

(function () {
  'use strict'

  const drawLayer = $('#draw-layer');
  const context = drawLayer.getContext("2d");
  const overlayLayer = $('#overlay-layer');
  const overlayCtx = overlayLayer.getContext("2d");
  const container = $('#canvas-container');
  let oldPoint;
  let stoppedPainting;
	let painting = false;
  let points = [];
  const mouse = {
    x: 0,
    y: 0
  };

	const colours = {
		red: '#e53935',
		yellow: '#ffb300',
		green: '#43a047',
		cyan: '#1e88e5',
		blue: '#3949ab',
		magenta: '#8e24aa',
		black: '#212121',
		white: '#fafafa'
	};

	let selectedColour = colours.black;
	const weightedPeriod = 30;

  function paint(line, newEh) {
    clearInterval(stoppedPainting);

    if(newEh) {
      points = [line];
    } else {
      points.push(line);
    }

    let point = {};
    let delta = {
      x: 0,
      y: 0
    };

    if(points.length > weightedPeriod) {
      //Set the source the previous destination
      point = {
        from: points[0].from,
        to: {x: 0, y: 0}
      };

      //Sum the recent points with the nearest being heaviest
			for (let i = 0; i < weightedPeriod; i++) {
					point.to.x += points[i].to.x * (weightedPeriod - i);
					point.to.y += points[i].to.y * (weightedPeriod - i);
          delta.x += Math.abs(points[i].to.x - points[i+1].to.x) * (weightedPeriod - i);
          delta.y += Math.abs(points[i].to.y - points[i+1].to.y) * (weightedPeriod - i);
			}
			//Divide the sum to get the average
			point.to.x /= (( weightedPeriod * ( weightedPeriod + 1 )) / 2 );
			point.to.y /= (( weightedPeriod * ( weightedPeriod + 1 )) / 2 );
			delta.x /= (( weightedPeriod * ( weightedPeriod + 1 )) / 2 );
			delta.y /= (( weightedPeriod * ( weightedPeriod + 1 )) / 2 );

			//Set the next source to the current destination
			points[1].from = point.to;
			//Remove the last point from the list so we're only smoothing recents
			points = points.splice(1);
    } else {
      //There is not enough data, start from scratch
			point = {
				from: {x:0, y:0},
				to: {x: 0,y: 0}
			};
      const bufferSize = points.length - 1;
			for (let i = 0; i < bufferSize; i++) {
				//If the point has a source, average it. Otherwise average the destination
				if(points[i].from) {
					point.from.y += points[i].from.y * (bufferSize - i);
					point.from.x += points[i].from.x * (bufferSize - i);
				} else {
					point.from.y += points[i].to.y * (bufferSize - i);
					point.from.x += points[i].to.x * (bufferSize - i);
				}
					point.to.x += points[i].to.x * (bufferSize - i);
					point.to.y += points[i].to.y * (bufferSize - i);


        delta.x += Math.abs(points[i].to.x - points[i+1].to.x) * (bufferSize - i);
        delta.y += Math.abs(points[i].to.y - points[i+1].to.y) * (bufferSize - i);
			}
			point.from.x /= (( bufferSize * ( bufferSize + 1 )) / 2 );
			point.from.y /= (( bufferSize * ( bufferSize + 1 )) / 2 );
			point.to.x /= (( bufferSize * ( bufferSize + 1 )) / 2 );
			point.to.y /= (( bufferSize * ( bufferSize + 1 )) / 2 );
			delta.x /= (( bufferSize * ( bufferSize + 1 )) / 2 );
			delta.y /= (( bufferSize * ( bufferSize + 1 )) / 2 );
    }

    let velocity =  Math.max(Math.cbrt(Math.pow(delta.x, 2) + Math.pow(delta.y, 2)) * 4, 5);

		blit(point, velocity);

		if(points.length > 5) {
			stoppedPainting = setInterval(function () {
				catchUp();
			}, 20);
		}
  }

	function catchUp() {
		let point;
		let delta = {
			x: 0,
			y: 0
		};
		if(points.length > 1) {
			//There are more than weightedPeriod points in the list
			//Calculate the destination. The source is == the last destination.
			point = {
				from: points[0].from,
				to: {x: 0,y: 0}
			};

			//Sum the recent points, weighting the closest, highest.
      const bufferSize = points.length - 1;
			for (let i = 0; i < bufferSize; i++) {
					point.to.x += points[i].to.x * (bufferSize - i);
					point.to.y += points[i].to.y * (bufferSize - i);

          delta.x += Math.abs(points[i].to.x - points[i+1].to.x) * (bufferSize - i);
          delta.y += Math.abs(points[i].to.y - points[i+1].to.y) * (bufferSize - i);
			}

			//Divide the sum to get the average
			point.to.x /= (( bufferSize * ( bufferSize + 1 )) / 2 );
			point.to.y /= (( bufferSize * ( bufferSize + 1 )) / 2 );
			delta.x /= (( bufferSize * ( bufferSize + 1 )) / 2 );
			delta.y /= (( bufferSize * ( bufferSize + 1 )) / 2 );
			let velocity =  Math.max(Math.cbrt(Math.pow(delta.x, 2) + Math.pow(delta.y, 2)) * 4, 5);
			//Set the next source to the current destination
			points[1].from = point.to;
			//Remove the last point from the list so we're only smoothing recents
			points = points.splice(1);

			blit(point, velocity);
		} else {
			clearInterval(stoppedPainting);
		}
	}

	function blit(point, velocity) {
		context.lineJoin = 'round';
		context.lineWidth = velocity + 1;
		context.strokeStyle = selectedColour;
		context.beginPath();
		if(point.from && point.from.x) {
			context.moveTo(point.from.x, point.from.y);
		} else {
			context.moveTo(point.to.x-1, point.to.y);
		}
		context.lineTo(point.to.x, point.to.y);
		context.closePath();
		context.stroke();

    overlayCtx.clearRect(0, 0, overlayLayer.width, overlayLayer.height);
    if(mouse.x && mouse.y) {
      const x = (mouse.x - container.offsetLeft) * overlayLayer.width / overlayLayer.clientWidth;
      const y = (mouse.y - container.offsetTop) * overlayLayer.height / overlayLayer.clientHeight;
      overlayCtx.lineWidth = 3;
      overlayCtx.strokeStyle = '#333333';
      overlayCtx.beginPath();
      overlayCtx.moveTo(point.to.x, point.to.y);
      overlayCtx.lineTo(x, y);
      overlayCtx.closePath();
      overlayCtx.stroke();
    }
	}

	function layPaint(e, newEh) {
		if(newEh) {
			painting = true;
		}
		else if(painting === false) {
			return;
		}

		mouse.x = e.pageX || e.targetTouches[0].pageX;
		mouse.y = e.pageY || e.targetTouches[0].pageY;
		const newPoint = getPoint(mouse.x, mouse.y);
		const line = {
		  from: newEh ? null : oldPoint,
			to: newPoint,
			color: selectedColour
		};

		paint(line, newEh);
		oldPoint = newPoint;
	}

	function stopPaint(e) {
		painting = false;
    overlayCtx.clearRect(0, 0, overlayLayer.width, overlayLayer.height);

    mouse.x = 0;
    mouse.y = 0;
	}

	function getPoint(x, y) {
		return { x: (x - container.offsetLeft) / drawLayer.offsetWidth * drawLayer.width, y: (y - container.offsetTop) / drawLayer.offsetHeight * drawLayer.height};
	}

	// Disable text selection on the canvas
	drawLayer.addEventListener('mousedown', function () {return false;}, true);

	drawLayer.addEventListener('mousedown', function (e) { layPaint(e, true);}, true);
	drawLayer.addEventListener('touchstart', function (e) { layPaint(e, true);}, true);

	drawLayer.addEventListener('mousemove', layPaint, true);
	drawLayer.addEventListener('touchmove', layPaint, true);

  drawLayer.addEventListener('mouseout', stopPaint, true);
	drawLayer.addEventListener('mouseup', stopPaint, true);
	drawLayer.addEventListener('touchend', stopPaint, true);
	drawLayer.addEventListener('touchcancel', stopPaint, true);

  /** Palette */
  const colourButtons = $('#palette');

  function changeColour(e) {
    selectedColour = colours[e.target.className];
  }
  colourButtons.addEventListener('click', changeColour, true);

  /** Clear Canvas */
  const clearButton = $('#clear-button');

  function clearCanvas(e) {
    context.clearRect(0, 0, drawLayer.width, drawLayer.height);
  }
	clearButton.addEventListener('click', clearCanvas, true);

  /** Share Functionality */
  const shareButton = $('#share-button');
	const sharePanel = $('#share-panel');
	let shareEh = false;
  function toggleShare(e) {
    shareEh = !shareEh;

		if(shareEh) {
			sharePanel.className = "fixed";
		} else {
			sharePanel.className = "fixed hide";
		}
  }
  shareButton.addEventListener('click', toggleShare, true);
})();
