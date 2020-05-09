import { Router } from 'express';
import mongoose from 'mongoose';
import auth from '../auth';

const router = Router();

const User = mongoose.model('User');

// Preload user profile on routes with ':username'
router.param('username', async (req, res, next, username) => {
  try {
    const user = await User.findOne({ username });
    if (!user) return res.sendStatus(404);
    req.profile = user;
    return next();
  } catch (error) {
    return next(error);
  }
});

router.get('/:username', auth.optional, async (req, res, next) => {
  try {
    if (req.payload) {
      const user = await User.findById(req.payload.id);

      if (!user) {
        return res.json({ profile: req.profile.toProfileJSONFor(false) });
      }

      return res.json({ profile: req.profile.toProfileJSONFor(user) });
    }
    return res.json({ profile: req.profile.toProfileJSONFor(false) });
  } catch (error) {
    return next(error);
  }
});

router.post('/:username/follow', auth.required, async (req, res, next) => {
  try {
    const profileId = req.profile._id;

    const user = await User.findById(req.payload.id);

    if (!user) { return res.sendStatus(401); }

    await user.follow(profileId);

    return res.json({ profile: req.profile.toProfileJSONFor(user) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:username/follow', auth.required, async (req, res, next) => {
  try {
    const profileId = req.profile._id;

    const user = await User.findById(req.payload.id);

    if (!user) { return res.sendStatus(401); }

    await user.unfollow(profileId);

    return res.json({ profile: req.profile.toProfileJSONFor(user) });
  } catch (error) {
    return next(error);
  }
});

export default router;
