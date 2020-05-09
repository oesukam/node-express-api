import { Router } from 'express';
import mongoose from 'mongoose';
import auth from '../auth';
import requestAsyncHandler from '../../middlewares/requestAsyncHandler';

const router = Router();

const Article = mongoose.model('Article');
const Comment = mongoose.model('Comment');
const User = mongoose.model('User');


// Preload article objects on routes with ':article'
router.param('article', requestAsyncHandler(async (req, res, next, slug) => {
  const article = await Article.findOne({ slug })
    .populate('author');

  if (!article) { return res.sendStatus(404); }

  req.article = article;

  return next();
}));

router.param('comment', requestAsyncHandler(async (req, res, next, id) => {
  const comment = Comment.findById(id);

  if (!comment) { return res.sendStatus(404); }

  req.comment = comment;

  return next();
}));

router.get('/', auth.optional, (req, res, next) => {
  const query = {};
  let limit = 20;
  let offset = 0;

  if (typeof req.query.limit !== 'undefined') {
    limit = req.query.limit;
  }

  if (typeof req.query.offset !== 'undefined') {
    offset = req.query.offset;
  }

  if (typeof req.query.tag !== 'undefined') {
    query.tagList = { $in: [req.query.tag] };
  }

  Promise.all([
    req.query.author ? User.findOne({ username: req.query.author }) : null,
    req.query.favorited ? User.findOne({ username: req.query.favorited }) : null,
  ]).then((results) => {
    const author = results[0];
    const favoriter = results[1];

    if (author) {
      query.author = author._id;
    }

    if (favoriter) {
      query._id = { $in: favoriter.favorites };
    } else if (req.query.favorited) {
      query._id = { $in: [] };
    }

    return Promise.all([
      Article.find(query)
        .limit(Number(limit))
        .skip(Number(offset))
        .sort({ createdAt: 'desc' })
        .populate('author')
        .exec(),
      Article.count(query).exec(),
      req.payload ? User.findById(req.payload.id) : null,
    ]).then((articleResults) => {
      const articles = articleResults[0];
      const articlesCount = results[1];
      const user = results[2];

      return res.json({
        articles: articles.map((article) => article.toJSONFor(user)),
        articlesCount,
      });
    });
  }).catch(next);
});

router.get('/feed', auth.required, (req, res, next) => {
  let limit = 20;
  let offset = 0;

  if (typeof req.query.limit !== 'undefined') {
    limit = req.query.limit;
  }

  if (typeof req.query.offset !== 'undefined') {
    offset = req.query.offset;
  }

  User.findById(req.payload.id).then((user) => {
    if (!user) { return res.sendStatus(401); }

    return Promise.all([
      Article.find({ author: { $in: user.following } })
        .limit(Number(limit))
        .skip(Number(offset))
        .populate('author')
        .exec(),
      Article.count({ author: { $in: user.following } }),
    ]).then((results) => {
      const articles = results[0];
      const articlesCount = results[1];

      return res.json({
        articles: articles.map((article) => article.toJSONFor(user)),
        articlesCount,
      });
    }).catch(next);
  });
});

router.post('/', auth.required, (req, res, next) => {
  User.findById(req.payload.id).then((user) => {
    if (!user) { return res.sendStatus(401); }

    const article = new Article(req.body.article);

    article.author = user;

    return article.save().then(() => {
      console.log(article.author);
      return res.json({ article: article.toJSONFor(user) });
    });
  }).catch(next);
});

// return a article
router.get('/:article', auth.optional, (req, res, next) => {
  Promise.all([
    req.payload ? User.findById(req.payload.id) : null,
    req.article.populate('author').execPopulate(),
  ]).then((results) => {
    const user = results[0];

    return res.json({ article: req.article.toJSONFor(user) });
  }).catch(next);
});

// update article
router.put('/:article', auth.required, (req, res, next) => {
  User.findById(req.payload.id).then((user) => {
    if (req.article.author._id.toString() === req.payload.id.toString()) {
      if (typeof req.body.article.title !== 'undefined') {
        req.article.title = req.body.article.title;
      }

      if (typeof req.body.article.description !== 'undefined') {
        req.article.description = req.body.article.description;
      }

      if (typeof req.body.article.body !== 'undefined') {
        req.article.body = req.body.article.body;
      }

      if (typeof req.body.article.tagList !== 'undefined') {
        req.article.tagList = req.body.article.tagList;
      }

      return req.article.save()
        .then((article) => res.json({ article: article.toJSONFor(user) })).catch(next);
    }

    return res.sendStatus(403);
  });
});

// delete article
router.delete('/:article', auth.required, (req, res, next) => {
  User.findById(req.payload.id).then((user) => {
    if (!user) { return res.sendStatus(401); }

    if (req.article.author._id.toString() === req.payload.id.toString()) {
      return req.article.remove().then(() => res.sendStatus(204));
    }
    return res.sendStatus(403);
  }).catch(next);
});

// Favorite an article
router.post('/:article/favorite', auth.required, (req, res, next) => {
  const articleId = req.article._id;

  User.findById(req.payload.id).then((user) => {
    if (!user) { return res.sendStatus(401); }

    return user.favorite(articleId)
      .then(() => req.article.updateFavoriteCount()
        .then((article) => res.json({ article: article.toJSONFor(user) })));
  }).catch(next);
});

// Unfavorite an article
router.delete('/:article/favorite', auth.required, (req, res, next) => {
  const articleId = req.article._id;

  User.findById(req.payload.id).then((user) => {
    if (!user) { return res.sendStatus(401); }

    return user.unfavorite(articleId)
      .then(() => req.article.updateFavoriteCount()
        .then((article) => res.json({ article: article.toJSONFor(user) })));
  }).catch(next);
});

// return an article's comments
router.get('/:article/comments', auth.optional, (req, res, next) => Promise.resolve(
  req.payload ? User.findById(req.payload.id) : null,
)
  .then((user) => req.article.populate({
    path: 'comments',
    populate: {
      path: 'author',
    },
    options: {
      sort: {
        createdAt: 'desc',
      },
    },
  }).execPopulate().then(() => res.json({
    comments: req.article.comments.map((comment) => comment.toJSONFor(user)),
  }))).catch(next));

// create a new comment
router.post('/:article/comments', auth.required, (req, res, next) => {
  User.findById(req.payload.id).then((user) => {
    if (!user) { return res.sendStatus(401); }

    const comment = new Comment(req.body.comment);
    comment.article = req.article;
    comment.author = user;

    return comment.save().then(() => {
      req.article.comments.push(comment);

      return req.article.save().then(() => {
        res.json({ comment: comment.toJSONFor(user) });
      });
    });
  }).catch(next);
});

router.delete('/:article/comments/:comment', auth.required, (req, res) => {
  if (req.comment.author.toString() === req.payload.id.toString()) {
    req.article.comments.remove(req.comment._id);
    req.article.save()
      .then(Comment.find({ _id: req.comment._id }).remove().exec())
      .then(() => {
        res.sendStatus(204);
      });
  } else {
    res.sendStatus(403);
  }
});

module.exports = router;
