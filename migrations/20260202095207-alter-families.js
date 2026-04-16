'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Make user_id nullable
    await queryInterface.changeColumn('families', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      unique: false // Remove unique constraint since NULL can be multiple
    });

    // Add created_by_admin column
    await queryInterface.addColumn('families', 'created_by_admin', {
      type: Sequelize.TINYINT(1),
      allowNull: false,
      defaultValue: 0
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert user_id to not null
    await queryInterface.changeColumn('families', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      unique: true
    });

    // Remove created_by_admin column
    await queryInterface.removeColumn('families', 'created_by_admin');
  }
};
