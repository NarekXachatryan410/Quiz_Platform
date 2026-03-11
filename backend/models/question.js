'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Question extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Question.belongsTo(models.Activity, { foreignKey: "activityId" })
      Question.hasMany(models.Answer, { foreignKey: "questionId" })
    }
  }
  Question.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    activityId: DataTypes.INTEGER,
    text: DataTypes.STRING,
    options: DataTypes.JSON,
    correctIndex: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Question',
  });
  return Question;
};
