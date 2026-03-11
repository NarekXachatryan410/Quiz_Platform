'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Activities', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      sessionId: {
        type: Sequelize.UUID
      },
      type: {
        type: Sequelize.STRING
      },
      step: {
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.STRING
      },
      timerSeconds: {
        type: Sequelize.INTEGER
      },
      instruction: {
        type: Sequelize.TEXT
      },
      fragmentsCount: {
        type: Sequelize.INTEGER
      },
      scoring: {
        type: Sequelize.JSON
      },
      showLeaderboardAfterEach: {
        type: Sequelize.BOOLEAN
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Activities');
  }
};