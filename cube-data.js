var allSets;

function mtgjsoncallback(mtgjson) {
	allSets = mtgjson;
}

window.onload = function() {
	for (var setCode of Object.keys(allSets)) {
		console.log('processing... ' + setCode);
		var set = allSets[setCode];
		if (setCode == 'pMEI') {
			processSet(set, function(card) { return ORIGINAL_PROMOS.has(card.name); });
		} else if (!DISALLOWED_TYPES.has(set.type)
				&& !DISALLOWED_SETS.has(setCode)
				&& !setCode.startsWith('DD3_')) {
			processSet(set, function(card) { return true; });
		}
	}
	document.body.innerHTML = 
		// Object.values(result).map(function(card) { return card.name; }).join('<br>');
		JSON.stringify(result);
};

var DISALLOWED_TYPES = new Set(['promo', 'un', 'vanguard']);
var DISALLOWED_SETS = new Set(['ITP', 'RQS', 'CST', 'CEI', 'CPK', 'CED', 'MGB', 'FRF_UGIN', 'PCA', 'ATH']);
var ALLOWED_LAYOUTS = new Set(['normal', 'split', 'flip', 'double-faced', 'leveler', 'meld', 'aftermath']);

var ORIGINAL_PROMOS = new Set([
	'Arena',
	'Giant Badger',
	'Mana Crypt',
	'Nalathni Dragon',
	'Sewers of Estark',
	'Windseeker Centaur']);

var result = {};
var partial = {};
var seen = new Set();

function processSet(set, filter) {
	for (card of set.cards) {
		if (ALLOWED_LAYOUTS.has(card.layout) && filter(card) && !seen.has(card.name)) {
			seen.add(card.name);
			var key = toKey(card.name);
			if (card.names && card.layout != 'normal') {
				partial[card.name] = getData(card);
				checkAllParts(card.names, card.layout);
			} else {
				result[key] = getData(card);
			}
		}
	}
}

function checkAllParts(names, layout) {
	for (name of names) {
		if (!partial[name]) {
			return;
		}
	}
	switch (layout) {
		case 'split':
		case 'aftermath':
			result[toKey(names.join(' // '))] = merge(partial[names[0]], partial[names[1]], layout);
			break;
		case 'double-faced':
		case 'flip':
			result[toKey(names[0])] = merge(partial[names[0]], partial[names[1]], layout);
			break;
		case 'meld':
			result[toKey(names[0])] = merge(partial[names[0]], partial[names[1]], layout);
			result[toKey(names[1])] = merge(partial[names[0]], partial[names[1]], layout);
			break;
		default:
			throw layout;
	}
}

function getData(card) {
	var colors = getColors(card);
	return {
		name: removeDiacritics(card.name),
		colors: colors,
		offColors: getOffColors(card, colors),
		types: getBits(card.types, TYPE_BITS),
		manaCost: getManaCost(card),
		text: getFullText(card)
	};
}

function getColors(card) {
	if (card.manaCost) {
		var manaCostColors = getBits(card.manaCost, COLOR_CODE_BITS);
		if (manaCostColors) {
			return manaCostColors;
		}
	}
	if (card.colors) {
		return getBits(card.colors, COLOR_BITS);
	}
	return 0;
}

function getOffColors(card, colors) {
	var offColors = 0;
	if (card.text) {
		var symbol = /\{([^\}]*)\}(?![^(]*\))/g;
		for (;;) {
			var match = symbol.exec(card.text);
			if (!match) {
				break;
			}
			offColors |= getBits(match[1], COLOR_CODE_BITS);
		}
	}
	if (card.subtypes) {
		offColors |= getBits(card.subtypes, BASIC_LAND_BITS);
	}
	var result = offColors & ~colors;
	return result ? result : undefined;
}

function getBits(items, bits) {
	var result = 0;
	if (items) {
		for (item of items) {
			result |= bits[item] || 0;
		}
	}
	return result;
}

function getManaCost(card) {
	if (!card.manaCost || card.manaCost.includes('X')) {
		return -1;
	}
	return card.cmc;
}

function merge(data1, data2, layout) {
	var isSplit = (layout == 'split' || layout == 'aftermath');
	return {
		name: isSplit ? data1.name + ' // ' + data2.name : data1.name,
		colors: data1.colors | data2.colors,
		offColors: mergeOffColors(data1.offColors, data2.offColors),
		types: data1.types,
		manaCost: isSplit ? -1 : data1.manaCost,
		text: data1.text + '\n*** ' + layout.toUpperCase() + ' ***\n' + data2.text
	};
}

function mergeOffColors(colors1, colors2) {
	if (!colors1 && !colors2) {
		return undefined;
	}
	return (colors1 || 0) | (colors2 || 0);
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
		fullText.push('\u2014' + card.subtypes.join(' '));
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

function toKey(name) {
	return removeDiacritics(name).toLowerCase();
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

var BASIC_LAND_BITS = toBitCodes([
	'Plains',
	'Island',
	'Swamp',
	'Mountain',
	'Forest']);

function toBitCodes(keys) {
	var result = {};
	for (var i = 0; i < keys.length; i++) {
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
};

// var BASIC_LAND_TYPES = {
	// 'Plains': 'W',
	// 'Island': 'U',
	// 'Swamp': 'B',
	// 'Mountain': 'R',
	// 'Forest': 'G'
// };
