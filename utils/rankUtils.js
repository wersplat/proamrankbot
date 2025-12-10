/**
 * Determine draft tier based on RP
 * @param {number} rp - Player's RP value
 * @returns {string} Draft tier
 */
function getDraftTier(rp) {
  if (rp >= 1500) {
    return 'S-Tier';
  } else if (rp >= 1300) {
    return 'A-Tier';
  } else if (rp >= 1100) {
    return 'B-Tier';
  } else if (rp >= 900) {
    return 'C-Tier';
  } else {
    return 'D-Tier';
  }
}

/**
 * Get role name based on draft tier
 * @param {string} tier - Draft tier
 * @returns {string} Role name
 */
function getRoleForTier(tier) {
  return `Tier ${tier.charAt(0)}`;
}

/**
 * Get role name based on team association
 * @param {object} player - Player object
 * @param {object} team - Team object (if player has a team)
 * @returns {string} Role name
 */
function getTeamRole(player, team) {
  if (team) {
    return team.name;
  } else {
    return 'Free Agent';
  }
}

/**
 * Get role name based on event status
 * Event role handling currently disabled (no event registrations / draft pool)
 * @returns {string} Role name
 */
function getEventRole() {
  return 'No Events';
}

module.exports = {
  getDraftTier,
  getRoleForTier,
  getTeamRole,
  getEventRole
};
