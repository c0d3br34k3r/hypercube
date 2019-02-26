function powerSet(items) {
	var result = [];
	for (var i = 0, len = 1 << items.length; i < len; i++) {
		var subset = [];
		for (var j = 0, len = items.length; j < len; j++) {
			if (i & (1 << j)) {
				subset.push(items[j]);
			}
		}
		result.push(subset)
	}
	return result;
}