'use strict';

var async = require('async');

var user = require('../../service/user/index');
var meta = require('../../service/meta/index');
var pagination = require('../../utils/pagination');

module.exports = function (SocketUser) {
	SocketUser.search = function (socket, data, callback) {
		if (!data) {
			return callback(new Error('[[error:invalid-data]]'));
		}

		if (!socket.uid && parseInt(meta.config.allowGuestUserSearching, 10) !== 1) {
			return callback(new Error('[[error:not-logged-in]]'));
		}

		async.waterfall([
			function (next) {
				user.search({
					query: data.query,
					page: data.page,
					searchBy: data.searchBy,
					sortBy: data.sortBy,
					onlineOnly: data.onlineOnly,
					bannedOnly: data.bannedOnly,
					flaggedOnly: data.flaggedOnly,
					uid: socket.uid,
				}, next);
			},
			function (result, next) {
				result.pagination = pagination.create(data.page, result.pageCount);
				result['route_users:' + data.sortBy] = true;
				next(null, result);
			},
		], callback);
	};
};
