'use strict';
	
var Type = {
	'EMPTY': 0,
	'WALL' : 1,
	'BLOCK' : 2,
	'GOAL': 3,
	'DUDE_LEFT': 4,
	'DUDE_RIGHT': 5
};

var LEVELS = getLevels();

var sprites;
var canvas;
var context;

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
				sprite = dir == 1 ? Type.DUDE_RIGHT : Type.DUDE_LEFT;
			} else if (carrying && i == row - 1 && j == col) {
				sprite = Type.BLOCK;
			} else {
				sprite = mapRow[j];
			}
			context.drawImage(sprites, 
					sprite * 24, 0, 24, 24, // sprite x, y, h, w
					j * 24, i * 24, 24, 24); // canvas x, y, h, w	
		}
	}
	document.getElementById('saveMessage').innerText = '';
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
	if (map[row][col] == Type.GOAL) {
		if (currentLevel == 10) {
			winScreen();
		} else {
			nextLevel();
		}
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
	// space in front of you must be solid
	if (!isBlank(row, col + dir)
			// space over your head you must be clear
			&& isBlank(row - 1, col)
			// space you're climbing to must be clear
			&& isBlank(row - 1, col + dir) 
			// if you're carrying a block, space 2 above you must be clear
			&& (!carrying || isBlank(row - 2, col + dir))) {
		col += dir;
		row--;
		return true;
	}
	return false;
}

function down() {
	let wasCarrying = carrying;
	if (carrying) {
		if (isBlank(row - 1, col + dir)) {
			dropBlock(row - 1, col + dir);
		}
	} else {
		// space in front of you must be a block
		if (map[row][col + dir] == Type.BLOCK
			// space over your head must be clear
			&& isBlank(row - 1, col)
			// space over the block must be clear
			&& isBlank(row - 1, col + dir)) {
			pickUpBlock(row, col + dir);
		}
	}
	return carrying != wasCarrying;
}

function isBlank(i, j) {
	return map[i][j] == Type.EMPTY || map[i][j] == Type.GOAL;
}

function setDirection(newDir) {
	let changed = (newDir != dir);
	dir = newDir;
	return changed;
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
	map[i][j] = 0;
	carrying = true;
}

function dropBlock(i, j) {
	let gravity = i;
	while (isBlank(gravity + 1, j)) {
		gravity++;
	}
	map[gravity][j] = 2;
	carrying = false;
}

function nextLevel() {
	currentLevel++;
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
	document.getElementById('saveMessage').innerText = 'Game saved!';
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

function winScreen() {
	document.body.innerHTML = '<img src="sprites/ayy_lmao.jpg">';
}

function copy(x) {
	// don't judge me
	return JSON.parse(JSON.stringify(x));
}

window.onload = function() {
	sprites = new Image();
	sprites.src = 'sprites.bmp';
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
