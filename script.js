'use strict';
	
var EMPTY = 0;
var WALL = 1;
var BLOCK = 2;
var GOAL = 3;
var DUDE_LEFT = 4;
var DUDE_RIGHT = 5;

var LEVELS = getLevels();

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
	for (let i = 0; i < map.length; i++) {
		let mapRow = map[i];
		for (let j = 0; j < mapRow.length; j++) {
			let sprite;
			if (i == row && j == col) {
				sprite = dir == 1 ? DUDE_RIGHT : DUDE_LEFT;
			} else if (carrying && i == row - 1 && j == col) {
				sprite = BLOCK;
			} else {
				sprite = mapRow[j];
			}
			context.drawImage(sprites, 
					sprite * 24, 0, 24, 24, // sprite x, y, h, w
					j * 24, i * 24, 24, 24); // canvas x, y, h, w	
		}
	}
	showSaveMessage('');
}

function loadLevel(level) {
	map = copy(level.map);
	row = level.row;
	col = level.col;
	dir = level.dir;
	carrying = level.carrying || false;
	draw();
}

function keyPress(event) {
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
	moved |= move();
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

function move() {
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
	loadLevel(LEVELS[currentLevel]);
	draw();
}

function loadNewLevel(levelNum) {
	saveGame = undefined;
	loadLevel(LEVELS[levelNum]);
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
	let copyArray = new Array(array.length);
	for (let i = 0; i < array.length; i++) {
		copyArray[i] = array[i].slice(0);
	}
	return copyArray;
}

window.onload = function() {
	saveMessage = document.getElementById('screen');
	canvas = document.getElementById('screen');
	context = canvas.getContext('2d');
	document.getElementById('levelSelector').value = 0;
	setAutoClimb();
	sprites = new Image();
	sprites.addEventListener('load', function() {
		loadNewLevel(currentLevel);
	}, false);
	sprites.src = 'sprites.bmp';
};
