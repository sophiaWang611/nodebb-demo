'use strict';

var async = require('async');

var db = require('../../common/database');
var categories = require('../../service/categories/index');
var privileges = require('../../service/privileges/index');
var plugins = require('../../service/plugins/index');

var homePageController = module.exports;

homePageController.get = function (req, res, next) {
	async.waterfall([
		function (next) {
			db.getSortedSetRange('categories:cid', 0, -1, next);
		},
		function (cids, next) {
			privileges.categories.filterCids('find', cids, 0, next);
		},
		function (cids, next) {
			categories.getCategoriesFields(cids, ['name', 'slug'], next);
		},
		function (categoryData, next) {
			categoryData = categoryData.map(function (category) {
				return {
					route: 'category/' + category.slug,
					name: 'Category: ' + category.name,
				};
			});

			plugins.fireHook('filter:homepage.get', { routes: [
				{
					route: 'categories',
					name: 'Categories',
				},
				{
					route: 'recent',
					name: 'Recent',
				},
				{
					route: 'top',
					name: 'Top',
				},
				{
					route: 'popular',
					name: 'Popular',
				},
			].concat(categoryData) }, next);
		},
		function (data) {
			data.routes.push({
				route: '',
				name: 'Custom',
			});

			res.render('admin/general/homepage', data);
		},
	], next);
};
