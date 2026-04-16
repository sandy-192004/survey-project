'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('users');

    if (!table.role) {
      await queryInterface.addColumn('users', 'role', {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'user'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('users');

    if (table.role) {
      await queryInterface.removeColumn('users', 'role');
    }
  }
};