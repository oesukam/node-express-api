import { Router } from 'express';
import mongoose from 'mongoose';
import auth from '../auth';
import requestAsyncHandler from '../../middlewares/requestAsyncHandler';

const router = Router();

const User = mongoose.model('User');

// Preload user profile on routes with ':username'
router.param('username', requestAsyncHandler(async (req, res, next, username) => {
  const user = await User.findOne({ username });
  if (!user) return res.sendStatus(404);
  req.profile = user;
  return next();
}));

router.get('/:username', auth.optional, requestAsyncHandler(async (req, res) => {
  if (req.payload) {
    const user = await User.findById(req.payload.id);

    if (!user) {
      return res.json({ profile: req.profile.toProfileJSONFor(false) });
    }

    return res.json({ profile: req.profile.toProfileJSONFor(user) });
  }
  return res.json({ profile: req.profile.toProfileJSONFor(false) });
}));

router.post('/:username/follow', auth.required, requestAsyncHandler(async (req, res) => {
  const profileId = req.profile._id;

  const user = await User.findById(req.payload.id);

  if (!user) { return res.sendStatus(401); }

  await user.follow(profileId);

  return res.json({ profile: req.profile.toProfileJSONFor(user) });
}));

router.delete('/:username/follow', auth.required, requestAsyncHandler(async (req, res) => {
  const profileId = req.profile._id;

  const user = await User.findById(req.payload.id);

  if (!user) { return res.sendStatus(401); }

  await user.unfollow(profileId);

  return res.json({ profile: req.profile.toProfileJSONFor(user) });
}));

export default router;
