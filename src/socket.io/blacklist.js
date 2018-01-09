
'use strict';

var async = require('async');

var user = require('../service/user/index');
var meta = require('../service/meta/index');

var SocketBlacklist = module.exports;

SocketBlacklist.validate = function (socket, data, callback) {
	meta.blacklist.validate(data.rules, callback);
};

SocketBlacklist.save = function (socket, rules, callback) {
	async.waterfall([
		function (next) {
			user.isAdminOrGlobalMod(socket.uid, next);
		},
		function (isAdminOrGlobalMod, next) {
			if (!isAdminOrGlobalMod) {
				return callback(new Error('[[error:no-privileges]]'));
			}

			meta.blacklist.save(rules, next);
		},
	], callback);
};
