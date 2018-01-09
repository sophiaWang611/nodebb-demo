
'use strict';


var winston = require('winston');
var async = require('async');
var nconf = require('nconf');
var session = require('express-session');
var _ = require('lodash');
var semver = require('semver');
var Sequelize = require('sequelize');
var db;

var mysqlModule = module.exports;

mysqlModule.questions = [
	{
		name: 'mysql:uri',
		description: 'Host IP or address of your mysql instance',
		default: nconf.get('mysql:uri') || '',
		hideOnWebInstall: true,
	},
	{
		name: 'mysql:host',
		description: 'Host IP or address of your mysql instance',
		default: nconf.get('mysql:host') || '127.0.0.1',
	},
	{
		name: 'mysql:port',
		description: 'Host port of your mysql instance',
		default: nconf.get('mysql:port') || 3306,
	},
	{
		name: 'mysql:username',
		description: 'mysql username',
		default: nconf.get('mysql:username') || '',
	},
	{
		name: 'mysql:password',
		description: 'Password of your mysql database',
		default: nconf.get('mysql:password') || '',
		hidden: true,
		before: function (value) { value = value || nconf.get('mysql:password') || ''; return value; },
	},
	{
		name: 'mysql:database',
		description: 'mysql database name',
		default: nconf.get('mysql:database') || 'nodebb',
	},
];

mysqlModule.helpers = mysqlModule.helpers || {};
mysqlModule.helpers.mysql = require('./mysql/helpers');

mysqlModule.init = function (callback) {
	callback = callback || function () { };

	var usernamePassword = '';
	if (nconf.get('mysql:username') && nconf.get('mysql:password')) {
		usernamePassword = nconf.get('mysql:username') + ':' + encodeURIComponent(nconf.get('mysql:password')) + '@';
	} else {
		winston.warn('You have no mysql username/password setup!');
	}

	// Sensible defaults for mysql, if not set
	if (!nconf.get('mysql:host')) {
		nconf.set('mysql:host', '127.0.0.1');
	}
	if (!nconf.get('mysql:port')) {
		nconf.set('mysql:port', 3306);
	}
	if (!nconf.get('mysql:database')) {
		nconf.set('mysql:database', 'nodebb');
	}

	const sequelize = new Sequelize({
		host: nconf.get('mysql:host'),
		port: nconf.get('mysql:port'),
		database: nconf.get('mysql:database'),
		username: nconf.get('mysql:username'),
		password: nconf.get('mysql:password'),
		dialect: 'mysql',
		pool: {
			max: 5,
			idle: 30000,
			acquire: 60000,
		},
	});
	db = sequelize;

	mysqlModule.client = sequelize;

	require('./mysql/main')(sequelize, mysqlModule);
	require('./mysql/hash')(sequelize, mysqlModule);
	require('./mysql/sets')(sequelize, mysqlModule);
	require('./mysql/sorted')(sequelize, mysqlModule);
	require('./mysql/list')(sequelize, mysqlModule);
	callback();
};

mysqlModule.initSessionStore = function (callback) {
	var meta = require('../service/meta/index');
	var sessionStore;

	var ttl = meta.getSessionTTLSeconds();

	if (nconf.get('redis')) {
		sessionStore = require('connect-redis')(session);
		var rdb = require('./redis');
		rdb.client = rdb.connect();

		mysqlModule.sessionStore = new sessionStore({
			client: rdb.client,
			ttl: ttl,
		});
	}

	callback();
};

mysqlModule.createIndices = function (callback) {
	function createIndex(collection, index, options, callback) {
		mysqlModule.client.collection(collection).createIndex(index, options, callback);
	}

	if (!mysqlModule.client) {
		winston.warn('[database/createIndices] database not initialized');
		return callback();
	}

	winston.info('[database] Checking database indices.');
	async.series([
		async.apply(createIndex, 'objects', { _key: 1, score: -1 }, { background: true }),
		async.apply(createIndex, 'objects', { _key: 1, value: -1 }, { background: true, unique: true, sparse: true }),
		async.apply(createIndex, 'objects', { expireAt: 1 }, { expireAfterSeconds: 0, background: true }),
	], function (err) {
		if (err) {
			winston.error('Error creating index', err);
			return callback(err);
		}
		winston.info('[database] Checking database indices done!');
		callback();
	});
};

mysqlModule.checkCompatibility = function (callback) {
	var sequelizePkg = require('Sequelize/package.json');
	mysqlModule.checkCompatibilityVersion(sequelizePkg.version, callback);
};

mysqlModule.checkCompatibilityVersion = function (version, callback) {
	callback();
};

mysqlModule.info = function (db, callback) {
	if (!db) {
		return callback();
	}
	async.waterfall([
		function (next) {
			async.parallel({
				serverStatus: function (next) {
					db.command({ serverStatus: 1 }, next);
				},
				stats: function (next) {
					db.command({ dbStats: 1 }, next);
				},
				listCollections: function (next) {
					getCollectionStats(db, next);
				},
			}, next);
		},
		function (results, next) {
			var stats = results.stats;
			var scale = 1024 * 1024 * 1024;

			results.listCollections = results.listCollections.map(function (collectionInfo) {
				return {
					name: collectionInfo.ns,
					count: collectionInfo.count,
					size: collectionInfo.size,
					avgObjSize: collectionInfo.avgObjSize,
					storageSize: collectionInfo.storageSize,
					totalIndexSize: collectionInfo.totalIndexSize,
					indexSizes: collectionInfo.indexSizes,
				};
			});

			stats.mem = results.serverStatus.mem;
			stats.mem = results.serverStatus.mem;
			stats.mem.resident = (stats.mem.resident / 1024).toFixed(3);
			stats.mem.virtual = (stats.mem.virtual / 1024).toFixed(3);
			stats.mem.mapped = (stats.mem.mapped / 1024).toFixed(3);
			stats.collectionData = results.listCollections;
			stats.network = results.serverStatus.network;
			stats.raw = JSON.stringify(stats, null, 4);

			stats.avgObjSize = stats.avgObjSize.toFixed(2);
			stats.dataSize = (stats.dataSize / scale).toFixed(3);
			stats.storageSize = (stats.storageSize / scale).toFixed(3);
			stats.fileSize = stats.fileSize ? (stats.fileSize / scale).toFixed(3) : 0;
			stats.indexSize = (stats.indexSize / scale).toFixed(3);
			stats.storageEngine = results.serverStatus.storageEngine ? results.serverStatus.storageEngine.name : 'mmapv1';
			stats.host = results.serverStatus.host;
			stats.version = results.serverStatus.version;
			stats.uptime = results.serverStatus.uptime;
			stats.mongo = true;

			next(null, stats);
		},
	], callback);
};

function getCollectionStats(db, callback) {
	async.waterfall([
		function (next) {
			db.listCollections().toArray(next);
		},
		function (items, next) {
			async.map(items, function (collection, next) {
				db.collection(collection.name).stats(next);
			}, next);
		},
	], callback);
}

mysqlModule.close = function (callback) {
	callback = callback || function () {};
	db.close(callback);
};
