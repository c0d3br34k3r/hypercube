var app = angular.module('app', []);

app.controller('Controller', ['$scope', '$http', function ($scope, $http) {

	$http.get('./cube-data.json', {responseType: 'json'}).then(function(result) {
		$scope.cubeData = result.data;
		$http.get('./categories.json', {responseType: 'json'}).then(function(result) {
			setup(result.data);
			$http.get('./bce_cube.json', {responseType: 'json'}).then(function(result) {
				loadJson(result.data);
			});
		});
	});
	
	$scope.colors = Object.keys(Color);
	
	$scope.setEditing = function(e, card) {
		$scope.editing = card;
		e.preventDefault();
	}

	$scope.tags = {
		'Courageous Outrider': ['human'],
		'Riders of Gavony': ['human', 'evasion'],
		'Drunau Corpse Trawler': ['zombie'],
		'Crypt Champion': ['zombie'],
		'Padeem, Consul of Innovation': ['artifact'],
		'Glint-Nest Crane': ['artifact'],
		'Compelling Deterrence': ['zombie']
	};
	
	// $scope.offColor = {
		// 'Dauntless River Marshal': 2,
		// 'Shrieking Grotesque': 4,
		// 'Steamcore Weird': 8,
		// 'Drunau Corpse Trawler': 4,
		// 'Frilled Oculus': 16,
		// 'Revenant Patriarch': 1,
		// 'Crypt Champion': 8,
		// 'Shoreline Salvager': 2,
		// 'Obelisk of Alara': 31,
		// 'Warden of the First Tree': 5
	// };
	
	$scope.tagColors = {
		'human' : 'khaki',
		'zombie' : 'darkolivegreen',
		'evasion' : '#70B04A',
		'artifact': 'lightsteelblue'
	}
	
	// $scope.hasOffColor = function(card, colorIndex) {
		// var mask = 1 << colorIndex;
		
		// console.log($scope.cubeData[card].offColors);
		// return $scope.cubeData[card].offColors && ($scope.cubeData[card].offColors & mask);
	// }
	
	// $scope.toggleOffColor = function(card, colorIndex) {
		// var mask = 1 << colorIndex;
		// if (!($scope.color & mask)) {
			// $scope.offColor[card] = ($scope.offColor[card] | 0) ^ mask;
		// }
	// }

	$scope.getContrasting = function(card) {
		var tags = $scope.tags[card];
		if (tags) {
			return getContrasting($scope.tagColors[$scope.tags[card][0]]);
		}
		return undefined;
	};
	
	$scope.rowNonempty = function(row) {
		for (group of row) {
			if (group.length) {
				return true;
			}
		}
		return false;
	}
	
	$scope.quantities = {};
	
	$scope.viewIndex = 0;
	$scope.cube = [];
	$scope.trash = [];
	
	$scope.columnLabels = [];
	$scope.rowLabels = [];
	
	$scope.filename = 'new cube.json';
	
	$scope.view = function() {
		return $scope.cube[$scope.viewIndex];
	};
	
	$scope.colorView = function() {
		return $scope.cube[$scope.viewIndex][$scope.color];
	};

	function setup(categories) {
		$scope.typeMap = createTypeMap(categories.types);
		$scope.manaCostMap = createManaCostMap(categories.manaCosts);
		
		var rows = categories.types.length;
		var cols = categories.manaCosts.length;
		$scope.totals = createTotals(rows, cols);
		$scope.cube = newMultidimensionalArray([2, 32, rows, cols], function() {
			return [];
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
			for (var value = manaCostGroup.data[0], 
					limit = manaCostGroup.data[1] || manaCostGroup.data[0]; value <= limit; value++) {
				manaCostMap.set(value, i);
			}
			$scope.columnLabels[i] = manaCostGroup.name;
		}
		return manaCostMap;
	}
	
	function createTotals(rows, cols) {
		var totals = new Array(32);
		for (var colorCode = 0; colorCode < 32; colorCode++) {
			totals[colorCode] = {
				total: 0,
				rowTotals: newFilledArray(rows, 0),
				colTotals: newFilledArray(cols, 0)
			};
		}
		return totals;
	}

	function newFilledArray(length, value) {
		var array = new Array(length);
		array.fill(value);
		return array;
	}
	
	function newMultidimensionalArray(lengths, bottomValue) {
		if (!lengths.length) {
			return bottomValue();
		}
		var array = new Array(lengths[0]);
		var newLengths = lengths.slice(1, lengths.length);
		for (var i = 0; i < lengths[0]; i++) {
			array[i] = newMultidimensionalArray(newLengths, bottomValue);
		}
		return array;
	}
	
	// Used for category processing?
	$scope.range = function(start, end) {
		var result = [];
		for (var i = start; i <= end; i++) {
			result.push(i);
		}
	}

	var loaded = new Set();
	
	$scope.switchOut = function(row, col, index, event) {
		if ($scope.editing) {
			$scope.editing = undefined;
			return;
		}
		var card = $scope.colorView()[row][col].splice(index, 1)[0];
		var destination = event.ctrlKey ? $scope.trash : $scope.cube[1 - $scope.viewIndex][$scope.color][row][col];
		insertSorted(destination, card);
		var increment = ($scope.viewIndex == 0) ? -1 : (event.ctrlKey ? 0 : 1);
		var totals = $scope.totals[$scope.color];
		totals.total += increment;
		totals.colTotals[col] += increment;
		totals.rowTotals[row] += increment;
		if (event.ctrlKey) {
			loaded.delete(card);
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
				$scope.editing = false;
				$scope.color = ($scope.color + 1) & 0x1F;
				break;
			case 'Escape':
				$scope.editing = false;
				break;
		}
    };
	
	$scope.toggleView = function() {
		$scope.editing = false;
		$scope.viewIndex = 1 - $scope.viewIndex;
	};
	
	$scope.color = 1;

	$scope.toggleColor = function(color, e) {
		$scope.editing = false;
		if (!e.shiftKey) {
			$scope.color = 0;
		}
		$scope.color ^= Color[color];
	};
	
	$scope.colorSelected = function(color) {
		return Boolean($scope.color & Color[color]);
	};
	
	function rotateForward() {
		$scope.editing = false;
		$scope.color = ($scope.color << 1) & 0x1F | (($scope.color & 0x10) >> 4);
	}
	
	function rotateBackward() {
		$scope.editing = false;
		$scope.color = ($scope.color >> 1) | (($scope.color & 0x1) << 4);
	}
	
	$scope.saveProgress = function() {
		var contents = {
			main: flatten($scope.cube[0]),
			reserve: flatten($scope.cube[1])
		};
		var download = document.getElementById('download');
		download.download = $scope.filename;
		download.href = 'data:application/json;charset=utf-8;base64,' + utf8ToBase64(JSON.stringify(contents));
		download.click();
	}
	
	$scope.listTrash = function() {
		window.open('data:application/json;charset=utf-8;base64,' + utf8ToBase64($scope.trash.join('\n')));
	}
	
	$scope.exportView = function() {
		window.open('data:application/json;charset=utf-8;base64,' + utf8ToBase64(flatten($scope.view()).join('\n')));
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
					if (!contents.main || !contents.reserve) {
						alert('This JSON file is not in valid cube format.');
					} else {
						$scope.$apply(function() {
							loadJson(contents);
						});
					}
					break;
				default:
					alert('Invalid type: ' + file.type + '.  Must be plain text or JSON.');
			}
		}
		reader.readAsText(file, 'UTF-8');
	};
	
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
			if (loaded.has(cardName)) {
				continue;
			}
			loaded.add(cardName);
			
			var manaCostCategory = $scope.manaCostMap.get(card.manaCost);
			var typeCategory = $scope.typeMap.get(card.types);
			if (typeCategory != null) {
				var colors = card.types & Type.LAND ? (card.offColors || 0) : card.colors;
				insertSorted($scope.cube[viewIndex][colors][typeCategory][manaCostCategory], card.name);
				if (viewIndex == 0) {
					var totals = $scope.totals[colors];
					totals.total++;
					totals.rowTotals[typeCategory]++;
					totals.colTotals[manaCostCategory]++;
				}
			}
		}
		if (badCards.length) {
			alert('Bad cards: ' + badCards.join(', '));
		}
	}
	
	// MOUSEOVER CARD TEXT

	$scope.card = {
		text: null,
		show: false,
		hover: false,
	};

	$scope.showCard = function(card, e) {
		$scope.card.hover = true;
		var card = $scope.cubeData[Diacritics.remove(card).toLowerCase()];
		$scope.card.text = card.text || 'CARD TEXT NOT FOUND';
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
	
	// TAG MENU
	
	$scope.tagMenuOpen = false;
	
	$scope.showTagMenu = function(e) {
		$scope.tagMenuOpen = true;
		$scope.tagMenu.setPosition(e.clientX, e.clientY);
		e.preventDefault();
	}
	
	$scope.hideTagMenu = function() {
		$scope.editing = undefined;
	}
	
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

app.directive('cardEdit', function($parse) {
    return function(scope, element, attrs) {
		element.css('top', '50%');
		element.css('left', '50%');

		console.log('offset:' + document.body.offsetHeight);
		console.log('client:' + document.body.clientHeight);
		console.log('scroll:' + document.body.scrollHeight);
		
		var rect = element[0].getBoundingClientRect();

		if (rect.bottom >= document.body.scrollHeight) {
			element.css('top', '');
			element.css('bottom', '50%');
		}
		
		if (rect.right >= document.body.scrollWidth) {
			element.css('left', '');
			element.css('right', '50%');
		}
    };
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
	PLANESWALKER: 0x80
};

var Color = {
	WHITE: 0x1,
	BLUE: 0x2,
	BLACK: 0x4,
	RED: 0x8,
	GREEN: 0x10
}

var COLORS = ["WHITE", "BLUE", "BLACK", "RED", "GREEN"];

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

function insertSorted(array, item) {
	array.splice(insertionIndex(array, item), 0, item);
}

function insertionIndex(array, item) {
	var low = 0;
	var high = array.length - 1;
	while (low <= high) {
		var mid = Math.floor((low + high) / 2);
		if (item > array[mid]) {
			low = mid + 1;
		} else if (item < array[mid]) {
			high = mid - 1;
		} else {
			return mid;
		}
	}
	return low;
}
