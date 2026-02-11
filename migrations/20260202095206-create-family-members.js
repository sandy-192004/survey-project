'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('family_members', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },

      family_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },

      member_type: {
        type: Sequelize.ENUM('parent', 'child'),
        allowNull: false
      },

      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },

      relationship: {
        type: Sequelize.ENUM('husband', 'wife', 'son', 'daughter', 'other'),
        allowNull: false
      },

      mobile: {
        type: Sequelize.STRING(20),
        allowNull: true
      },

      occupation: {
        type: Sequelize.STRING(255),
        allowNull: true
      },

      dob: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },

      gender: {
        type: Sequelize.ENUM('Male', 'Female', 'Other'),
        allowNull: true
      },

      door_no: {
        type: Sequelize.STRING(50),
        allowNull: true
      },

      street: {
        type: Sequelize.STRING(255),
        allowNull: true
      },

      district: {
        type: Sequelize.STRING(255),
        allowNull: true
      },

      state: {
        type: Sequelize.STRING(255),
        allowNull: true
      },

      pincode: {
        type: Sequelize.STRING(10),
        allowNull: true
      },

      photo: {
        type: Sequelize.STRING(255),
        allowNull: true
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('family_members');
  }
};
