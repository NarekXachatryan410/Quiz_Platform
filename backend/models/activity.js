'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Activity extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Activity.belongsTo(models.Session, { foreignKey: "sessionId" })
      Activity.hasMany(models.Question, { foreignKey: "activityId" })
    }
  }
  Activity.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    sessionId: DataTypes.INTEGER,
    type: DataTypes.STRING,
    step: DataTypes.INTEGER,
    title: DataTypes.STRING,
    timerSeconds: DataTypes.INTEGER,
    instruction: DataTypes.TEXT,
    fragmentsCount: DataTypes.INTEGER,
    scoring: DataTypes.JSON,
    showLeaderboardAfterEach: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'Activity',
  });
  return Activity;
};
