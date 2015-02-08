/* global define, window */
define(function (require) {
	
	var Modernizr = require('modernizr'),
		fparser = require('utils/fountain/parser'),
		fliner = require('utils/fountain/liner'), 
		converter = require('utils/converters/scriptconverter'),
		decorator = require('utils/decorator');

	var plugin = {};
	var _tempStorage = {};

	plugin.data = function (key, value) {
		if (Modernizr.localstorage) {
			if (arguments.length === 1) {
				return window.localStorage.getItem('com.afterwriting.labs.local-storage.' + key);
			} else {
				window.localStorage.setItem('com.afterwriting.labs.local-storage.' + key, value);
			}
		} else {
			if (arguments.length === 1) {
				return _tempStorage[key];
			} else {
				_tempStorage[key] = value;
			}
		}
	};
	
	plugin.format = '';

	plugin.script = decorator.property(function(value){
		var result = converter.to_fountain(value);		
		plugin.format = result.format;
		return result.value;
	});
	
	plugin.parse = decorator(function() {
		plugin.parsed = fparser.parse(plugin.script(), plugin.config);
		plugin.parsed.lines = fliner.line(plugin.parsed.tokens, plugin.config);
		
		if (plugin.config.use_print_settings_for_stats) {
			plugin.parsed_stats = plugin.parsed;
		}
		else {			
			var stats_config = Object.create(plugin.config);
			stats_config.print_actions = true;
			stats_config.print_headers = true;
			stats_config.print_dialogues = true;
			stats_config.print_sections = false;
			stats_config.print_notes = false;
			stats_config.print_synopsis = false;
			plugin.parsed_stats = fparser.parse(plugin.script(), stats_config);
			plugin.parsed_stats.lines = fliner.line(plugin.parsed_stats.tokens, stats_config);
		}
	});
	
	plugin.get_title_page_token = function(type) {
		var result = null;
		if (plugin.parsed && plugin.parsed.title_page) {
			plugin.parsed.title_page.forEach(function(token){
				if (token.is(type)) {
					result = token;
				}
			});
		}
		return result;
	};
	
	var A4_DEFAULT_MAX = 58,
		US_DEFAULT_MAX = 61;

	var print_profiles = {
		"a4": {
			paper_size: "a4",
			lines_per_page: 57,
			top_margin: 1.0,
			page_width: 8.27,
			page_height: 11.7,
			left_margin: 1.5,
			right_margin: 1,
			font_width: 0.1,
			font_height: 0.1667,
			line_spacing: 1,
			page_number_top_margin: 0.5,
			dual_max_factor: 0.75,
			title_page: {
				top_start: 3.5,
				left_side: ['notes', 'copyright'],
				right_side: ['draft date', 'date', 'contact']
			},
			scene_heading: {
				feed: 1.5,
				max: A4_DEFAULT_MAX
			},
			action: {
				feed: 1.5,
				max: A4_DEFAULT_MAX
			},
			shot: {
				feed: 1.5,
				max: A4_DEFAULT_MAX
			},
			character: {
				feed: 3.5,
				max: 33
			},
			parenthetical: {
				feed: 3,
				max: 26
			},
			dialogue: {
				feed: 2.5,
				max: 36
			},
			transition: {
				feed: 0.0,
				max: A4_DEFAULT_MAX
			},
			centered: {
				feed: 1.5,
				style: 'center',
				max: A4_DEFAULT_MAX
			},
			synopsis: {
				feed: 0.5,
				max: A4_DEFAULT_MAX,
				italic: true,
				color: '#888888',
				padding: 0,
				feed_with_last_section: true
			},
			section: {
				feed: 0.5,
				max: A4_DEFAULT_MAX,
				color: '#555555',
				level_indent: 0.2
			},
			note: {
				color: '#888888',
				italic: true
			}
			
		},
	};

	print_profiles.usletter = JSON.parse(JSON.stringify(print_profiles.a4));
	var letter  = print_profiles.usletter;
	letter.paper_size = 'letter';
	letter.lines_per_page = 55;
	letter.page_width = 8.5;
	letter.page_height = 11;
	
	letter.scene_heading.max = US_DEFAULT_MAX;
	letter.action.max = US_DEFAULT_MAX;
	letter.shot.max = US_DEFAULT_MAX;
	letter.transition.max = US_DEFAULT_MAX;
	letter.section.max = US_DEFAULT_MAX;
	letter.synopsis.max = US_DEFAULT_MAX;

	plugin.default_config = {
		show_background_image: true,
		embolden_scene_headers: false,
		show_page_numbers: true,
		split_dialogue: true,
		print_title_page: true,
		text: {},
		print_profile: "a4",
		load_last_opened: false,
		double_space_between_scenes: false,
		print_sections: false,
		print_synopsis: false,
		print_actions: true,
		print_headers: true,
		print_dialogues: true,
		number_sections: false,
		use_dual_dialogue: true,
		stats_keep_last_scene_time: true,
		stats_who_with_who_max: 10,
		print_notes: false,
		print_header: '',
		print_footer: '',
		print_watermark: '',
		scenes_numbers: 'none',
		each_scene_on_new_page: false,
		use_print_settings_for_stats: true
	};
	

	plugin.default_config.print = function () {
		return print_profiles[plugin.config.print_profile];
	};

	plugin.save_config = function () {
		plugin.data('config', JSON.stringify(plugin.config));
	};

	plugin.reset_config = function () {
		plugin.data('config', JSON.stringify({}));
		plugin.load_config();
	};

	plugin.load_config = function () {
		plugin.config = Object.create(plugin.default_config);		
		var overrides;
		try {
			overrides = JSON.parse(plugin.data('config'));
		}
		catch (error) {
			overrides = {};
		}
		for (var attrname in overrides) {
			plugin.config[attrname] = overrides[attrname];
		}
	};
	
	plugin.prepare = function() {
		plugin.load_config();
	};

	return plugin;

});