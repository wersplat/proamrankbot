require('dotenv').config();
const { updateAllPlayerRoles } = require('../utils/roleAutomation');

/**
 * This script should be run daily via cron to update player roles
 */

console.log('Running daily role update...');

updateAllPlayerRoles()
  .then(() => {
    console.log('Daily role update completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Daily role update failed:', error);
    process.exit(1);
  });
