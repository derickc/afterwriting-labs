define('utils/fountain/liner', function (require) {

	var h = require('utils/fountain/helpers');

	var module = {};

	var _state = 'normal'; // 'dialogue'

	var split_text = function (text, max, index, token) {
		if (text.length <= max) {
			return [h.create_line({
				type: token.type,
				token: token,
				text: text,
				start: index,
				end: index + text.length - 1
			})];
		}
		var pointer = text.substr(0, max + 1).lastIndexOf(" ");

		if (pointer === -1) {
			pointer = max - 1;
		}

		return [h.create_line({
			type: token.type,
			token: token,
			text: text.substr(0, pointer),
			start: index,
			end: index + pointer
		})].concat(split_text(text.substr(pointer + 1), max, index + pointer, token));
	};

	var split_token = function (token, max) {
		token.lines = split_text(token.text || "", max, token.start, token);
	};

	var default_breaker = function (index, lines, cfg) {
		var CONTD = cfg.text.continued || "(CONT'D)";
		var MORE = cfg.text.more || "(MORE)";
		
		for (var before = index - 1; before && !(lines[before].text); before--) {}
		for (var after = index + 1; after < lines.length && !(lines[after].text); after++) {}

		// possible break is after this token
		var token_on_break = lines[index];
		
		var token_after = lines[after];
		var token_before = lines[before];

		if (token_on_break.is("scene_heading") && token_after && !token_after.is("scene_heading")) {
			return false;
		}
		else if (token_after && token_after.is('transition') && !token_on_break.is('transition')) {
			return false;
		}
		// action block 1,2 or 3 lines.
		// don't break unless it's the last line
		else if (token_on_break.is('action') &&
				token_on_break.token.lines.length < 4 &&
				token_on_break.token.lines.indexOf(token_on_break) !== token_on_break.token.lines.length - 1) {
			return false;
		}
		// for and more lines
		// break on any line different than first and penultimate
		// ex.
		// aaaaaaaaa <--- don't break after this line
		// aaaaaaaaa <--- allow breaking after this line
		// aaaaaaaaa <--- allow breaking after this line
		// aaaaaaaaa <--- don't break after this line 
		// aaaaaaaaa <--- allow breaking after this line
		else if (token_on_break.is('action') && 
				token_on_break.token.lines.length >= 4 &&
				(token_on_break.token.lines.indexOf(token_on_break) === 0 ||
				token_on_break.token.lines.indexOf(token_on_break) === token_on_break.token.lines.length - 2)) {
			return false;
		} else if (cfg.split_dialogue && token_on_break.is("dialogue") && token_after && token_after.is("dialogue") && token_before.is("dialogue") && !(token_on_break.dual)) {
			for (var character = before; lines[character].type !== "character"; character--) {}
			lines.splice(index, 0, h.create_line({
				type: "parenthetical",
				text: MORE,
				start: token_on_break.start,
				end: token_on_break.end,
				token: token_on_break.token
			}), h.create_line({
				type: "character",
				text: lines[character].text.trim() + " " + (lines[character].text.indexOf(CONTD) !== -1 ? '' : CONTD),
				start: token_after.start,
				end: token_after.end,
				token: token_on_break.token
			}));
			return true;
		} else if (lines[index].is_dialogue() !== -1 &&  lines[after] && lines[after].is("dialogue", "parenthetical")) {
			return false; // or break
		}
		return true;
	};

	var break_lines = function (lines, max, breaker, cfg) {
		while (lines.length && !(lines[0].text)) {
			lines.shift();
		}

		var s = max;
		var p, internal_break = 0;

		for (var i = 0; i < lines.length && i < max; i++) {
			if (lines[i].type === 'page_break') {
				internal_break = i;
			}
		}

		if (!internal_break) {
			if (lines.length <= max) {
				return lines;
			}
			do {
				for (p = s - 1; p && !(lines[p].text); p--) {}
				s = p;
			} while (!breaker(p, lines, cfg));
		} else {
			p = internal_break - 1;
		}
		var page = lines.slice(0, p + 1);
		page.push(h.create_line({
			type: "page_break"
		}));
		var append = break_lines(lines.slice(p + 1), max, breaker, cfg);
		return page.concat(append);
	};

	var fold_dual_dialogue = function (lines) {
		var any_unfolded_dual_dialogue_exists = true;

		var get_first_unfolded_dual_left = function () {
			for (var i = 0; i < lines.length; i++) {
				if (lines[i].token &&
					lines[i].token.type === 'character' &&
					lines[i].token.dual === 'left' &&
					lines[i].right_column === undefined) {
					return i;
				}
			}
			return -1;
		};
		var get_first_unfolded_dual_right_index_from = function (index) {
			for (var i = index; i < lines.length; i++) {
				if (lines[i].token &&
					lines[i].token.type === 'character' &&
					lines[i].token.dual === 'right') {
					return i;
				}
			}
			return -1;
		};
		var count_dialogue_tokens = function (right_index) {
			var result = 0;
			while (lines[right_index] && lines[right_index].is_dialogue()) {
				result++;
				right_index++;
			}
			return result;
		};
		var fold_dual_dialogue = function (left_index, right_index) {
			var dialogue_tokens = count_dialogue_tokens(right_index);
			var right_lines = lines.splice(right_index, dialogue_tokens);
			lines[left_index].right_column = right_lines;
		};

		while (any_unfolded_dual_dialogue_exists) {
			var left_index = get_first_unfolded_dual_left();
			var right_index = left_index === -1 ? -1 : get_first_unfolded_dual_right_index_from(left_index);
			any_unfolded_dual_dialogue_exists = left_index !== -1 && right_index !== -1;
			if (any_unfolded_dual_dialogue_exists) {
				fold_dual_dialogue(left_index, right_index);
			}
		}

	};


	module.line = function (tokens, cfg) {

		var lines = [],
			global_index = 0;

		_state = 'normal';
		
		tokens.forEach(function (token) {
			var max = (cfg.print()[token.type] || {}).max || cfg.print().action.max;

			if (token.dual) {
				max *= cfg.print().dual_max_factor;
			}

			split_token(token, max);
			
			if (token.is('scene_heading') && lines.length) {
				token.lines[0].number = token.number;
			}

			token.lines.forEach(function (line, index) {
				line.local_index = index;
				line.global_index = global_index++;
				lines.push(line);
			});
		});

		fold_dual_dialogue(lines);

		lines = break_lines(lines, cfg.print().lines_per_page, cfg.lines_breaker || default_breaker, cfg);

		return lines;
	};

	return module;

});