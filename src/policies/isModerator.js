'use strict';

module.exports = async (policyContext, config, { strapi }) => {
  const { user } = policyContext.state;

  if (!user) {
    return false;
  }

  // Check if user is moderator or app admin
  const isModerator = user.isModerator === true;
  const isAppAdmin = user.isAppAdmin === true;

  if (isModerator || isAppAdmin) {
    return true;
  }

  // Log unauthorized access attempt
  console.log(`Unauthorized moderation access attempt by user ${user.id} (${user.username})`);
  
  return false;
};

