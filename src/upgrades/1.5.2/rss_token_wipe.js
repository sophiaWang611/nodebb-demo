'use strict';

var async = require('async');
var batch = require('../../utils/batch');
var db = require('../../common/database');

module.exports = {
	name: 'Wipe all existing RSS tokens',
	timestamp: Date.UTC(2017, 6, 5),
	method: function (callback) {
		var progress = this.progress;

		batch.processSortedSet('users:joindate', function (uids, next) {
			async.eachLimit(uids, 500, function (uid, next) {
				progress.incr();
				db.deleteObjectField('user:' + uid, 'rss_token', next);
			}, next);
		}, {
			progress: progress,
		}, callback);
	},
};
