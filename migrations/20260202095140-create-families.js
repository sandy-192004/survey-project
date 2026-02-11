'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('families', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },

      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true
      },

      family_code: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('families');
  }
};
