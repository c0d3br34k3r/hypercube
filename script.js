'use strict';

var app = angular.module('app', []);

app.controller('Controller', ['$scope', '$http', '$window', function ($scope, $http, $window) {

	$scope.tabIndex = 0;
	$scope.viewIndex = 0;
	$scope.color = 1;
	$scope.total = 0;
	$scope.trash = [];
	$scope.filename = 'new cube.json';
	$scope.loaded = new Set();
	$scope.highlights = new Set();
	$scope.quantities = {};
	$scope.settings = { showOffColors: true };
	$scope.COLUMN_LABELS = ['1','2','3','4','5','6','7','8+','0','?'];
	$scope.ROW_LABELS = ['Creature','Instant','Sorcery','Artifact','Enchantment','Planeswalker'];
	$scope.COLORS = ['white', 'blue', 'black', 'red', 'green'];
	$scope.TAB_NAMES = ['Cards', 'Lands', 'Junk', 'Settings', 'Files'];
	
	$scope.cubeData = {};
	for (let card of cards) {
		$scope.cubeData[removeDiacritics(card.name).toLowerCase()] = card;
	}
	
	$scope.totals = replicate(32, function() {
		return {
			total: 0,
			rowTotals: newFilledArray(6, 0),
			colTotals: newFilledArray(10, 0),
		};
	});
	$scope.cube = multiDimensionalArray([2, 32, 6, 10, 0]);
	$scope.lands = multiDimensionalArray([2, 32, 0]);
	
	$scope.setTab = function(index) {
		$scope.tabIndex = index;
	};
	
	$scope.test = function() {
		$scope.showOffColors = !$scope.showOffColors;
	};	
	
	$scope.switchOut = function(row, col, index, event) {
		let card = $scope.cube[$scope.viewIndex][$scope.color][row][col].splice(index, 1)[0];
		let destination = event.ctrlKey
				? $scope.trash
				: $scope.cube[1 - $scope.viewIndex][$scope.color][row][col];
		insertSorted(destination, card);
		let increment = ($scope.viewIndex == 0) ? -1 : (event.ctrlKey ? 0 : 1);
		$scope.total += increment;
		let totals = $scope.totals[$scope.color];
		totals.total += increment;
		totals.colTotals[col] += increment;
		totals.rowTotals[row] += increment;
		if (event.ctrlKey) {
			$scope.loaded.delete(card);
		}
	}

	$scope.toggleView = function() {
		$scope.viewIndex = 1 - $scope.viewIndex;
	};
	
	$scope.setView = function(viewIndex) {
		$scope.viewIndex = viewIndex;
	};

	$scope.toggleColor = function(colorIndex, e) {
		if (!e.shiftKey) {
			$scope.color = 0;
		}
		$scope.color ^= 1 << colorIndex;
	};
	
	$scope.colorSelected = function(colorIndex) {
		return $scope.color & (1 << colorIndex);
	};
	
	function rotateForward() {
		$scope.color = ($scope.color << 1) & 0x1F | (($scope.color & 0x10) >> 4);
	}
	
	function rotateBackward() {
		$scope.color = ($scope.color >> 1) | (($scope.color & 0x1) << 4);
	}
	
	$scope.saveProgress = function() {
		let contents = {
			main: toCardNames(flatten($scope.cube[0])),
			reserve: toCardNames(flatten($scope.cube[1]))
		};
		let download = document.getElementById('download');
		download.download = $scope.filename;
		download.href = 'data:application/json;charset=utf-8;base64,'
				+ utf8ToBase64(JSON.stringify(contents));
		download.click();
	}

	$scope.listTrash = function() {
		window.open('data:application/json;charset=utf-8;base64,'
				+ utf8ToBase64(toCardNames($scope.trash).join('\n')));
	}

	$scope.exportView = function() {
		window.open('data:application/json;charset=utf-8;base64,'
				+ utf8ToBase64(toCardNames(flatten($scope.cube[$scope.viewIndex])).join('\n')));
	}
	
	function toCardNames(area) {
		return area.map(function(card) {
			return card.name;
		});
	}
	
	$scope.upload = function() {
		document.getElementById('upload').click();
	};

	$scope.readFile = function(e) {
		let reader = new FileReader();
		let file = e.target.files[0];
		reader.onload = function(e1) {
			let data = e1.target.result;
			switch (file.type) {
				case 'text/plain':
					$scope.$apply(function() {
						loadView(data.split(/\r?\n/), $scope.viewIndex, true);
					});
					break;
				case 'application/json':
					$scope.filename = file.name;
					let contents = JSON.parse(data);
					if (!(contents.main && contents.reserve)) {
						alert('This JSON file is not in valid cube format.');
					} else {
						$scope.$apply(function() {
							loadJson(contents);
						});
					}
					break;
				default:
					alert('Invalid type: ' + (file.type || file.name) + '.  Must be plain text or JSON.');
			}
		}
		reader.readAsText(file, 'UTF-8');
	};
	
	function loadJson(contents) {
		loadView(contents.main, 0);
		loadView(contents.reserve, 1);
		$scope.tabIndex = 0;
	}
	
	function loadView(cards, viewIndex, highlight) {
		if (highlight) {
			$scope.highlights.clear();
		}
		let badCards = [];
		for (let item of cards) {
			var cardName = removeDiacritics(item.trim()).toLowerCase();
			if (!cardName || cardName.startsWith('#')) {
				continue;
			}
			let card = $scope.cubeData[cardName];
			if (card == null) {
				badCards.push(item.trim());
				continue;
			}
			if ($scope.loaded.has(card.name)) {
				continue;
			}
			$scope.loaded.add(card.name);
			if (highlight) {
				$scope.highlights.add(card.name);
			}
			if (viewIndex == 0) {
				$scope.total++;
			}
			if (card.types & Type.LAND) {
				let colors = card.offColors || 0;
				insertSorted($scope.lands[viewIndex][colors], card);
			} else {
				let manaCostSection = getManaCostSection(card.cost);
				let typeSection = getTypeSection(card.types);
				let colors = card.colors;
				insertSorted($scope.cube[viewIndex][colors][typeSection][manaCostSection], card);
				if (viewIndex == 0) {
					let totals = $scope.totals[colors];
					totals.total++;
					totals.rowTotals[typeSection]++;
					totals.colTotals[manaCostSection]++;
				}
			}
		}
		if (badCards.length) {
			alert('Bad cards: ' + badCards.join(', '));
		}
	}

	$scope.rowNonempty = function(row) {
		for (let group of row) {
			if (group.length) {
				return true;
			}
		}
		return false;
	}
	
	// MOUSEOVER CARD TEXT

	$scope.card = {
		text: null,
		show: false,
		hover: false,
	};

	$scope.showCard = function(card, e) {
		$scope.card.hover = true;
		$scope.card.text = card.text;
	};

	$scope.hideCard = function() {
		$scope.card.hover = false;
	};

	$scope.keydown = function(event) {
		if (event.key == 'Shift') {
			$scope.card.show = true;
		} else {
			switch (event.key) {
				case '`':
					$scope.toggleView();
					break;
				case 'ArrowRight':
					rotateForward();
					break;
				case 'ArrowLeft':
					rotateBackward();
					break;
				case 'j':
					$scope.color = ($scope.color + 1) & 0x1F;
					break;
				default:
			}
		}
	}
	
	$scope.keyup = function(event) {
		if (event.key == 'Shift') {
			$scope.card.show = false;
		}
	}

	angular.element($window).bind('blur', function (){
		$scope.card.show = false;
	});
	
	// COLORS
	
	$scope.contrastingColor = function(color) {
		return contrastingColor(color);
	};

	$scope.contrastingColorForTag = function(tag) {
		return contrastingColor($scope.tags[tag]);
	};

}]);

app.directive('popup', function($parse) {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			let popupName = attrs['popup'];
			element.css('position', 'fixed');
			let padding = Number(attrs['popupPadding'] || 0);
			scope[popupName] = {
				setPosition: function(x, y) {
					let popupWidth = element[0].offsetWidth;
					let popupHeight = element[0].offsetHeight;
					let winHeight = document.documentElement.clientHeight;
					let winWidth = document.documentElement.clientWidth;
					element.css('left', computeCoord(x, popupWidth, winWidth, padding) + 'px');
					element.css('top', computeCoord(y, popupHeight, winHeight, padding) + 'px');
				}
			};
		}
	};
});

app.directive('ngRightClick', function($parse) {
    return function(scope, element, attrs) {
		let expr = $parse(attrs['ngRightClick']);
		element[0].addEventListener('contextmenu', function(e) {
			scope.$apply(function() {
				expr(scope, {$event: e});
			});
		}, false);
	}
});

app.filter('toArray', function() {
	return function(input) {
		let colors = [];
		if (input) {
			for (let i = 0; i < 5; i++) {
				if (input & (1 << i)) {
					colors.push(COLORS[i]);
				}
			}
		}
		return colors;
	};
})

function computeCoord(pos, popupDim, winDim, padding) {
	return pos + popupDim + padding <= winDim || pos < winDim / 2
			? pos + padding
			: pos - popupDim;
}

// pseudo-enums

var Type = {
	TRIBAL: 0x1,
	INSTANT: 0x2,
	SORCERY: 0x4,
	ENCHANTMENT: 0x8,
	ARTIFACT: 0x10,
	LAND: 0x20,
	CREATURE: 0x40,
	PLANESWALKER: 0x80,
	CONSPIRACY: 0x100
};

var Color = {
	WHITE: 0x1,
	BLUE: 0x2,
	BLACK: 0x4,
	RED: 0x8,
	GREEN: 0x10
};

var COLORS = ["WHITE", "BLUE", "BLACK", "RED", "GREEN"];

function getTypeSection(types) {
	if (types & Type.CREATURE)     return 0;
	if (types & Type.INSTANT)      return 1;
	if (types & Type.SORCERY)      return 2;
	if (types & Type.ARTIFACT)     return 3;
	if (types & Type.ENCHANTMENT)  return 4;
	if (types & Type.PLANESWALKER) return 5;
	throw 'unknown type: ' + types;
}

function getManaCostSection(manaCost) {
	switch (manaCost) {
		case 1:  return 0;
		case 2:  return 1;
		case 3:  return 2;
		case 4:  return 3;
		case 5:  return 4;
		case 6:  return 5;
		case 7:  return 6;
		default: return 7;
		case 0:  return 8;
		case -1: return 9;
	}
}

var ORDER = [
	// monocolored
	1, 2, 4, 8, 16,
	// colorless
	0,
	// allied pairs
	3, 6, 12, 24, 17,
	// enemy pairs
	5, 10, 20, 9, 18,
	// allied triples
	7, 14, 28, 25, 19,
	// enemy triples
	13, 26, 21, 11, 22,
	// tetras
	15, 30, 29, 27, 23,
	// all
	31
];

function multiDimensionalArray(dimensions, offset) {
	offset = offset || 0;
	if (offset >= dimensions.length) {
		return undefined;
	}
	let dim = dimensions[offset];
	let result = new Array(dim);
	for (let i = 0; i < dim; i++) {
		result[i] = multiDimensionalArray(dimensions, offset + 1);
	}
	return result;
}

function replicate(count, supplier) {
	let result = new Array(count);
	for (let i = 0; i < count; i++) {
		result[i] = supplier();
	}
	return result;
}

function newFilledArray(length, value) {
	let array = new Array(length);
	array.fill(value);
	return array;
}

function utf8ToBase64(str) {
	return btoa(unescape(encodeURIComponent(str)));
}

function getBits(items, itemType) {
	let bits = 0;
	for (let item of items) {
		bits |= itemType[item.toUpperCase()];
	}
	return bits;
}

function flatten(array) {
	let flat = [];
	recursiveFlatten(array, flat);
	return flat;
}

function recursiveFlatten(array, copyTo) {
	for (let item of array) {
		if (Array.isArray(item)) {
			recursiveFlatten(item, copyTo);
		} else {
			copyTo.push(item);
		}
	}
}

function insertSorted(array, card) {
	array.splice(insertionIndex(array, card), 0, card);
}

function insertionIndex(array, card) {
	let low = 0;
	let high = array.length - 1;
	while (low <= high) {
		let mid = Math.floor((low + high) / 2);
		if (card.name > array[mid].name) {
			low = mid + 1;
		} else if (card.name < array[mid].name) {
			high = mid - 1;
		} else {
			return mid;
		}
	}
	return low;
}

// function powerSet(items) {
	// var result = [];
	// for (var i = 0, combinations = 1 << items.length; i < combinations; i++) {
		// var subset = [];
		// for (var j = 0, len = items.length; j < len; j++) {
			// if (i & (1 << j)) {
				// subset.push(items[j]);
			// }
		// }
		// result.push(subset);
	// }
	// return result;
// }

function zeroPad(number, width) {
	width = width || 2;
	return '0'.repeat(Math.max(width - number.length, 0)) + number;
}

var cards;

function initCards(json) {
	cards = json;
}
