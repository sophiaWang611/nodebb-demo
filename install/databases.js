'use strict';

var async = require('async');
var prompt = require('prompt');
var winston = require('winston');

var questions = {
	redis: require('../src/database/redis').questions,
	mongo: require('../src/database/mongo').questions,
	mysql: require('../src/database/mysql').questions,
};

module.exports = function (config, callback) {
	async.waterfall([
		function (next) {
			winston.info('\nNow configuring ' + config.database + ' database:');
			getDatabaseConfig(config, next);
		},
	], callback);
};

function getDatabaseConfig(config, callback) {
	if (!config) {
		return callback(new Error('aborted'));
	}

	if (config.database === 'redis') {
		if (config['redis:host'] && config['redis:port']) {
			callback(null, config);
		} else {
			prompt.get(questions.redis, callback);
		}
	} else if (config.database === 'mongo') {
		if ((config['mongo:host'] && config['mongo:port']) || config['mongo:uri']) {
			callback(null, config);
		} else {
			prompt.get(questions.mongo, callback);
		}
	} else if (config.database === 'mysql') {
		if ((config['mysql:host'] && config['mysql:port']) || config['mysql:uri']) {
			callback(null, config);
		} else {
			prompt.get(questions.mysql, callback);
		}
	} else {
		return callback(new Error('unknown database : ' + config.database));
	}
}
