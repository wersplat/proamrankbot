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
 * @param {object} player - Player object
 * @param {array} events - Events player is registered for
 * @param {array} draftPool - Draft pool entries for player
 * @returns {string} Role name
 */
function getEventRole(player, events, draftPool) {
  // Check if player is in draft pool for any active event
  if (draftPool && draftPool.length > 0) {
    // Check if any draft pool entry has status 'drafted'
    const draftedEntry = draftPool.find(entry => entry.status === 'drafted');
    if (draftedEntry) {
      return 'Drafted';
    }
    
    // Check if any draft pool entry has status 'available'
    const availableEntry = draftPool.find(entry => entry.status === 'available');
    if (availableEntry) {
      return 'In Pool';
    }
  }
  
  // Check if player is registered for any active event
  if (events && events.length > 0) {
    return 'Registered';
  }
  
  return 'No Events';
}

module.exports = {
  getDraftTier,
  getRoleForTier,
  getTeamRole,
  getEventRole
};
