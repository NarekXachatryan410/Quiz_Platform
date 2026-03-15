'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Session extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Session.hasMany(models.Activity, { foreignKey: "sessionId" });
      Session.hasMany(models.Player, { foreignKey: "sessionId" })
    }
  }
  Session.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: DataTypes.STRING,
    roomCode: {
      type: DataTypes.STRING,
      unique: true
    },
    maxParticipants: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('waiting', 'active', 'finished'),
      defaultValue: 'waiting'
    },
    currentStep: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    currentActivityId: DataTypes.STRING,
    currentQuestionIndex: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    timerEndAt: DataTypes.DATE,
    timerDurationSeconds: DataTypes.INTEGER,
    adminId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
  }, {
    sequelize,
    modelName: 'Session',
  });
  return Session;
};
