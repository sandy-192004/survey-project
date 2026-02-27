'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add relation_type column to family_members table
    await queryInterface.addColumn('family_members', 'relation_type', {
      type: Sequelize.ENUM(
        'husband',
        'wife',
        'son',
        'daughter',
        'father',
        'mother',
        'brother',
        'sister'
      ),
      allowNull: true,
      after: 'member_type'
    });

    // Add sibling_side column for tracking which side the sibling belongs to
    await queryInterface.addColumn('family_members', 'sibling_side', {
      type: Sequelize.ENUM('husband', 'wife'),
      allowNull: true,
      after: 'relation_type'
    });

    // Update existing records to populate relation_type from relationship
    await queryInterface.sequelize.query(`
      UPDATE family_members 
      SET relation_type = relationship 
      WHERE relationship IN ('husband', 'wife', 'son', 'daughter', 'father', 'mother', 'brother', 'sister')
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('family_members', 'relation_type');
    await queryInterface.removeColumn('family_members', 'sibling_side');
  }
};
