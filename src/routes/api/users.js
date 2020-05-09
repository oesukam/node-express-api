import { Router } from 'express';
import mongoose from 'mongoose';
import passport from 'passport';
import auth from '../auth';
import requestAsyncHandler from '../../middlewares/requestAsyncHandler';


const router = Router();
const User = mongoose.model('User');

router.get('/user', auth.required, requestAsyncHandler(async (req, res) => {
  const user = await User.findById(req.payload.id);
  if (!user) { return res.sendStatus(401); }

  return res.json({ user: user.toAuthJSON() });
}));

router.put('/user', auth.required, requestAsyncHandler(async (req, res) => {
  let user = User.findById(req.payload.id);
  if (!user) { return res.sendStatus(401); }

  // only update fields that were actually passed...
  if (typeof req.body.user.username !== 'undefined') {
    user.username = req.body.user.username;
  }

  if (typeof req.body.user.email !== 'undefined') {
    user.email = req.body.user.email;
  }

  if (typeof req.body.user.bio !== 'undefined') {
    user.bio = req.body.user.bio;
  }

  if (typeof req.body.user.image !== 'undefined') {
    user.image = req.body.user.image;
  }

  if (typeof req.body.user.password !== 'undefined') {
    user.setPassword(req.body.user.password);
  }

  user = await user.save();

  return res.json({ user: user.toAuthJSON() });
}));

router.post('/users/login', (req, res, next) => {
  const { user } = req.body;
  if (!user.email) {
    return res.status(422).json({ errors: { email: "can't be blank" } });
  }

  if (!user.password) {
    return res.status(422).json({
      errors: {
        password: "can't be blank",
      },
    });
  }

  return passport.authenticate('local', { session: false }, (err, userInfo, info) => {
    if (err) { return next(err); }

    if (userInfo) {
      userInfo.token = userInfo.generateJWT();
      return res.json({ user: userInfo.toAuthJSON() });
    }
    return res.status(422).json(info);
  })(req, res, next);
});

router.post('/users', requestAsyncHandler(async (req, res) => {
  const { body } = req;
  const user = new User();

  user.username = body.user.username;
  user.email = body.user.email;
  user.setPassword(body.user.password);

  await user.save();

  return res.json({ user: user.toAuthJSON() });
}));

module.exports = router;
