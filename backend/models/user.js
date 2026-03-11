'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      User.belongsTo(models.Session, { foreignKey: "sessionId" });
      User.hasMany(models.Answer, { foreignKey: "userId" });
    }
  }
  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    password: DataTypes.STRING,
    fullName: {
      type: DataTypes.VIRTUAL,
      get() {
        return `${this.firstName} ${this.lastName}`;
      }
    },
    sessionId: DataTypes.INTEGER,
    totalScore: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    socketId: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};
