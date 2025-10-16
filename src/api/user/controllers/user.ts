/**
 * user controller
 */

export default {
  // Get user abilities/permissions
  async abilities(ctx) {
    const { user } = ctx.state;

    if (!user) {
      return ctx.unauthorized('User not authenticated');
    }

    const abilities = {
      isAppAdmin: user.isAppAdmin === true,
      isModerator: user.isModerator === true
    };

    ctx.body = { data: abilities };
  }
};


