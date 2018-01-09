'use strict';

var async = require('async');
var _ = require('lodash');
var groups = require('../groups/index');
var plugins = require('../plugins/index');
var db = require('../../common/database');
var privileges = require('../privileges/index');
var meta = require('../meta/index');
var User = module.exports;

User.email = require('./actions/email');
User.notifications = require('./actions/notifications');
User.reset = require('./actions/reset');
User.digest = require('./actions/digest');

require('./actions/data')(User);
require('./actions/auth')(User);
require('./actions/bans')(User);
require('./actions/create')(User);
require('./actions/posts')(User);
require('./actions/topics')(User);
require('./actions/categories')(User);
require('./actions/follow')(User);
require('./actions/profile')(User);
require('./actions/admin')(User);
require('./actions/delete')(User);
require('./actions/settings')(User);
require('./actions/search')(User);
require('./actions/jobs')(User);
require('./actions/picture')(User);
require('./actions/approval')(User);
require('./actions/invite')(User);
require('./actions/password')(User);
require('./actions/info')(User);
require('./actions/online')(User);

User.getUidsFromSet = function (set, start, stop, callback) {
	if (set === 'users:online') {
		var count = parseInt(stop, 10) === -1 ? stop : stop - start + 1;
		var now = Date.now();
		db.getSortedSetRevRangeByScore(set, start, count, '+inf', now - 300000, callback);
	} else {
		db.getSortedSetRevRange(set, start, stop, callback);
	}
};

User.getUsersFromSet = function (set, uid, start, stop, callback) {
	async.waterfall([
		function (next) {
			User.getUidsFromSet(set, start, stop, next);
		},
		function (uids, next) {
			User.getUsers(uids, uid, next);
		},
	], callback);
};

User.getUsersWithFields = function (uids, fields, uid, callback) {
	async.waterfall([
		function (next) {
			plugins.fireHook('filter:users.addFields', { fields: fields }, next);
		},
		function (data, next) {
			data.fields = _.uniq(data.fields);

			async.parallel({
				userData: function (next) {
					User.getUsersFields(uids, data.fields, next);
				},
				isAdmin: function (next) {
					User.isAdministrator(uids, next);
				},
			}, next);
		},
		function (results, next) {
			results.userData.forEach(function (user, index) {
				if (user) {
					user.administrator = results.isAdmin[index];

					if (user.hasOwnProperty('status')) {
						user.status = User.getStatus(user);
					}

					if (user.hasOwnProperty('banned')) {
						user.banned = parseInt(user.banned, 10) === 1;
					}

					if (user.hasOwnProperty(['email:confirmed'])) {
						user['email:confirmed'] = parseInt(user['email:confirmed'], 10) === 1;
					}
				}
			});
			plugins.fireHook('filter:userlist.get', { users: results.userData, uid: uid }, next);
		},
		function (data, next) {
			next(null, data.users);
		},
	], callback);
};

User.getUsers = function (uids, uid, callback) {
	User.getUsersWithFields(uids, [
		'uid', 'username', 'userslug', 'picture', 'status',
		'postcount', 'reputation', 'email:confirmed', 'lastonline',
		'flags', 'banned', 'banned:expire', 'joindate',
	], uid, callback);
};

User.getStatus = function (userData) {
	var isOnline = (Date.now() - parseInt(userData.lastonline, 10)) < 300000;
	return isOnline ? (userData.status || 'online') : 'offline';
};

User.exists = function (uid, callback) {
	db.isSortedSetMember('users:joindate', uid, callback);
};

User.existsBySlug = function (userslug, callback) {
	User.getUidByUserslug(userslug, function (err, exists) {
		callback(err, !!exists);
	});
};

User.getUidByUsername = function (username, callback) {
	if (!username) {
		return callback(null, 0);
	}
	db.sortedSetScore('username:uid', username, callback);
};

User.getUidsByUsernames = function (usernames, callback) {
	db.sortedSetScores('username:uid', usernames, callback);
};

User.getUidByUserslug = function (userslug, callback) {
	if (!userslug) {
		return callback(null, 0);
	}
	db.sortedSetScore('userslug:uid', userslug, callback);
};

User.getUsernamesByUids = function (uids, callback) {
	async.waterfall([
		function (next) {
			User.getUsersFields(uids, ['username'], next);
		},
		function (users, next) {
			users = users.map(function (user) {
				return user.username;
			});

			next(null, users);
		},
	], callback);
};

User.getUsernameByUserslug = function (slug, callback) {
	async.waterfall([
		function (next) {
			User.getUidByUserslug(slug, next);
		},
		function (uid, next) {
			User.getUserField(uid, 'username', next);
		},
	], callback);
};

User.getUidByEmail = function (email, callback) {
	db.sortedSetScore('email:uid', email.toLowerCase(), callback);
};

User.getUidsByEmails = function (emails, callback) {
	emails = emails.map(function (email) {
		return email && email.toLowerCase();
	});
	db.sortedSetScores('email:uid', emails, callback);
};

User.getUsernameByEmail = function (email, callback) {
	async.waterfall([
		function (next) {
			db.sortedSetScore('email:uid', email.toLowerCase(), next);
		},
		function (uid, next) {
			User.getUserField(uid, 'username', next);
		},
	], callback);
};

User.isModerator = function (uid, cid, callback) {
	privileges.users.isModerator(uid, cid, callback);
};

User.isModeratorOfAnyCategory = function (uid, callback) {
	User.getModeratedCids(uid, function (err, cids) {
		callback(err, Array.isArray(cids) ? !!cids.length : false);
	});
};

User.isAdministrator = function (uid, callback) {
	privileges.users.isAdministrator(uid, callback);
};

User.isGlobalModerator = function (uid, callback) {
	privileges.users.isGlobalModerator(uid, callback);
};

User.getPrivileges = function (uid, callback) {
	async.parallel({
		isAdmin: async.apply(User.isAdministrator, uid),
		isGlobalModerator: async.apply(User.isGlobalModerator, uid),
		isModeratorOfAnyCategory: async.apply(User.isModeratorOfAnyCategory, uid),
	}, callback);
};

User.isPrivileged = function (uid, callback) {
	User.getPrivileges(uid, function (err, results) {
		callback(err, results ? (results.isAdmin || results.isGlobalModerator || results.isModeratorOfAnyCategory) : false);
	});
};

User.isAdminOrGlobalMod = function (uid, callback) {
	async.parallel({
		isAdmin: async.apply(User.isAdministrator, uid),
		isGlobalMod: async.apply(User.isGlobalModerator, uid),
	}, function (err, results) {
		callback(err, results ? (results.isAdmin || results.isGlobalMod) : false);
	});
};

User.isAdminOrSelf = function (callerUid, uid, callback) {
	isSelfOrMethod(callerUid, uid, User.isAdministrator, callback);
};

User.isAdminOrGlobalModOrSelf = function (callerUid, uid, callback) {
	isSelfOrMethod(callerUid, uid, User.isAdminOrGlobalMod, callback);
};

User.isPrivilegedOrSelf = function (callerUid, uid, callback) {
	isSelfOrMethod(callerUid, uid, User.isPrivileged, callback);
};

function isSelfOrMethod(callerUid, uid, method, callback) {
	if (parseInt(callerUid, 10) === parseInt(uid, 10)) {
		return callback();
	}
	async.waterfall([
		function (next) {
			method(callerUid, next);
		},
		function (isPass, next) {
			if (!isPass) {
				return next(new Error('[[error:no-privileges]]'));
			}
			next();
		},
	], callback);
}

User.getAdminsandGlobalMods = function (callback) {
	async.waterfall([
		function (next) {
			async.parallel([
				async.apply(groups.getMembers, 'administrators', 0, -1),
				async.apply(groups.getMembers, 'Global Moderators', 0, -1),
			], next);
		},
		function (results, next) {
			User.getUsersData(_.union(results), next);
		},
	], callback);
};

User.getAdminsandGlobalModsandModerators = function (callback) {
	async.waterfall([
		function (next) {
			async.parallel([
				async.apply(groups.getMembers, 'administrators', 0, -1),
				async.apply(groups.getMembers, 'Global Moderators', 0, -1),
				async.apply(User.getModeratorUids),
			], next);
		},
		function (results, next) {
			User.getUsersData(_.union.apply(_, results), next);
		},
	], callback);
};

User.getModeratorUids = function (callback) {
	async.waterfall([
		async.apply(db.getSortedSetRange, 'categories:cid', 0, -1),
		function (cids, next) {
			var groupNames = cids.reduce(function (memo, cid) {
				memo.push('cid:' + cid + ':privileges:moderate');
				memo.push('cid:' + cid + ':privileges:groups:moderate');
				return memo;
			}, []);

			groups.getMembersOfGroups(groupNames, next);
		},
		function (memberSets, next) {
			// Every other set is actually a list of user groups, not uids, so convert those to members
			var sets = memberSets.reduce(function (memo, set, idx) {
				if (idx % 2) {
					memo.working.push(set);
				} else {
					memo.regular.push(set);
				}

				return memo;
			}, { working: [], regular: [] });

			groups.getMembersOfGroups(sets.working, function (err, memberSets) {
				next(err, sets.regular.concat(memberSets || []));
			});
		},
		function (memberSets, next) {
			next(null, _.union.apply(_, memberSets));
		},
	], callback);
};

User.getModeratedCids = function (uid, callback) {
	var cids;
	async.waterfall([
		function (next) {
			db.getSortedSetRange('categories:cid', 0, -1, next);
		},
		function (_cids, next) {
			cids = _cids;
			User.isModerator(uid, cids, next);
		},
		function (isMods, next) {
			cids = cids.filter(function (cid, index) {
				return cid && isMods[index];
			});
			next(null, cids);
		},
	], callback);
};

User.addInterstitials = function (callback) {
	plugins.registerHook('core', {
		hook: 'filter:register.interstitial',
		method: function (data, callback) {
			if (meta.config.termsOfUse && !data.userData.acceptTos) {
				data.interstitials.push({
					template: 'partials/acceptTos',
					data: {
						termsOfUse: meta.config.termsOfUse,
					},
					callback: function (userData, formData, next) {
						if (formData['agree-terms'] === 'on') {
							userData.acceptTos = true;
						}

						next(userData.acceptTos ? null : new Error('[[register:terms_of_use_error]]'));
					},
				});
			}

			callback(null, data);
		},
	});

	callback();
};

