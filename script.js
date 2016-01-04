
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
		str += "\n";
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
	this.player = this.map.addCharacter( players[0], "^" );
	this.mirror = this.map.addCharacter( players[1], "v" );
	this.player.star = this.map.addCharacter( stars[0], "⋆" );
	this.mirror.star = this.map.addCharacter( stars[1], "⋆" );
	var level = this;
	this.player.onCollide = function(char, pos) {
		if(char=="#" || char=="|" || char=="-") {
			this.write();
			return false;
		} if(char=="%") {
			this.freeze = true;
			this.char = "x";
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

var game = new Game();
game.addLevel([
    "               ",
    " Te movés con  ",
    " las flechitas ",
    "               ",
    "   #########   ",
    "   # ⋆ | ^ #   ",
    "   #   |   #   ",
    "   #   |   #   ",
    "   #   |   #   ",
    "   #   |   #   ",
    "   # ^ | ⋆ #   ",
    "   #########   ",
    "               ",
    " Llegá hasta   ",
    " las estrellas.",
    "               "
]);
game.addLevel([
    "               ",
    " Los % son la- ",
    " va. Si los pi-",
    " sás te morís! ",
    "               ",
    "  ###########  ",
    "  # ⋆  |  ^ #  ",
    "  #    |    #  ",
    "  #    |    #  ",
    "  #    |%%% #  ",
    "  #%%% |    #  ",
    "  # ^  |  ⋆ #  ",
    "  ###########  ",
    "               ",
    "               "
]);
game.addLevel([
    "               ",
    " Los # son pa- ",
    " redes, te pue-",
    " den ayudar.   ",
    "               ",
    "  ###########  ",
    "  # ⋆  |  ^ #  ",
    "  #  # |    #  ",
    "  #    |    #  ",
    "  #    |    #  ",
    "  #    |    #  ",
    "  # ^  |⋆   #  ",
    "  ###########  ",
    "               ",
    "               "
]);
game.addLevel([
    "               ",
    " A ver si re-  ",
    " solvés ésto...",
    "               ",
    " ############# ",
    " #  ⋆  |^    # ",
    " #     |    %# ",
    " #     |%% %%# ",
    " #% %  |     # ",
    " #  #  | %%% # ",
    " #  %%%|     # ",
    " #    %|     # ",
    " #^    |  ⋆  # ",
    " ############# ",
    "               "
]);
game.addLevel([
    "               ",
    " Bien, probe-  ",
    " mos con éste  ",
    "               ",
	"###############",
	"#^     |    %⋆#",
	"#%%%% #| %    #",
	"# %    |      #",
	"#   %%%| %%%%%#",
	"#⋆     |     ^#",
	"###############",
    "               ",
    "               ",
    "               ",
    "               "
]);
game.addLevel([
    "               ",
    " ############# ",
    " #  ⋆% | #^  # ",
    " # %   |  %% # ",
    " ##    |     # ",
    " # %%% | %  %# ",
    " #     |     # ",
    " #% %  |   % # ",
    " #   % |     # ",
    " # %   | %%%%# ",
    " #   % |     # ",
    " #  %%%|% %  # ",
    " #  ^ %|  ⋆  # ",
    " ############# ",
    "               "
]);
game.addLevel([
    "               ",
    " Déjà vu...    ",
    "               ",
	"###############",
	"#^     |    %⋆#",
	"#%%%% #| %    #",
	"# %    |      #",
	"#   %%%| %%%%%#",
	"#⋆ %   |     ^#",
	"###############",
    "               ",
    "               ",
    "               ",
    "               "
]);
game.addLevel([
    "               ",
    " ############# ",
    " #  ⋆ %|  ^  # ",
    " #  %%%|%%   # ",
    " #   %%|%%%% # ",
    " #    %|   % # ",
    " #%%   |     # ",
    " # %%% |    %# ",
    " # #   |  %%%# ",
    " #   %%| %%%%# ",
    " #  %%%|     # ",
    " #   %%|   %%# ",
    " #  ^  |  ⋆ %# ",
    " ############# ",
    "               "
]);
game.addLevel([
	"                           ",
	" ######################### ",
	" #%  #   %   |^     %   ⋆# ",
	" #   %     % |%%%     %  # ",
	" # %      %  |%%  % #%   # ",
	" #⋆%  %  #  ^|   %%    %%# ",
	" ######################### ",
	"                           "
]);
game.addLevel([
	"                           ",
	" ¡No de nuevo, decía!      ",
	"                           ",
	" ######################### ",
	" #%  #   %   |^     %   ⋆# ",
	" #   %     % |%%%    %%  # ",
	" # %      %  |%%  % #%   # ",
	" #⋆%  %  #  ^|   %%    %%# ",
	" ######################### ",
	"                           "
]);
game.loadLevel();

window.addEventListener("keydown", function(event) {
	var code = event.keyCode;
	if(code==37) {
		event.preventDefault();
		game.level.player.char = "<"; game.level.mirror.char = ">";
		game.level.player.move(new Cursor(-1,0));
		game.level.mirror.move(new Cursor(1,0));
	} else if(code==38) {
		event.preventDefault();
		game.level.player.char = "^"; game.level.mirror.char = "v";
		game.level.player.move(new Cursor(0,-1));
		game.level.mirror.move(new Cursor(0,1));
	} else if(code==39) {
		event.preventDefault();
		game.level.player.char = ">"; game.level.mirror.char = "<";
		game.level.player.move(new Cursor(1,0));
		game.level.mirror.move(new Cursor(-1,0));
	} else if(code==40) {
		event.preventDefault();
		game.level.player.char = "v"; game.level.mirror.char = "^";
		game.level.player.move(new Cursor(0,1));
		game.level.mirror.move(new Cursor(0,-1));
	}
	if( game.level.status == 0 && game.level.player.isOnStar && game.level.mirror.isOnStar ) {
		game.level.pause();
		game.level.status = 1;
		game.level.onStatusChange();
	}
	game.refresh();
});


// Acá queda sepultado el código del renderizador html
/*var pre = document.createElement("pre");
game.refresh = htmlRenderer;
function htmlRenderer() {
	var str = game.level.toString();
	str = str.replace(/([#|]+)/g, "<span class='pared'>$1</span>");
	str = str.replace(/(%+)/g, "<span class='lava'>$1</span>");
	str = str.replace(/⋆/g, "<span class='star'>⋆</span>");
	str = str.replace(/x/g, "<span class='xChar'>x</span>");
	pre.innerHTML = str;
}
game.refresh();

window.addEventListener("load", function() {
document.body.appendChild( pre );
});*/

var canvas = document.createElement("canvas");
var cx = canvas.getContext("2d");
var scale = 20, colorDeLasParedes = "blue";

game.refresh = canvasRenderer;
game.refresh();

function canvasRenderer() {
	var str = game.level.toString();
	var arr = str.split("\n");
	canvas.width = arr[0].length * scale;
	canvas.height = arr.length * scale;
	arr.forEach(function(line, y) {
		for(var x = 0; x<line.length;x++) 
			drawCanvasTile( line[x], x, y );
	});
}
function drawCanvasTile( char, x, y ) {
	var radius = scale/2;
	switch( char ) {
		case "#":
		case "|":
			cx.fillStyle = colorDeLasParedes;
			cx.fillRect(x*scale, y*scale, scale, scale);
			cx.fillStyle = "white";
			break;
		case "%":
		case "x":
			cx.fillStyle = "red";
			cx.fillRect(x*scale, y*scale, scale, scale);
			cx.fillStyle = "white";
			break;
		case "<":
		case "^":
		case ">":
		case "v":
			cx.fillStyle = "orange";
			cx.beginPath();
			cx.arc( x*scale + radius, y*scale + radius, radius, 0, 2*Math.PI );
			cx.fill();
			cx.fillStyle = "red";
			break;
		default:
			cx.fillStyle = "black";
			break;
	}
	cx.font = scale + "px monospace";
	cx.textAlign = "center";
	cx.textBaseline = "middle";
	cx.fillText(char, x*scale+radius, y*scale+radius);
}

var html =
	'<p>Cambiar tamaño:'+
	'<input type="number" name="tamaño" value="20"/></p>'+
	'<p>Cambiar color de las paredes:'+
		'<input type="color" name="color" value="#00f"/>'+
	'</p>'+
	'<button type="submit">Cambiar</button>';
var form = document.createElement("form");
form.innerHTML = html;
form.addEventListener("submit", function(event) {
	event.preventDefault();
	// tamaño
	var val = form.querySelector("input[name='tamaño']").value;
	val = Math.min( 60, val);
	val = Math.max( 7, val);
	scale = val;
	
	// color
	var col = form.querySelector('input[name="color"]').value;
	if(col)
		colorDeLasParedes = col;
	
	game.refresh();
});

window.onload = function() {
	document.body.appendChild(canvas);
	document.body.appendChild(form);
}