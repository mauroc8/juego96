
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
	}
}
Character.prototype.onCollide = function() { return true; };

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
	var stars = this.map.grid.look("⋆");
	if( stars[0].x > stars[1].x) {
		stars.push( stars.shift() );
	}
	this.player = this.map.addCharacter( this.map.grid.look("^")[0], "^" );
	this.mirror = this.map.addCharacter( this.map.grid.look("`")[0], "`" );
	this.player.star = this.map.addCharacter( stars[0], "⋆" );
	this.mirror.star = this.map.addCharacter( stars[1], "⋆" );
	
	var switches = [{
		"key": "▪",
		"door-locked": "■▶◀▮",
		"door-unlocked": "▬►◄◆"
	},{
		"key": "▫",
		"door-locked": "□",
		"door-unlocked": "▭"
	}];

	
	this.switches = [];
	
	// FILTRAR LA VARIABLE SWITCHES.
	switches.forEach(function(swch) {
		var arr = this.map.grid.look(swch.key);
		if( arr ) {
			swch.keyObjects = arr.map(function(cursor) {
				return this.map.addCharacter(cursor, swch.key);
			}, this);
			var doorObjects = [], doors = swch["door-locked"];
			for( var i = 0; i < doors.length; i++) {
				doorObjects = doorObjects.concat( this.map.grid.look(doors[i]).map(function(cursor) {
					var ret = this.map.addCharacter(cursor, swch["door-locked"][i]);
					ret.INDEX = i;
					return ret;
				}, this) );
			}
			swch.doorObjects = doorObjects;
			this.switches.push(swch);
		}
	}, this);
	
	var level = this;
	this.player.onCollide = function(char, pos) {
		if( "#|°¬&■▶◀▮".indexOf(char) != -1 ) {
			this.write();
			return false;
		} if("%-{}[]".indexOf(char) != -1) {
			this.freeze = true;
			this.char = getDeadChar(this.char, char);
			level.status = -1;
			level.onStatusChange();
		}
		return true;
	}
	this.mirror.onCollide = this.player.onCollide;

	this.status = 0;
}

function getDeadChar(player, lavaType) {
	if( player == "^") {
		if( lavaType == "%" ) {
			return "[";
		} else return "]";
	} else {
		if( lavaType == "%" ) {
			return "{";
		} else return "}";
	}
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

Level.prototype.turn = function() {
	var playerOnStar, mirrorOnStar;
	if( this.player.cursor.isEqualTo(this.player.star.cursor) )
		playerOnStar = true;
	else
		this.player.star.write();
	
	if( this.mirror.cursor.isEqualTo(this.mirror.star.cursor) )
		mirrorOnStar = true;
	else
		this.mirror.star.write();
	
	if( playerOnStar && mirrorOnStar ) {
		this.status = 1;
		this.onStatusChange();
		return;
	}
	
	this.switches.forEach(function(swch) {
		var onKey;
		swch.keyObjects.forEach(function(keyObj) {
			if( this.player.cursor.isEqualTo( keyObj.cursor ) ||
			    this.mirror.cursor.isEqualTo( keyObj.cursor ) )
			    onKey = true;
			else
				keyObj.write();
		}, this);
		swch.doorObjects.forEach(function(doorObj) {
			if( onKey )
				doorObj.char = swch["door-unlocked"][doorObj.INDEX];
			else
				doorObj.char = swch["door-locked"][doorObj.INDEX];
			if( !doorObj.cursor.isEqualTo( this.player.cursor ) &&
				!doorObj.cursor.isEqualTo( this.mirror.cursor ) )
				doorObj.write();
		}, this);
	}, this);
	
};

//////////////////////////////////////////////////////////////////////////////////////////

function Game() {
	this.levelSketches = [];
	this.currentLevel = 0; // current level number
	this.level = null;
	
	var game = this;
	window.onkeydown = function(event) {
		var code = event.keyCode;
		if(code==37) {
			event.preventDefault();
			game.level.player.move(new Cursor(-1,0));
			game.level.mirror.move(new Cursor(1,0));
		} else if(code==38) {
			event.preventDefault();
			game.level.player.move(new Cursor(0,-1));
			game.level.mirror.move(new Cursor(0,1));
		} else if(code==39) {
			event.preventDefault();
			game.level.player.move(new Cursor(1,0));
			game.level.mirror.move(new Cursor(-1,0));
		} else if(code==40) {
			event.preventDefault();
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
		game.level.turn();
		game.refresh();
	};
}

Game.prototype.addLevel = function( sketch ) {
	this.levelSketches.push( sketch );
}
Game.prototype.loadLevel = function() {
	if( !this.levelSketches[this.currentLevel] )
		this.currentLevel--;
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
var tileset = new Image();
tileset.src = "chess-tiles.png";
var char_count = [1, 1, 1, 1];
var onTilesetLoad = function() { }, tilesetLoaded = false;
tileset.addEventListener("load", function() {
	tilesetLoaded = true;
	onTilesetLoad();
});

var lava_loop = 0, star_loop = 0;
function canvasRenderer(map, cx) {
	var str = map.toString();
	var arr = str.split("\n");
	cx.canvas.width = arr[0].length * scale + 2;
	cx.canvas.height = arr.length * scale + 2;
	cx.translate(1,1);
	cx.font = scale + "px 'PT mono', monospace";
	cx.textAlign = "center";
	cx.textBaseline = "middle";
	lava_loop = (lava_loop + 1) % 4;
	star_loop = (star_loop + 1) % 4;
	
	for( var y = 0; y < arr.length ; y ++ ) {
		for( var x = 0; x < arr[y].length; x++ ) {
			//fondo
			if( (x + y) % 2 == 0 )
				cx.fillStyle = "#bfbfbf";
			else cx.fillStyle = "#1e1e1e";
			cx.fillRect(x*scale,y*scale,scale,scale);
		}
	}
	
	arr.forEach(function(line, y) {
		for(var x = 0; x<line.length;x++) {
			//caracter
			if( line[x] != " " )
				drawCanvasTile( cx, line[x], x, y );
		}
	});
}

function drawCanvasTile( cx, char, x, y ) {
	var radius = scale/2;
	switch( char ) {
		// PAREDES
		case "#":
			cx.drawImage( tileset,
			             0, 0, scale*1.5, scale*1.5,
			             x * scale, y * scale, scale*1.5, scale*1.5 );
			break;
		case "|":
			cx.drawImage( tileset,
			             scale*1.5, 0, scale*1.5, scale*1.5,
			             x * scale, y * scale, scale*1.5, scale*1.5 );
			break;
		case "°":
			cx.drawImage( tileset,
			             scale*3, 0, scale*1.5, scale*1.5,
			             x * scale, y * scale, scale*1.5, scale*1.5 );
			break;
		case "¬":
			cx.drawImage( tileset,
			             scale*4.5, 0, scale*1.5, scale*1.5,
			             x * scale, y * scale, scale*1.5, scale*1.5 );
			break;
		case "&":
			cx.drawImage( tileset,
			             scale*6, 0, scale*1.5, scale*2,
			             x * scale, y * scale, scale*1.5, scale*2 );
			break;
		case "<":
			cx.drawImage( tileset,
			             scale*15, 0, scale*1.5, scale*2,
			             x * scale, y * scale, scale*1.5, scale*2 );
			break;
		
		// otros
		case "^":
			cx.drawImage( tileset,
			             scale*8, 0, scale, scale,
			             x * scale, y * scale, scale, scale );
			break;
		case "`":
			cx.drawImage( tileset,
			             scale*8, scale, scale, scale,
			             x * scale, y * scale, scale, scale );
			break;
		
		case "%":
			cx.drawImage( tileset,
			             scale*(9 + lava_loop), scale, scale, scale,
			             x * scale, y * scale, scale, scale );
			break;
		case "-":
			cx.drawImage( tileset,
			             scale*(9 + lava_loop), 0, scale, scale,
			             x * scale, y * scale, scale, scale );
			break;
		
		case "⋆":
			cx.drawImage( tileset,
			             scale*(0+star_loop), scale * 2, scale, scale,
			             x * scale, y * scale, scale, scale);
			break;
			
			// PERSONAJES MUERTOS
		case "[":
			cx.drawImage( tileset,
			             scale * 13, 0, scale, scale,
			             x * scale, y * scale, scale, scale);
			break;
		case "]":
			cx.drawImage( tileset,
			             scale * 14, 0, scale, scale,
			             x * scale, y * scale, scale, scale);
			break;
		case "{":
			cx.drawImage( tileset,
			             scale * 13, scale, scale, scale,
			             x * scale, y * scale, scale, scale);
			break;
		case "}":
			cx.drawImage( tileset,
			             scale * 14, scale, scale, scale,
			             x * scale, y * scale, scale, scale);
			break;

			// PUERTAS
		//▪■▬▶◀▮
		case "■":
			cx.drawImage( tileset,
			             scale * 17, 0, scale, scale*3,
			             x * scale, (y-1)*scale, scale, scale*3);
			break;
		case "▶":
			cx.drawImage( tileset,
			             scale * 18, 0, scale, scale*3,
			             x * scale, (y-1)*scale, scale, scale*3);
			break;
		case "◀":
			cx.drawImage( tileset,
			             scale * 19, 0, scale*1.5, scale*1.5,
			             x * scale, y * scale, scale*1.5, scale*1.5);
			break;
		case "▮":
			cx.drawImage( tileset,
			             scale * 21, 0, scale*1.5, scale*1.5,
			             x * scale, y * scale, scale*1.5, scale*1.5);
			break;
		case "▪":
			cx.drawImage( tileset,
			             scale * 8, scale*2, scale, scale,
			             x * scale, y * scale, scale, scale);
			break;
			
		//■▶◀▮ >> ▬►◄◆ PUERTAS ABIERTAS:
		case "▬":
			cx.drawImage( tileset,
			             scale * 19, scale*1.5, scale, scale*1.5,
			             x * scale, (y-0.5) * scale, scale, scale*1.5);
			break;
		case "►":
			cx.drawImage( tileset,
			             scale * 20, scale*1.5, scale, scale*1.5,
			             x * scale, (y-0.5) * scale, scale, scale*1.5);
			break;
		case "◄":
			cx.drawImage( tileset,
			             scale * 21, scale*2, scale, scale,
			             x * scale, y * scale, scale, scale);
			break;
		case "◆":
			cx.drawImage( tileset,
			             scale * 22, scale*2, scale, scale,
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