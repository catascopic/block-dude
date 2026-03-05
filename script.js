'use strict';

const SPRITE_SRC_SIZE = 8;
const BASE_SCREEN_WIDTH = SPRITE_SRC_SIZE * 29;
const BASE_SCREEN_HEIGHT = SPRITE_SRC_SIZE * 19;

const BASE_SCALE = 3;

var scale = BASE_SCALE;
var spriteDispSize = SPRITE_SRC_SIZE * BASE_SCALE;

var sprites;
var canvas;
var context;

const EMPTY = 0;
const WALL = 1;
const BLOCK = 2;
const GOAL = 3;
const DUDE_LEFT = 4;
const DUDE_RIGHT = 5;

var map;
var row;
var col;
var dir;
var carrying;

var levelIndex = 0;
var autoClimb = true;

var undoMoves = [];
var redoMoves = [];

function draw() {
	context.clearRect(0, 0, canvas.width, canvas.height);
	let height = map.length;
	let width = map[0].length;
	for (let i = 0; i < height; i++) {
		for (let j = 0; j < width; j++) {
			drawSprite(i, j, map[i][j]);
		}
	}
	drawSprite(row, col, dir == 1 ? DUDE_RIGHT : DUDE_LEFT);
	if (carrying) {
		drawSprite(row - 1, col, BLOCK);
	}
	displayMoveHistory();
}

function displayMoveHistory() {
	/*
	document.getElementById('undo').innerText = undoMoves.map(m => m.move[0]).join('');
	let redoMoveCodes = redoMoves.map(m => m.move[0]);
	redoMoveCodes.reverse();
	document.getElementById('redo').innerText = redoMoveCodes.join('');
	*/
}

function drawSprite(i, j, sprite) {
	if (sprite) {
		context.drawImage(sprites,
				// sprite x, y, h, w
				sprite * SPRITE_SRC_SIZE, 0, SPRITE_SRC_SIZE, SPRITE_SRC_SIZE,
				// canvas x, y, h, w
				j * spriteDispSize, i * spriteDispSize, spriteDispSize, spriteDispSize);
	}
}

function key(e) {
	let moved = null;
	switch(e.key.toLowerCase()) {
		case 'a': case 'arrowleft': 
			moved = left();
			break;
		case 'd': case 'arrowright':
			moved = right();
			break;
		case 'w': case 'arrowup':
			moved = up();
			break;
		case 's': case 'arrowdown': 
			moved = down();
			break;
		case 'z':
			undo();
			break;
		case 'y':
			redo();
			break;
		case 'm':
			restart();
			break;
		case 'l':
			toggleAutoClimb();
			break;
		case 'b':
			setBackground(e.shiftKey ? BACKGROUNDS.length - 1 : 1);
			break;
		case 'enter':
			toggleControls();
			break;
		default:
			return;
	}
	e.preventDefault();
	if (map[row][col] == GOAL) {
		nextLevel();
	} else if (moved) {
		undoMoves.push(moved);
		// is this the best way to clear the stack?
		redoMoves.length = 0;
		draw();
	}
}

function touch(e) {
	let bounding = canvas.getBoundingClientRect();
	let touchI = Math.trunc((e.clientY - bounding.top ) / spriteDispSize);
	let touchJ = Math.trunc((e.clientX - bounding.left) / spriteDispSize);
	console.log(touchI, touchJ, row, col);
	let moved = null;
	if (touchI == row && touchJ == col) {
		undo();
	} else {
		let deltaI = touchI - row;
		let deltaJ = touchJ - col;
		if (Math.abs(deltaI) > Math.abs(deltaJ)) {
			if (deltaI < 0) {
				moved = up();
			} else {
				moved = down();
			}
		} else {
			if (deltaJ < 0) {
				moved = left();
			} else {
				moved = right();
			}
		}
	}
	e.preventDefault();
	if (map[row][col] == GOAL) {
		nextLevel();
	} else if (moved) {
		undoMoves.push(moved);
		// is this the best way to clear the stack?
		redoMoves.length = 0;
		draw();
	}
}

// MOVE FUNCTION

function left() {			
	return moveDirection('Left', -1);
}

function right() {
	return moveDirection('Right', 1);
}

function moveDirection(move, newDir, climb=false) {
	let moved = false;
	let result = { move: move };
	
	if (dir != newDir) {
		dir = newDir;
		moved = true;
		result.turn = -1;
	}

	if (isEmpty(row, col + dir)) {
		col += dir;
		moved = true;
		result.step = dir;
		if (carrying && !isEmpty(row - 1, col)) {
			result.drop = dropBlock(row - 1, col - dir);
		}
		if (isEmpty(row + 1, col)) {
			let gravity = 0
			do {
				gravity++;
			} while (isEmpty(row + gravity + 1, col));
			row += gravity;
			result.fall = gravity;
		}
	}
	
	if (moved) {
		return result;
	}
	if (climb || autoClimb) {
		return up();
	}
	return null;
}

function up() {
	if (
			// space in front of you must be solid
			!isEmpty(row, col + dir)
			// space over your head you must be clear
			&& isEmpty(row - 1, col)
			// space you're climbing to must be clear
			&& isEmpty(row - 1, col + dir) 
			// if you're carrying a block, 2 spaces over your head must be clear
			&& (!carrying || isEmpty(row - 2, col + dir))) {
		col += dir;
		row--;
		return {move: 'Up', step: dir, fall: -1};
	}
	return null;
}

function down() {
	if (carrying) {
		if (map[row - 1][col + dir] == EMPTY) {
			return {move: 'Down', drop: dropBlock(row - 1, col + dir)};
		}
	} else if (
			// space in front of you must be a block
			map[row][col + dir] == BLOCK
			// space over your head must be clear
			&& isEmpty(row - 1, col)
			// space over the block must be clear
			&& isEmpty(row - 1, col + dir)) {
		pickUpBlock(row, col + dir);
		return {move: 'Down', pickUp: true};
	}
	return null;
}

function isEmpty(i, j) {
	return map[i][j] == EMPTY || map[i][j] == GOAL;
}

function pickUpBlock(i, j) {
	map[i][j] = EMPTY;
	carrying = true;
}

function dropBlock(i, j) {
	let gravity = i;
	while (map[gravity + 1][j] == EMPTY) {
		gravity++;
	}
	map[gravity][j] = BLOCK;
	carrying = false;
	return { row: gravity, col: j };
}

// UNDO FUNCTIONS

function undo() {
	if (undoMoves.length) {
		let move = undoMoves.pop();
		redoMoves.push(move);
		dir *= move.turn || 1;
		col -= move.step || 0;
		row -= move.fall || 0;
		if (move.drop) {
			pickUpBlock(move.drop.row, move.drop.col);
		} else if (move.pickUp) {
			map[row][col + dir] = BLOCK;
			carrying = false;
		}
		draw();
	}
}

function redo() {
	if (redoMoves.length) {
		let move = redoMoves.pop();
		undoMoves.push(move);
		dir *= move.turn || 1;
		col += move.step || 0;
		row += move.fall || 0;
		if (move.drop) {
			map[move.drop.row][move.drop.col] = BLOCK;
			carrying = false;
		} else if (move.pickUp) {
			pickUpBlock(row, col + dir);
		}
		draw();
	}
}

// LEVEL FUNCTIONS

function loadLevel() {
	let level = LEVELS[levelIndex];
	map = copy(level.map);
	row = level.row;
	col = level.col;
	dir = level.dir;
	carrying = level.carrying || false;
	draw();
}

function restart() {
	loadLevel();
	while (undoMoves.length) {
		redoMoves.push(undoMoves.pop());
	}
	draw();
}

function setLevel(newLevelIndex) {
	levelIndex = newLevelIndex;
	undoMoves.length = 0;
	redoMoves.length = 0;
	loadLevel();
}

function nextLevel() {
	setLevel((levelIndex + 1) % LEVELS.length);
	document.getElementById('levelSelector').value = levelIndex;
}

function selectLevel() {
	setLevel(Number(document.getElementById('levelSelector').value));
}

function toggleAutoClimb() {
	autoClimb ^= true;
	document.getElementById('autoClimb').checked = autoClimb;
}

function setAutoClimb() {
	autoClimb = document.getElementById('autoClimb').checked;
}

function toggleControls() {
	document.getElementById('controls').classList.toggle('hide');
}

function rescale(newScale) {
	setScale(newScale);
	context.imageSmoothingEnabled = false;
	draw();
}

function copy(_2dArray) {
	return _2dArray.map(function(subArray) {
		return subArray.slice();
	});
}

window.onload = function() {
	canvas = document.getElementById('screen');
	context = canvas.getContext('2d');
	if (window.devicePixelRatio == 1.5) {
		// check for other ratios?
		setScale(2);
	}
	context.imageSmoothingEnabled = false;
	document.getElementById('levelSelector').value = 0;
	setAutoClimb();
	sprites = new Image();
	sprites.addEventListener('load', function() {
		loadLevel();
	}, false);
	sprites.src = 'sprites.png';
};

function setScale(newScale) {
	scale = newScale;
	spriteDispSize = SPRITE_SRC_SIZE * scale;
	canvas.width = BASE_SCREEN_WIDTH * scale;
	canvas.height = BASE_SCREEN_HEIGHT * scale;
}

// EXPERIMENTAL

var backgroundIndex = 0;

const BACKGROUNDS = [
	{ color: 'black', backgroundColor: '#E0DFDB' },
	{ color: 'black', backgroundColor: '#B7C8B6' },
	{ color: 'black', backgroundColor: '#73B1B7' },
	{ color: 'black', backgroundColor: '#D8D8BF' },
	{ color: 'black', backgroundColor: 'white' },
	{ color: '#BBBBBB', backgroundColor: '#24388a' },
];

function setBackground(d) {
	backgroundIndex += d;
	backgroundIndex %= BACKGROUNDS.length;
	Object.assign(document.body.style, BACKGROUNDS[backgroundIndex]);
}
