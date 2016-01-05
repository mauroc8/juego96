
"use strict";

//////////////////////////////////////////////////////////////////////////////////////////
function Cursor( x, y ) {
	this.x = x;
	this.y = y;
}
Cursor.prototype.add = function( cursor, y ) {
	if( cursor instanceof Cursor )
		return new Cursor( this.x+cursor.x, this.y+cursor.y );
	else return new Cursor(this.x+cursor, this.y+y);
}
Cursor.prototype.minus = function( cursor ) {
	return new Cursor( this.x - cursor.x, this.y-cursor.y);
}
Cursor.prototype.isEqualTo = function( cursor ) {
	return this.x == cursor.x && this.y == cursor.y;
}

//////////////////////////////////////////////////////////////////////////////////////////
function Grid( width, height ) {
	this.width = width;
	this.height = height;
	this.grid = new Array( width * height );
	for( var i = 0; i < this.grid.length; i++ )
		this.grid[i] = " ";
}

Grid.prototype.toString = function() {
	var str = "";
	for(var i = 0; i < this.height; i++) {
		for(var j = 0; j < this.width; j++)
			str += this.grid[j + i*this.width] || " ";
		if(i<this.height-1) str += "\n";
	}
	return str;
}

Grid.prototype.set = function( cursor, ch ) {
	this.grid[ cursor.x + cursor.y*this.width ] = ch[0];
}
Grid.prototype.get = function( cursor ) {
	return this.grid[ cursor.x + cursor.y*this.width ];
}
Grid.prototype.isInside = function( cursor ) {
	return cursor.x >= 0 && cursor.x < this.width &&
		cursor.y >= 0 && cursor.y < this.height;
}
Grid.prototype.look = function( character ) {
	var ret = [];
	this.grid.forEach(function(char, index) {
		if( char === character )
			ret.push( new Cursor( index % this.width, Math.floor( index/this.width ) ) );
	}, this);
	return ret;
}
Grid.prototype.write = function( cursor, text ) {
	for( var i = 0; i < text.length; i++ )
		this.set(cursor.add( new Cursor(i, 0) ), text[i]);
}

//////////////////////////////////////////////////////////////////////////////////////////
function Character( grid, cursor, ch ) {
	grid.set(cursor, ch);
	this.grid = grid;
	this.cursor = cursor;
	this.char = ch;
}
Character.prototype.erase = function() {
	this.grid.set(this.cursor, " ");
}
Character.prototype.write = function() {
	this.grid.set(this.cursor, this.char);
}
Character.prototype.move = function( cursor ) {
	if(this.freeze) return false;
	var newCurs =  this.cursor.add( cursor );
	if( this.grid.isInside( newCurs )
		&& this.onCollide(this.grid.get(newCurs), newCurs) ) {
		this.erase();
		this.cursor = newCurs;
		this.write();
		this.onMove( newCurs );
	}
}
Character.prototype.onCollide = function() { return true; };
Character.prototype.onMove = function() {};

//////////////////////////////////////////////////////////////////////////////////////////
function Map( sketch ) {
	this.grid = new Grid(sketch[0].length, sketch.length);
	sketch.forEach(function(line, y) {
		for(var x = 0; x < line.length; x++)
			this.grid.set( new Cursor(x,y), line[x] );
	}, this);
}
Map.prototype.toString = function() {
	return this.grid.toString();
}
Map.prototype.addCharacter = function(cursor, char) {
	return new Character(this.grid, cursor, char);
}

//////////////////////////////////////////////////////////////////////////////////////////
function Level( sketch ) {
	this.sketch = sketch;
	this.map = new Map(sketch);
	var players = this.map.grid.look("^");
	var stars = this.map.grid.look("⋆");
	if( players[0].x > players[1].x) {
		players.push( players.shift() );
	}
	if( stars[0].x > stars[1].x) {
		stars.push( stars.shift() );
	}
	this.player = this.map.addCharacter( players[0], "↑" );
	this.mirror = this.map.addCharacter( players[1], "↓" );
	this.player.star = this.map.addCharacter( stars[0], "⋆" );
	this.mirror.star = this.map.addCharacter( stars[1], "⋆" );
	var level = this;
	this.player.onCollide = function(char, pos) {
		if(char=="#" || char=="|" || char=="-") {
			this.write();
			return false;
		} if(char=="%") {
			this.freeze = true;
			this.char = "¬";
			level.status = -1;
			level.onStatusChange();
		}
		return true;
	}
	this.mirror.onCollide = this.player.onCollide;
	this.player.onMove = function(pos) {
		if(pos.isEqualTo(this.star.cursor))
			this.isOnStar = true;
		else {
			this.isOnStar = false;
			this.star.write();
		}
	}
	this.mirror.onMove = this.player.onMove;

	this.status = 0;
}

Level.prototype.pause = function() {
	this.player.freeze = this.mirror.freeze = true;
}
Level.prototype.resume = function() {
	this.player.freeze = this.mirror.freeze = false;
}
Level.prototype.toString = function() {
	return this.map.toString();
}
Level.prototype.onStatusChange = function() {}


//////////////////////////////////////////////////////////////////////////////////////////

function Game() {
	this.levelSketches = [];
	this.currentLevel = 0; // current level number
	this.level = null;
	
	var game = this;
	window.addEventListener("keydown", function(event) {
		var code = event.keyCode;
		if(code==37) {
			event.preventDefault();
			game.level.player.char = "←"; game.level.mirror.char = "→";
			game.level.player.move(new Cursor(-1,0));
			game.level.mirror.move(new Cursor(1,0));
		} else if(code==38) {
			event.preventDefault();
			game.level.player.char = "↑"; game.level.mirror.char = "↓";
			game.level.player.move(new Cursor(0,-1));
			game.level.mirror.move(new Cursor(0,1));
		} else if(code==39) {
			event.preventDefault();
			game.level.player.char = "→"; game.level.mirror.char = "←";
			game.level.player.move(new Cursor(1,0));
			game.level.mirror.move(new Cursor(-1,0));
		} else if(code==40) {
			event.preventDefault();
			game.level.player.char = "↓"; game.level.mirror.char = "↑";
			game.level.player.move(new Cursor(0,1));
			game.level.mirror.move(new Cursor(0,-1));
		} else if(code==82) { // R: restart
			event.preventDefault();
			game.loadLevel();
		}
		if( game.level.status == 0 && game.level.player.isOnStar && game.level.mirror.isOnStar ) {
			game.level.pause();
			game.level.status = 1;
			game.level.onStatusChange();
		}
		game.refresh();
	});
}

Game.prototype.addLevel = function( sketch ) {
	this.levelSketches.push( sketch );
}
Game.prototype.loadLevel = function() {
	if( !this.levelSketches[this.currentLevel] )
		this.level = new Level([
			"                       ",
			"  ⋆                 ^  ",
			"                       ",
			"  ¡Ganaste!            ",
			"      Juego hecho por  ",
			"   Mauro C.B.          ",
			"        Contactate:    ",
			" maurocanablusa@       ",
			"             gmail.com ",
			"                       ",
			"                       ",
			"  ^                 ⋆  ",
			"                       "
		]);
	else
		this.level = new Level( this.levelSketches[ this.currentLevel ] );
	this.refresh();

	var game = this;
	this.level.onStatusChange = function() {
		if( this.status === 1 ) {
			this.pause();
			game.currentLevel++;
		}

		setTimeout(function() {
			game.loadLevel();
		}, 1000);
	}
}
Game.prototype.refresh = function() {}


//////////////////////////////////////////////////////////////////////////////////////////

var scale = 32;
var tileset = document.createElement("img");
tileset.src = "tiles.png";
var char_count = [1, 1, 1, 1], wall_count = 0;
var onTilesetLoad = function() { }, tilesetLoaded = false;
tileset.addEventListener("load", function() {
	tilesetLoaded = true;
	onTilesetLoad();
});

function canvasRenderer(map, cx) {
	var str = map.toString();
	var arr = str.split("\n");
	cx.canvas.width = arr[0].length * scale + 2;
	cx.canvas.height = arr.length * scale + 2;
	cx.translate(1,1);
	cx.font = scale + "px monospace";
	cx.textAlign = "center";
	cx.textBaseline = "middle";
	wall_count = 0;
	
	arr.forEach(function(line, y) {
		for(var x = 0; x<line.length;x++) {
			//fondo
			cx.drawImage( tileset,
			             0,         scale * 2, scale, scale,
			             x * scale, y * scale, scale, scale);
			//caracter
			if( line[x] != " " )
				drawCanvasTile( cx, line[x], x, y );
		}
	});
}

function drawCanvasTile( cx, char, x, y ) {
	var radius = scale/2;
	switch( char ) {
		case "#":
		case "|":
			cx.drawImage( tileset,
			             scale * ( 1 + wall_count ), scale * 2, scale, scale,
			             x * scale, y * scale, scale, scale);
			wall_count = wall_count == 1 ? 0 : 1;
			break;
		case "%":
			cx.drawImage( tileset,
			             scale * Math.floor(Math.random() * 3), scale * 3, scale, scale,
			             x * scale, y * scale, scale, scale );
			break;
		case "¬":
			cx.drawImage( tileset,
			             scale * 3, scale * 3, scale, scale,
			             x* scale, y*scale, scale, scale );
			break;
		case "↓":
		case "^":
			drawChar( cx, 0, x, y );
			break;
		case "←":
			drawChar( cx, 1, x, y );
			break;
		case "→":
			drawChar( cx, 2, x, y );
			break;
		case "↑":
			drawChar( cx, 3, x, y );
			break;
		case "⋆":
			cx.drawImage( tileset,
			             scale * 3, scale * 2, scale, scale,
			             x * scale, y * scale, scale, scale);
			break;
		default:
			cx.fillStyle = "black";
			cx.fillText(char, x*scale + radius + 1, y*scale+radius+1);
			cx.fillStyle = "white";
			cx.fillText(char, x*scale+radius, y*scale+radius);
			break;
	}
}

function drawChar( cx, index, x, y ) {
	cx.drawImage( tileset,
	             scale * index, scale * char_count[index], scale, scale,
	             x * scale, y * scale, scale, scale );
	char_count[index] = char_count[index] == 0 ? 1 : 0;
	cx.fillStyle = "transparent";
}