import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();
const Article = mongoose.model('Article');

// return a list of tags
router.get('/', (req, res, next) => {
  Article.find().distinct('tagList')
    .then((tags) => res.json({ tags }))
    .catch(next);
});

module.exports = router;
