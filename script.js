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
	document.getElementById('undo').innerText = undoMoves.map(m => m.name).join('');
	let redoMoveCodes = redoMoves.map(m => m.name);
	redoMoveCodes.reverse();
	document.getElementById('redo').innerText = redoMoveCodes.join('');
}

function drawSprite(i, j, sprite) {
	if (sprite) {
		context.drawImage(
			sprites,
			// sprite x, y, h, w
			sprite * SPRITE_SRC_SIZE, 0, SPRITE_SRC_SIZE, SPRITE_SRC_SIZE,
			// canvas x, y, h, w
			j * spriteDispSize, i * spriteDispSize, spriteDispSize, spriteDispSize
		);
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
}

function touch(e) {
	let bounding = canvas.getBoundingClientRect();
	let touchI = (e.clientY - bounding.top ) / spriteDispSize;
	let touchJ = (e.clientX - bounding.left) / spriteDispSize;
	let spriteI = Math.trunc(touchI);
	let spriteJ = Math.trunc(touchJ);
	console.log(Math.abs(touchJ - col - .5) <= 1 ? 'YES' : 'NO');
	let moved = null;
	if (spriteI == row && spriteJ == col) {
		undo();
	} else {
		if (Math.abs(touchJ - col - .5) <= 1 /* below diagonal */) {
			if (touchI < row) {
				moved = up();
			} else {
				moved = down();
			}
		} else {
			if (spriteJ < col) {
				moved = left();
			} else {
				moved = right();
			}
		}
	}
	e.preventDefault();
}

// MOVE FUNCTIONS

function left() {			
	return moveDirection('🠜', -1);
}

function right() {
	return moveDirection('🠞', 1);
}

function moveDirection(name, newDir, climb=false) {
	let move = { name };

	if (dir != newDir) {
		dir = newDir;
		move.turn = -1;
	}

	if (isEmpty(row, col + dir)) {
		col += dir;
		move.step = dir;
		if (carrying && !isEmpty(row - 1, col)) {
			move.drop = dropBlock(row - 1, col - dir);
		}
		if (isEmpty(row + 1, col)) {
			let gravity = 0
			do {
				gravity++;
			} while (isEmpty(row + gravity + 1, col));
			row += gravity;
			move.fall = gravity;
		}
	}

	if (move.turn || move.step) {
		finishMove(move);
	} else if (climb || autoClimb) {
		up();
	}
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
		&& (!carrying || isEmpty(row - 2, col + dir))
	) {
		col += dir;
		row--;
		finishMove({ name: '🠝', step: dir, fall: -1 });
	}
}

function down() {
	if (carrying) {
		if (map[row - 1][col + dir] == EMPTY) {
			finishMove({ name: '🠟', drop: dropBlock(row - 1, col + dir) });
		}
	} else if (
		// space in front of you must be a block
		map[row][col + dir] == BLOCK
		// space over your head must be clear
		&& isEmpty(row - 1, col)
		// space over the block must be clear
		&& isEmpty(row - 1, col + dir)
	) {
		pickUpBlock(row, col + dir);
		finishMove({ name: '🠟', pickUp: true });
	}
}

function finishMove(move) {
	if (map[row][col] == GOAL) {
		nextLevel();
	} else {
		undoMoves.push(move);
		redoMoves.length = 0;
		draw();
	}
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
	({ map, row, col, dir, carrying = false } = LEVELS[levelIndex]);
	map = structuredClone(map);
	draw();
}

function restart() {
	loadLevel();
	undoMoves.reverse();
	redoMoves.push(...undoMoves);
	undoMoves.length = 0;
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

function toggleControls() {
	document.getElementById('controls').classList.toggle('hide');
}

function rescale(newScale) {
	setScale(newScale);
	context.imageSmoothingEnabled = false;
	draw();
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
	autoClimb = document.getElementById('autoClimb').checked;
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
