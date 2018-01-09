'use strict';

var rewardsAdmin = require('../../service/rewards/admin');
var SocketRewards = module.exports;

SocketRewards.save = function (socket, data, callback) {
	rewardsAdmin.save(data, callback);
};

SocketRewards.delete = function (socket, data, callback) {
	rewardsAdmin.delete(data, callback);
};

