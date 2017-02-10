var COLOR_CACHE = {
	"aliceblue" : true,
	"antiquewhite" : true,
	"aqua" : true,
	"aquamarine" : true,
	"azure" : true,
	"beige" : true,
	"bisque" : true,
	"black" : false,
	"blanchedalmond" : true,
	"blue" : false,
	"blueviolet" : false,
	"brown" : false,
	"burlywood" : true,
	"cadetblue" : true,
	"chartreuse" : true,
	"chocolate" : true,
	"coral" : true,
	"cornflowerblue" : true,
	"cornsilk" : true,
	"crimson" : false,
	"cyan" : true,
	"darkblue" : false,
	"darkcyan" : true,
	"darkgoldenrod" : true,
	"darkgray" : true,
	"darkgrey" : true,
	"darkgreen" : false,
	"darkkhaki" : true,
	"darkmagenta" : false,
	"darkolivegreen" : false,
	"darkorange" : true,
	"darkorchid" : false,
	"darkred" : false,
	"darksalmon" : true,
	"darkseagreen" : true,
	"darkslateblue" : false,
	"darkslategray" : false,
	"darkslategrey" : false,
	"darkturquoise" : true,
	"darkviolet" : false,
	"deeppink" : true,
	"deepskyblue" : true,
	"dimgray" : false,
	"dimgrey" : false,
	"dodgerblue" : true,
	"firebrick" : false,
	"floralwhite" : true,
	"forestgreen" : true,
	"fuchsia" : true,
	"gainsboro" : true,
	"ghostwhite" : true,
	"gold" : true,
	"goldenrod" : true,
	"gray" : true,
	"grey" : true,
	"green" : false,
	"greenyellow" : true,
	"honeydew" : true,
	"hotpink" : true,
	"indianred" : true,
	"indigo" : false,
	"ivory" : true,
	"khaki" : true,
	"lavender" : true,
	"lavenderblush" : true,
	"lawngreen" : true,
	"lemonchiffon" : true,
	"lightblue" : true,
	"lightcoral" : true,
	"lightcyan" : true,
	"lightgoldenrodyellow" : true,
	"lightgray" : true,
	"lightgrey" : true,
	"lightgreen" : true,
	"lightpink" : true,
	"lightsalmon" : true,
	"lightseagreen" : true,
	"lightskyblue" : true,
	"lightslategray" : true,
	"lightslategrey" : true,
	"lightsteelblue" : true,
	"lightyellow" : true,
	"lime" : true,
	"limegreen" : true,
	"linen" : true,
	"magenta" : true,
	"maroon" : false,
	"mediumaquamarine" : true,
	"mediumblue" : false,
	"mediumorchid" : true,
	"mediumpurple" : true,
	"mediumseagreen" : true,
	"mediumslateblue" : true,
	"mediumspringgreen" : true,
	"mediumturquoise" : true,
	"mediumvioletred" : false,
	"midnightblue" : false,
	"mintcream" : true,
	"mistyrose" : true,
	"moccasin" : true,
	"navajowhite" : true,
	"navy" : false,
	"oldlace" : true,
	"olive" : true,
	"olivedrab" : true,
	"orange" : true,
	"orangered" : true,
	"orchid" : true,
	"palegoldenrod" : true,
	"palegreen" : true,
	"paleturquoise" : true,
	"palevioletred" : true,
	"papayawhip" : true,
	"peachpuff" : true,
	"peru" : true,
	"pink" : true,
	"plum" : true,
	"powderblue" : true,
	"purple" : false,
	"rebeccapurple" : false,
	"red" : true,
	"rosybrown" : true,
	"royalblue" : false,
	"saddlebrown" : false,
	"salmon" : true,
	"sandybrown" : true,
	"seagreen" : true,
	"seashell" : true,
	"sienna" : false,
	"silver" : true,
	"skyblue" : true,
	"slateblue" : false,
	"slategray" : true,
	"slategrey" : true,
	"snow" : true,
	"springgreen" : true,
	"steelblue" : true,
	"tan" : true,
	"teal" : false,
	"thistle" : true,
	"tomato" : true,
	"turquoise" : true,
	"violet" : true,
	"wheat" : true,
	"white" : true,
	"whitesmoke" : true,
	"yellow" : true,
	"yellowgreen" : true
};

function parseRGB(color) {
	var rgbMatch = /rgb\(([0-9]+),([0-9]+),([0-9]+)\)/.exec(color.replace(/\s/g, ''));
	if (rgbMatch) {
		return rgbMatch.slice(1, 4).map(Number);
	}
	var hexMatch = /#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/.exec(color)
			|| /#([0-9a-z])([0-9a-z])([0-9a-z])/.exec(color); // for 3-digit hex colors
	if (hexMatch) {
		return hexMatch.slice(1, 4).map(function(hex) {
			return parseInt(hex, 16);
		});
	}
	console.log(color + ' could not be parsed');
	return [0, 0, 0];
}

// prepare for magic numbers
function contrastingIsBlack(color) {
	color = color.toLowerCase();
	var found = COLOR_CACHE[color];
	if (found != undefined) {
		return found;
	}
	var intensity = parseRGB(color).map(function(component) {
		var percent = component / 255.0;
		return percent <= 0.03928 ? percent / 12.92 : Math.pow((percent + 0.055) / 1.055, 2.4);
	});
	var luminance = 0.2126 * intensity[0] + 0.7152 * intensity[1] + 0.0722 * intensity[2];
	var result = luminance > 0.179;
	COLOR_CACHE[color] = result;
	return result;
}

function contrastingColor(color) {
	return contrastingIsBlack(color) ? 'black' : 'white';
}

function oppositeContrastingColor(color) {
	return !contrastingIsBlack(color) ? 'black' : 'white';
}
