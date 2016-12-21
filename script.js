var app = angular.module('app', []);

app.controller('Controller', ['$scope', '$http', function ($scope, $http) {

	$http.get('./cube-data.json', {responseType: 'json'}).then(function(result) {
		$scope.cubeData = result.data;
		$http.get('./categories.json', {responseType: 'json'}).then(function(result) {
			setup(result.data);
		});
	});
	
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
				$scope.color = ($scope.color + 1) & 0x1F;
				break;
		}
    };
	
	$scope.toggleView = function() {
		$scope.viewIndex = 1 - $scope.viewIndex;
	};
	
	$scope.colors = Object.keys(Color);
	$scope.color = 1;

	$scope.toggleColor = function(color, e) {
		if (!e.shiftKey) {
			$scope.color = 0;
		}
		$scope.color ^= Color[color];
	};
	
	$scope.colorSelected = function(color) {
		return Boolean($scope.color & Color[color]);
	};
	
	function rotateForward() {
		$scope.color = ($scope.color << 1) & 0x1F | (($scope.color & 0x10) >> 4);
	}
	
	function rotateBackward() {
		$scope.color = ($scope.color >> 1) | (($scope.color & 0x1) << 4);
	}
	
	$scope.saveProgress = function() {
		var contents = {
			main: flatten($scope.cube[0]),
			reserve: flatten($scope.cube[1])
		};
		$scope.downloadElement.download = $scope.filename;
		$scope.downloadElement.href = 'data:application/json;charset=utf-8;base64,' + btoa(JSON.stringify(contents));
		$scope.downloadElement.click();
	}
	
	$scope.listTrash = function() {
		window.open('data:application/json;charset=utf-8;base64,' + btoa($scope.trash.join('\n')));
	}
	
	$scope.exportView = function() {
		window.open('data:application/json;charset=utf-8;base64,' + btoa(flatten($scope.view()).join('\n')));
	}
	
	$scope.upload = function() {
		$scope.uploadElement.click();
	};
	
	$scope.readFile = function(event) {
		var reader = new FileReader();
		var file = event.target.files[0];
		reader.onload = function(event) {
			var data = event.target.result
			switch (file.type) {
				case 'text/plain':
					loadView(data.split(/\r?\n/), $scope.viewIndex);
					break;
				case 'application/json':
					$scope.filename = file.name;
					var contents = JSON.parse(data);
					if (!contents.main || !contents.reserve) {
						alert('This JSON file is not in valid cube format.');
					} else {
						loadView(contents.main, 0);
						loadView(contents.reserve, 1);
					}
					break;
				default:
					alert('Invalid type: ' + file.type + '.  Must be plain text or JSON.');
			}
			$scope.$apply();
		}
		reader.readAsText(file, 'UTF-8');
	};
	
	function loadView(cards, viewIndex) {
		var badCards = [];
		for (var line of cards) {
			var cardName = Diacritics.remove(line.trim().toLowerCase());
			if (!cardName || cardName.startsWith('#')) {
				continue;
			}
			var card = $scope.cubeData[cardName];
			if (card == null) {
				badCards.push(cardName);
				continue;
			}
			if (loaded.has(cardName)) {
				continue;
			}
			loaded.add(cardName);
			
			var manaCostCategory = $scope.manaCostMap.get(card.manaCost);
			var typeCategory = $scope.typeMap.get(card.types);
			if (typeCategory != null) {
				var colors = card.types & Type.LAND ? card.colors2 : card.colors1;
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
		top: 0,
		left: 0
	};
	
	$scope.showCard = function(card, e) {
		$scope.card.hover = true;
		var card = $scope.cubeData[Diacritics.remove(card).toLowerCase()];
		$scope.card.text = card ? card.text : 'CARD TEXT NOT FOUND';
		$scope.repositionCard(e);
	};
	
	$scope.hideCard = function() {
		$scope.card.hover = false;
	};
	
	$scope.repositionCard = function(e) {
		var x = e.clientX;
		var y = e.clientY;
		var width = mouseoverDisplay.offsetWidth;
		var height = mouseoverDisplay.offsetHeight;
		$scope.card.left = x + width + PADDING < window.innerWidth || x < window.innerWidth / 2
				? x + PADDING
				: x - width - PADDING;
		$scope.card.top = y + height + PADDING < window.innerHeight || y < window.innerHeight / 2
				? y + PADDING
				: y - height;
	}

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
	
}]);

app.directive('id', function() {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			switch(attrs['id']) {
				case 'mouseoverDisplay': 
					scope.mouseoverDisplay = element[0];
					break;
				case 'upload':
					scope.uploadElement = element[0];
					break;
				case 'download':
					scope.downloadElement = element[0];
					break;
			}
		}
	};
});

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

var PADDING = 8;
