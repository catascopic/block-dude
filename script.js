'use strict';

var SPRITES = [
	'EMPTY',
	'WALL',
	'BLOCK',
	'GOAL',
];
	
var Type = {
	'EMPTY': 0,
	'WALL' : 1,
	'BLOCK' : 2,
	'GOAL': 3
};

var LEVELS = getLevels();
	
var row;
var col;
var dir;
var carrying;
var grid;
var currentLevel = 0;
var saveGame;
var autoClimb = false;

function draw() {
	let screen = document.getElementById('screen');
	let rows = screen.children;
	for (let i = 0; i < grid.length; i++) {
		let cells = rows[i].children;
		for (let j = 0; j < grid[0].length; j++) {
			let sprite;
			if (i == row && j == col) {
				sprite = dir == 1 ? 'PLAYER_RIGHT' : 'PLAYER_LEFT';
			} else if (carrying && i == row - 1 && j == col) {
				sprite = 'BLOCK';
			} else {
				sprite = SPRITES[grid[i][j]];
			}
			cells[j].firstChild.src = 'sprites/' + sprite + '.bmp';
		}
	}
	document.getElementById('saveMessage').innerText = '';
}

function resize() {
	let screen = document.getElementById('screen');
	while (screen.firstChild) {
		screen.removeChild(screen.firstChild);
	}
	for (let i = 0; i < grid.length; i++) {
		let tableRow = document.createElement('TR');
		for (let j = 0; j < grid[i].length; j++) {
			let cell = document.createElement('TD');			
			cell.appendChild(document.createElement('IMG'));
			tableRow.appendChild(cell);
		}
		screen.appendChild(tableRow);
	}
}

function loadLevel(level) {
	grid = copy(level.map);
	row = level.row;
	col = level.col;
	dir = level.dir;
	carrying = level.carrying || false;
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
	if (grid[row][col] == Type.GOAL) {
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
		if (grid[row][col + dir] == Type.BLOCK
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
	return grid[i][j] == Type.EMPTY || grid[i][j] == Type.GOAL;
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
	grid[i][j] = 0;
	carrying = true;
}

function dropBlock(i, j) {
	let gravity = i;
	while (isBlank(gravity + 1, j)) {
		gravity++;
	}
	grid[gravity][j] = 2;
	carrying = false;
}

function nextLevel() {
	currentLevel++;
	loadNewLevel(currentLevel);
	document.getElementById('levelSelector').value = currentLevel;
}

function save() {
	saveGame = {
		map: copy(grid),
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
	resize();
	draw();
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
	loadNewLevel(currentLevel);
	document.getElementById('levelSelector').value = 0;
	setAutoClimb();
};

/*
Level  1: tcP
Level  2: ARo
Level  3: CKs
Level  4: daN
Level  5: BAH
Level  6: Ion
Level  7: Twe
Level  8: nTy
Level  9: iRC
Level 10: JmK
Level 11: wTF
*/