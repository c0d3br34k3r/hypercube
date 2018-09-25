var app = angular.module('app', []);

app.controller('Controller', ['$scope', '$http', '$window', function ($scope, $http, $window) {

	$http.get('./cube-data.json', {responseType: 'json'}).then(function(result) {
		$scope.cubeData = result.data;
		$http.get('./categories.json', {responseType: 'json'}).then(function(result) {
			setup(result.data);
			// $http.get('./bce_cube.json', {responseType: 'json'}).then(function(result) {
				// loadJson(result.data);
			// });
		});
	});

	$scope.tabIndex = 0;
	$scope.viewIndex = 0;
	$scope.color = 1;
	$scope.total = 0;
	$scope.trash = [];
	$scope.columnLabels = [];
	$scope.rowLabels = [];
	$scope.filename = 'new cube.json';
	$scope.loaded = new Set();
	$scope.quantities = {};
	$scope.COLORS = ['white', 'blue', 'black', 'red', 'green'];
	$scope.TAB_NAMES = ['Cards', 'Lands', 'Junk', 'Settings', 'Files'];
	$scope.settings = { showOffColors: true };
	
	$scope.setTab = function(index) {
		$scope.tabIndex = index;
	};
	
	$scope.test = function() {
		$scope.showOffColors = !$scope.showOffColors;
	};

	function setup(categories) {
		$scope.typeMap = createTypeMap(categories.types);
		$scope.manaCostMap = createManaCostMap(categories.manaCosts);
		
		var rows = categories.types.length;
		var cols = categories.manaCosts.length;
		
		$scope.totals = replicate(32, function() {
			return {
				total: 0,
				rowTotals: newFilledArray(rows, 0),
				colTotals: newFilledArray(cols, 0),
			};
		});
		
		$scope.cube = replicate(2, function() {
			return replicate(32, function() {
				return replicate(rows, function() {
					return replicate(cols, function() {
						return [];
					});
				});
			});
		});
	}

	function createTypeMap(types) {
		var typeMap = new Map();
		for (var i = 0, len = types.length; i < len; i++) {
			var typeGroups = types[i];
			for (group of typeGroups.data) {
				typeMap.set(getBits(group.split(' '), Type), i);
			}
			$scope.rowLabels[i] = typeGroups.name;
		}
		return typeMap;
	}
	
	function createManaCostMap(manaCosts) {
		var manaCostMap = new Map();
		for (var i = 0, len = manaCosts.length; i < len; i++) {
			var manaCostGroup = manaCosts[i];
			for (var value = manaCostGroup.data[0], limit = manaCostGroup.data[1] || manaCostGroup.data[0]; value <= limit; value++) {
				manaCostMap.set(value, i);
			}
			$scope.columnLabels[i] = manaCostGroup.name;
		}
		return manaCostMap;
	}
	
	$scope.switchOut = function(row, col, index, event) {
		var card = $scope.cube[$scope.viewIndex][$scope.color][row][col].splice(index, 1)[0];
		var destination = event.ctrlKey ? $scope.trash : $scope.cube[1 - $scope.viewIndex][$scope.color][row][col];
		insertSorted(destination, card);
		var increment = ($scope.viewIndex == 0) ? -1 : (event.ctrlKey ? 0 : 1);
		$scope.total += increment;
		var totals = $scope.totals[$scope.color];
		totals.total += increment;
		totals.colTotals[col] += increment;
		totals.rowTotals[row] += increment;
		if (event.ctrlKey) {
			$scope.loaded.delete(card);
		}
	}
	
	$scope.shortcut =  function(event) {
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
    };
	
	$scope.toggleView = function() {
		$scope.viewIndex = 1 - $scope.viewIndex;
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
		var contents = {
			main: toCardNames(flatten($scope.cube[0])),
			reserve: toCardNames(flatten($scope.cube[1]))
		};
		var download = document.getElementById('download');
		download.download = $scope.filename;
		download.href = 'data:application/json;charset=utf-8;base64,' + utf8ToBase64(JSON.stringify(contents));
		download.click();
	}

	$scope.listTrash = function() {
		window.open('data:application/json;charset=utf-8;base64,' + utf8ToBase64(toCardNames($scope.trash).join('\n')));
	}

	$scope.exportView = function() {
		window.open('data:application/json;charset=utf-8;base64,' + utf8ToBase64(toCardNames(flatten($scope.cube[$scope.viewIndex])).join('\n')));
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
		var reader = new FileReader();
		var file = e.target.files[0];
		reader.onload = function(e1) {
			var data = e1.target.result;
			switch (file.type) {
				case 'text/plain':
					$scope.$apply(function() {
						loadView(data.split(/\r?\n/), $scope.viewIndex);
					});
					break;
				case 'application/json':
					$scope.filename = file.name;
					var contents = JSON.parse(data);
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
	
	function getFileType() {
	}
	
	function loadJson(contents) {
		loadView(contents.main, 0);
		loadView(contents.reserve, 1);
	}
	
	function loadView(cards, viewIndex) {
		var badCards = [];
		for (var item of cards) {
			var cardName = Diacritics.remove(item.trim()).toLowerCase();
			if (!cardName || cardName.startsWith('#')) {
				continue;
			}
			var card = $scope.cubeData[cardName];
			if (card == null) {
				badCards.push(item.trim());
				continue;
			}
			if ($scope.loaded.has(card.name)) {
				continue;
			}
			$scope.loaded.add(card.name);
			
			var manaCostCategory = $scope.manaCostMap.get(card.manaCost);
			var typeCategory = $scope.typeMap.get(card.types);
			if (typeCategory != null) {
				var colors = card.types & Type.LAND ? (card.offColors || 0) : card.colors;
				insertSorted($scope.cube[viewIndex][colors][typeCategory][manaCostCategory], card);
				if (viewIndex == 0) {
					var totals = $scope.totals[colors];
					totals.total++;
					$scope.total++;
					totals.rowTotals[typeCategory]++;
					totals.colTotals[manaCostCategory]++;
				}
			}
		}
		if (badCards.length) {
			alert('Bad cards: ' + badCards.join(', '));
		}
	}

	$scope.rowNonempty = function(row) {
		for (group of row) {
			if (group.length) {
				return true;
			}
		}
		return false;
	}
	
	// TAGS
	
	$scope.removeTag = function(index) {
		
	};
	
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
			var popupName = attrs['popup'];
			element.css('position', 'fixed');
			var padding = Number(attrs['popupPadding'] || 0);
			scope[popupName] = {
				setPosition: function(x, y) {
					var popupWidth = element[0].offsetWidth;
					var popupHeight = element[0].offsetHeight;
					var winHeight = document.documentElement.clientHeight;
					var winWidth = document.documentElement.clientWidth;
					element.css('left', computeCoord(x, popupWidth, winWidth, padding) + 'px');
					element.css('top', computeCoord(y, popupHeight, winHeight, padding) + 'px');
				}
			};
		}
	};
});

app.directive('ngRightClick', function($parse) {
    return function(scope, element, attrs) {
		var expr = $parse(attrs['ngRightClick']);
		element[0].addEventListener('contextmenu', function(e) {
			scope.$apply(function() {
				expr(scope, {$event: e});
			});
		}, false);
	}
});

app.filter('toArray', function() {
	return function(input) {
		var colors = [];
		if (input) {
			for (var i = 0; i < 5; i++) {
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

function computeCoord2(pos, popupDim, winDim, padding) {
	return Math.min(pos + padding, winDim - popupDim);
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

function replicate(count, supplier) {
	var result = new Array(count);
	for (var i = 0; i < count; i++) {
		result[i] = supplier();
	}
	return result;
}

function newFilledArray(length, value) {
	var array = new Array(length);
	array.fill(value);
	return array;
}

function utf8ToBase64(str) {
	return btoa(unescape(encodeURIComponent(str)));
}

function getBits(items, itemType) {
	var bits = 0;
	for (item of items) {
		bits |= itemType[item.toUpperCase()];
	}
	return bits;
}

function flatten(array) {
	var flat = [];
	recursiveFlatten(array, flat);
	return flat;
}

function recursiveFlatten(array, copyTo) {
	for (item of array) {
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
	var low = 0;
	var high = array.length - 1;
	while (low <= high) {
		var mid = Math.floor((low + high) / 2);
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

function powerSet(items) {
	var result = [];
	for (var i = 0, combinations = 1 << items.length; i < combinations; i++) {
		var subset = [];
		for (var j = 0, len = items.length; j < len; j++) {
			if (i & (1 << j)) {
				subset.push(items[j]);
			}
		}
		result.push(subset);
	}
	return result;
}

function zeroPad(number, width) {
	width = width || 2;
	return '0'.repeat(Math.max(width - number.length, 0)) + number;
}