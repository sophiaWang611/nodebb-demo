'use strict';

var async = require('async');

var languages = require('../../utils/languages');
var meta = require('../../service/meta/index');

var languagesController = module.exports;

languagesController.get = function (req, res, next) {
	async.waterfall([
		function (next) {
			languages.list(next);
		},
		function (languages) {
			languages.forEach(function (language) {
				language.selected = language.code === (meta.config.defaultLang || 'en-GB');
			});

			res.render('admin/general/languages', {
				languages: languages,
				autoDetectLang: parseInt(meta.config.autoDetectLang, 10) === 1,
			});
		},
	], next);
};

