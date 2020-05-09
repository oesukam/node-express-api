import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import slug from 'slug';

const User = mongoose.model('User');

const ArticleSchema = new mongoose.Schema({
  slug: { type: String, lowercase: true, unique: true },
  title: String,
  description: String,
  body: String,
  favoritesCount: { type: Number, default: 0 },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  tagList: [{ type: String }],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

ArticleSchema.plugin(uniqueValidator, { message: 'is already taken' });

ArticleSchema.pre('validate', function (next) {
  if (!this.slug) {
    this.slugify();
  }

  next();
});

const randomNumbers = () => (Math.random() * 36 ** 6 || 0).toString(36);

ArticleSchema.methods.slugify = function () {
  this.slug = `${slug(this.title)}-${randomNumbers()}`;
};

ArticleSchema.methods.updateFavoriteCount = async function () {
  const article = this;

  const count = await User.count({ favorites: { $in: [article._id] } });

  article.favoritesCount = count;

  return article.save();
};

ArticleSchema.methods.toJSONFor = function (user) {
  return {
    slug: this.slug,
    title: this.title,
    description: this.description,
    body: this.body,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    tagList: this.tagList,
    favorited: user ? user.isFavorite(this._id) : false,
    favoritesCount: this.favoritesCount,
    author: this.author.toProfileJSONFor(user),
  };
};

mongoose.model('Article', ArticleSchema);
