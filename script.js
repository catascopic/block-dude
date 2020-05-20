'use strict';
	
const EMPTY = 0;
const WALL = 1;
const BLOCK = 2;
const GOAL = 3;
const DUDE_LEFT = 4;
const DUDE_RIGHT = 5;

const SPRITE_DIM = 8;
const SCALE = 3;
const SPRITE_DIM_SCALE = SPRITE_DIM * SCALE;

var levels = getLevels();

var sprites;
var canvas;
var context;
var saveMessage;

var map;
var row;
var col;
var dir;
var carrying;

var currentLevel = 0;
var saveGame;
var autoClimb = false;

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
	showSaveMessage('');
}

function drawSprite(i, j, sprite) {
	context.drawImage(sprites,
			// sprite x, y, h, w
			sprite * SPRITE_DIM, 0, SPRITE_DIM, SPRITE_DIM,
			// canvas x, y, h, w
			j * SPRITE_DIM_SCALE, i * SPRITE_DIM_SCALE, SPRITE_DIM_SCALE, SPRITE_DIM_SCALE);
}

function loadLevel(level) {
	map = copy(level.map);
	row = level.row;
	col = level.col;
	dir = level.dir;
	carrying = level.carrying || false;
	draw();
}

function key(event) {
	let moved = false;
	switch(event.key) {
		case 'ArrowLeft': 
		case 'a':
			moved = left();
			break;
		case 'ArrowRight':
		case 'd':
			moved = right();
			break;
		case 'ArrowUp':
		case 'w':
			moved = up();
			break;
		case 'ArrowDown':
		case 's':
			moved = down();
			break;
		case '=':
			save();
			break;
		case '-':
			load();
			break;
		case 'm':
			restart();
			break;
		case 'Enter':
			toggleControls();
			break;
		default:
			return;
	}
	event.preventDefault();
	if (map[row][col] == GOAL) {
		nextLevel();
	} else if (moved) {
		draw();
	}
}

function left() {			
	return moveDirection(-1);
}

function right() {
	return moveDirection(1);
}

function moveDirection(dir) {
	let moved = setDirection(dir);
	moved |= moveForward();
	if (moved) {
		return true;
	}
	if (autoClimb) {
		return up();
	}
	return false;
}

function up() {
	if (
			// space in front of you must be solid
			!isBlank(row, col + dir)
			// space over your head you must be clear
			&& isBlank(row - 1, col)
			// space you're climbing to must be clear
			&& isBlank(row - 1, col + dir) 
			// if you're carrying a block, 2 spaces over your head must be clear
			&& (!carrying || isBlank(row - 2, col + dir))) {
		col += dir;
		row--;
		return true;
	}
	return false;
}

function down() {
	if (carrying) {
		if (isBlank(row - 1, col + dir)) {
			dropBlock(row - 1, col + dir);
			return true;
		}
	} else if (
			// space in front of you must be a block
			map[row][col + dir] == BLOCK
			// space over your head must be clear
			&& isBlank(row - 1, col)
			// space over the block must be clear
			&& isBlank(row - 1, col + dir)) {
		pickUpBlock(row, col + dir);
		return true;
	}
	return false;
}

function isBlank(i, j) {
	return map[i][j] == EMPTY || map[i][j] == GOAL;
}

function setDirection(newDir) {
	if (dir == newDir) {
		return false;
	}
	dir = newDir;
	return true;
}

function moveForward() {
	if (isBlank(row, col + dir)) {
		col += dir;
		if (carrying && !isBlank(row - 1, col)) {
			dropBlock(row - 1, col - dir);
		}
		while (isBlank(row + 1, col)) {
			row++;
		}
		return true;
	}
	return false;
}

function pickUpBlock(i, j) {
	map[i][j] = EMPTY;
	carrying = true;
}

function dropBlock(i, j) {
	let gravity = i;
	while (isBlank(gravity + 1, j)) {
		gravity++;
	}
	map[gravity][j] = BLOCK;
	carrying = false;
}

function nextLevel() {
	currentLevel = (currentLevel + 1) % 12;
	loadNewLevel(currentLevel);
	document.getElementById('levelSelector').value = currentLevel;
}

function save() {
	saveGame = {
		map: copy(map),
		row: row,
		col: col,
		dir: dir,
		carrying: carrying
	};
	showSaveMessage('Game saved!');
}

function load() {
	if (saveGame) {
		loadLevel(saveGame);
		draw();
	}
}

function restart() {
	loadLevel(levels[currentLevel]);
	draw();
}

function loadNewLevel(levelNum) {
	saveGame = undefined;
	loadLevel(levels[levelNum]);
}

function selectLevel() {
	currentLevel = Number(document.getElementById('levelSelector').value);
	loadNewLevel(currentLevel);
}

function setAutoClimb() {
	autoClimb = document.getElementById('autoClimb').checked;
}

function toggleControls() {
	document.getElementById('controlBox').hidden ^= true;
}

function showSaveMessage(message) {
	saveMessage.innerText = message;
}

function copy(array) {
	return array.map(row => row.slice());
}

window.onload = function() {
	saveMessage = document.getElementById('saveMessage');
	canvas = document.getElementById('screen');
	context = canvas.getContext('2d');
	context.imageSmoothingEnabled = false;
	document.getElementById('levelSelector').value = 0;
	setAutoClimb();
	sprites = new Image();
	sprites.addEventListener('load', function() {
		loadNewLevel(currentLevel);
	}, false);
	sprites.src = 'sprites.bmp';
};
