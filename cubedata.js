var request = new XMLHttpRequest();
request.onreadystatechange = function() {
    if (request.readyState == 4 && request.status == 200) {
		createCubeData(JSON.parse(request.responseText));
    }
};

request.overrideMimeType('application/json');
request.open('GET', './magic.json', true);
request.send();

function createCubeData(cards) {
	var data = {};
	for (name of Object.keys(cards)) {
		var card = cards[name];
		if (!card.names) {
			data[toKey(name)] = getData(card);
		} else if (card.names[0] == card.name) {
			if (card.layout == 'split') {
				data[toKey(card.names.join(' // '))] = merge(card, cards[card.names[1]], card.layout);
			} else if (card.layout == 'meld') {
				data[toKey(name)] = merge(card, cards[card.names[2]], card.layout);
				data[toKey(card.names[1])] = merge(cards[card.names[1]], cards[card.names[2]], card.layout);
			} else {
				data[toKey(name)] = merge(card, cards[card.names[1]], card.layout);
			}
		}
	}
	document.body.innerHTML = JSON.stringify(data);
}

function getData(card) {
	var colors = getColors(card);
	return {
		name: name,
		colors1: colors,
		colors2: getEffectiveColors(colors, card),
		types: getTypes(card.types),
		manaCost: getManaCost(card),
		text: getFullText(card)
	};
}

function getColors(card) {
	var result = 0;
	if (card.colorIndicator) {
		for (color of card.colorIndicator) {
			result |= COLOR_BITS[color];
		}
	} else if (card.manaCost) {
		var colorCodes = card.manaCost.replace(/[^WUBRG]/g,'');
		for (var i = 0; i < colorCodes.length; i++) {
			result |= COLOR_CODE_BITS[colorCodes.charAt(i)];
		}
	}
	return result;
}

function getEffectiveColors(colors, card) {
	return colors;
}

function getTypes(types) {
	var result = 0;
	if (types) {
		for (type of types) {
			result |= TYPE_BITS[type];
		}
	}
	return result;
}

function getManaCost(card) {
	if (!card.manaCost || card.manaCost.includes('X')) {
		return null;
	}
	return card.cmc;
}

function merge(card1, card2, layout) {
	var isSplit = layout == 'split';
	var colors1 = getColors(card1);
	var colors2 = getColors(card2);
	return {
		name: isSplit ? card1.name + ' // ' + card2.name : card1.name,
		colors1: colors1 | colors1,
		colors2: colors1 | colors1,
		types: getTypes(card1.types),
		manaCost: isSplit ? null : card1.cmc,
		text: getFullText(card1) + '\n*** ' + layout.toUpperCase() + ' ***\n' + getFullText(card2)
	};
}

function toKey(name) {
	return Diacritics.remove(name).toLowerCase();
}

function getFullText(card) {
	var fullText = [];
	fullText.push(card.name);
	if (card.manaCost) {
		fullText.push(' ' + card.manaCost);
	}
	fullText.push('\n');
	var colorIndicator = getColorIndicator(card);
	if (colorIndicator) {
		fullText.push(colorIndicator + ' ');
	}
	if (card.supertypes) {
		fullText.push(card.supertypes.join(' ') + ' ');
	}
	fullText.push(card.types.join(' '));
	if (card.subtypes) {
		fullText.push('—' + card.subtypes.join(' '));
	}
	if (card.text) {
		fullText.push('\n');
		fullText.push(card.text);
	}
	if (card.power) {
		fullText.push('\n');
		fullText.push(card.power + '/' + card.toughness);
	} else if (card.loyalty) {
		fullText.push('\n');
		fullText.push(card.loyalty);
	}
	return fullText.join('');
}

function getColorIndicator(card) {
	var manaCostColors = new Set();
	if ((!card.manaCost || !card.manaCost.replace(/[^WUBRG]/g, '')) && card.colors) {
		return '(' + card.colors.map(function(color) {
			return COLOR_CODES[color]; 
		}).join('') + ')';
	}
	return null;
}

var COLOR_BITS = toBitCodes(['White','Blue','Black','Red','Green']);

var COLOR_CODE_BITS = toBitCodes(['W','U','B','R','G']);

var TYPE_BITS = toBitCodes([
	'Tribal',
	'Instant',
	'Sorcery',
	'Enchantment',
	'Artifact',
	'Land',
	'Creature',
	'Planeswalker',
	'Conspiracy']);


function toBitCodes(keys) {
	var result = {};
	for (var i = 0, length = keys.length; i < length; i++;) {
		result[keys[i]] = 1 << i;
	}
	return result;
}

var COLOR_CODES = {
	White: 'W',
	Blue: 'U',
	Black: 'B',
	Red: 'R',
	Green: 'G'
}
