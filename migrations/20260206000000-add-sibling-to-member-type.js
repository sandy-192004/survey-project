'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // First, check if the enum type already includes 'sibling'
    // MySQL doesn't support altering enum values directly, so we need to recreate the column
    
    // Get the current column definition
    const [columns] = await queryInterface.sequelize.query(`
      SELECT COLUMN_TYPE, COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'family_members' 
      AND COLUMN_NAME = 'member_type'
    `);
    
    if (columns.length > 0) {
      const currentType = columns[0].COLUMN_TYPE;
      console.log('Current member_type enum:', currentType);
      
      // Check if 'sibling' is already in the enum
      if (!currentType.includes('sibling')) {
        // Need to modify the column - drop and recreate
        await queryInterface.sequelize.query(`
          ALTER TABLE family_members MODIFY COLUMN member_type 
          ENUM('parent', 'child', 'sibling') NOT NULL
        `);
        console.log('Successfully added sibling to member_type enum');
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Revert to original enum values
    await queryInterface.sequelize.query(`
      ALTER TABLE family_members MODIFY COLUMN member_type 
      ENUM('parent', 'child') NOT NULL
    `);
  }
};
