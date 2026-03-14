'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Players', 'sessionId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Sessions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.addColumn('Players', 'totalScore', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false
    });

    await queryInterface.addColumn('Players', 'socketId', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Players', 'sessionId');
    await queryInterface.removeColumn('Players', 'totalScore');
    await queryInterface.removeColumn('Players', 'socketId');
  }
};