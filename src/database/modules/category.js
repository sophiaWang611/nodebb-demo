'use strict';
const sequelize = require("sequelize");

const Category = sequelize.define('category', {
	cid: {
		type: Sequelize.INTEGER,
		allowNull: false,
	},
	name: {
		type: Sequelize.STRING,
		allowNull: false,
	},
	description: {
		type: Sequelize.STRING,
	},
	description_parsed: {
		type: Sequelize.STRING,
	},
	bg_color: {
		type: Sequelize.STRING,
	},
	color: {
		type: Sequelize.STRING,
	},
	icon: {
		type: Sequelize.STRING,
	},
	order: {
		type: Sequelize.INTEGER,
	},
	create_at: {
		type: Sequelize.DATE,
		defaultValue: Sequelize.NOW
	},
	update_at: {
		type: Sequelize.DATE,
		defaultValue: Sequelize.NOW
	}
});

module.exports = Category;