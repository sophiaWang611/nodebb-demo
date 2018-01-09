'use strict';

var db = require('../../common/database');

var async = require('async');
var winston = require('winston');

module.exports = {
	name: 'Group title from settings to user profile',
	timestamp: Date.UTC(2016, 3, 14),
	method: function (callback) {
		var user = require('../../service/user/index');
		var batch = require('../../utils/batch');
		var count = 0;
		batch.processSortedSet('users:joindate', function (uids, next) {
			winston.verbose('upgraded ' + count + ' users');
			user.getMultipleUserSettings(uids, function (err, settings) {
				if (err) {
					return next(err);
				}
				count += uids.length;
				settings = settings.filter(function (setting) {
					return setting && setting.groupTitle;
				});

				async.each(settings, function (setting, next) {
					db.setObjectField('user:' + setting.uid, 'groupTitle', setting.groupTitle, next);
				}, next);
			});
		}, {}, callback);
	},
};
