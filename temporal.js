	function drawCanvasTile( cx, char, x, y ) {
		var radius = scale/2;
		function drawSprite( positionX, positionY, width, height, offsetX, offsetY ){
			// ALL NUMBERS ARE RELATIVE TO 'scale'
			if (!offsetX && !offsetY){
				offsetY = 0; offsetX = 0;
			}
			cx.drawImage( tileset,
				positionX * scale, positionY * scale,
				(scale * width), (scale * height),
				(x + offsetX ) * scale, (y + offsetY ) * scale,
				(scale * width), (scale * height) );

		}