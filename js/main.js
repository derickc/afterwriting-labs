/*global require*/
require.config({
	baseUrl: 'js',
	paths: {
		templates: '../templates/compiled',
		jquery: 'libs/jquery-1.11.1.min',
		handlebars: 'libs/handlebars',
		logger: 'libs/logger',
		saveAs: 'libs/FileSaver',
		d3: 'libs/d3.min',
		modernizr: 'libs/modernizr',
		pdfkit: 'libs/pdfkit',
		impromptu: 'libs/jquery-impromptu.min',
		jstree: 'libs/jstree.min',
		cookie: 'libs/jquery.cookie',
		dropbox: 'libs/dropbox.min'
	},
	shim: {
		handlebars: {
			exports: 'Handlebars'
		},
		logger: {
			exports: 'Logger'
		},
		saveAs: {
			exports: 'saveAs'
		},
		modernizr: {
			exports: 'Modernizr'
		},
		dropbox: {
			exports: 'Dropbox'
		}
	}
});
