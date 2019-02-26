var allSets;

function mtgjsoncallback(mtgjson) {
	allSets = mtgjson;
}

window.onload = function() {
	for (var setCode of Object.keys(allSets)) {
		var set = allSets[setCode];
		console.log(setCode + ' (' + set.type + ')');
		if (setCode == 'PMEI') {
			processSet(set, function(card) { 
				return ORIGINAL_PROMOS.has(card.name); 
			});
		} else if (ALLOWED_TYPES.has(set.type)) {
			processSet(set, function(card) {
				return true; 
			});
		}
	}
	document.body.innerHTML = JSON.stringify(result);
};

var ALLOWED_TYPES = new Set(['core', 'commander', 'draft_innovation', 'expansion', 'planechase', 'box']);
var ALLOWED_LAYOUTS = new Set(['normal', 'split', 'flip', 'double-faced', 'leveler', 'saga', 'meld', 'aftermath']);
var NORMAL_LAYOUTS = new Set(['normal', 'leveler', 'saga']);

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
			if (card.names && card.names.length > 1) {
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
		return getBits(card.colors, COLOR_CODE_BITS);
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
	return card.convertedManaCost;
}

function merge(data1, data2, layout) {
	return {
		name: (layout == 'split' || layout == 'aftermath') ? data1.name + ' // ' + data2.name : data1.name,
		colors: layout == 'double-faced' ? data1.colors : data1.colors | data2.colors,
		offColors: mergeOffColors(data1, data2),
		types: data1.types,
		manaCost: layout == 'split' ? -1 : data1.manaCost,
		text: data1.text + '\n*** ' + layout.toUpperCase() + ' ***\n' + data2.text
	};
}

function mergeOffColors(data1, data2) {
	if (!data1.offColors && !data2.offColors) {
		return undefined;
	}
	return (data1.offColors || 0) | (data2.offColors || 0) & ~(data1.colors || 0) & ~(data2.colors || 0);
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
	if (card.supertypes && card.supertypes.length) {
		fullText.push(card.supertypes.join(' ') + ' ');
	}
	fullText.push(card.types.join(' '));
	if (card.subtypes && card.subtypes.length) {
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
	if ((!card.manaCost || !card.manaCost.replace(/[^WUBRG]/g, '')) && card.colors && card.colors.length) {
		return '(' + card.colors.join('') + ')';
	}
	return null;
}

function toKey(name) {
	return removeDiacritics(name).toLowerCase();
}

var COLOR_CODE_BITS = toBitCodes(['W','U','B','R','G']);

var TYPE_BITS = toBitCodes([
	'Tribal',       // 1
	'Instant',      // 2
	'Sorcery',      // 4
	'Enchantment',  // 8
	'Artifact',     // 16
	'Land',         // 32
	'Creature',     // 64
	'Planeswalker', // 128
	'Conspiracy']); // 256

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
