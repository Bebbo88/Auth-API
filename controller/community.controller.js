const asyncHandler = require("express-async-handler");
const Post = require("../models/post.model copy");
const Comment = require("../models/comment.model");
const Like = require("../models/like.model");
const Activity = require("../models/activity.model");
const {
  createPostSchema,
  createCommentSchema,
} = require("../middlewares/community.validation");

// Helper to record activity
const recordActivity = async (
  userId,
  type,
  targetId,
  targetModel,
  description
) => {
  try {
    await Activity.create({
      user: userId,
      type,
      targetId,
      targetModel,
      description,
    });
  } catch (error) {
    console.error("Activity Record Error:", error);
  }
};

// ======= Create Post =======
const createPost = asyncHandler(async (req, res) => {
  const { error } = createPostSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { content, category } = req.body;
  let media = null;
  let mediaType = "NONE";

  if (req.file) {
    media = `/uploads/${req.file.filename}`;
  }

  const post = await Post.create({
    user: req.currentUser._id,
    content,
    category,
    media,
    mediaType,
  });

  await recordActivity(
    req.currentUser._id,
    "POST_CREATED",
    post._id,
    "Post",
    "Created a new post"
  );

  const responsePost = await buildPostResponse(
    post._id,
    req.currentUser._id
  );

  res.status(201).json(responsePost);
});

// ======= Get Posts =======
const getPosts = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.category) filter.category = req.query.category;

  const totalCount = await Post.countDocuments(filter);
  const lastPage = Math.ceil(totalCount / limit);

  let posts = await Post.find(filter)
    .populate("user", "_id firstName lastName email avatar")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

  const userId = req.currentUser._id;
  const postIds = posts.map((p) => p._id);
  const likes = await Like.find({ user: userId, post: { $in: postIds } });
  const likedPostIds = likes.map((l) => l.post.toString());
  posts = posts.map((p) => ({
    ...p,
    isLiked: likedPostIds.includes(p._id.toString()),
  }));

  res.json({
    totalCount,
    lastPage,
    count: posts.length,
    page,
    limit,
    data: posts,
  });
});
// ======= Update Post =======
const updatePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    res.status(404);
    throw new Error("Post not found");
  }

  if (post.user.toString() !== req.currentUser._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to update this post");
  }

  const { content, category } = req.body;

  if (content !== undefined) post.content = content;
  if (category !== undefined) post.category = category;

  if (req.file) {
    post.media = req.file.path.replace(/\\/g, "/");
    if (req.file.mimetype.startsWith("image/")) post.mediaType = "IMAGE";
    if (req.file.mimetype.startsWith("video/")) post.mediaType = "VIDEO";
  }

  await post.save();

  await recordActivity(
    req.currentUser._id,
    "POST_UPDATED",
    post._id,
    "Post",
    "Updated a post"
  );

  res.json(post);
});

// ======= Like Post =======
const likePost = asyncHandler(async (req, res) => {
  const postId = req.params.id;
  const userId = req.currentUser._id;

  const post = await Post.findById(postId);
  if (!post) {
    res.status(404);
    throw new Error("Post not found");
  }

  const existingLike = await Like.findOne({ user: userId, post: postId });

  if (existingLike) {
    await existingLike.deleteOne();
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $inc: { likesCount: -1 } },
      { new: true }
    );
    if (updatedPost.likesCount < 0) updatedPost.likesCount = 0;
    res.json({ message: "Post unliked", likesCount: updatedPost.likesCount });
  } else {
    await Like.create({ user: userId, post: postId });
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $inc: { likesCount: 1 } },
      { new: true }
    );
    await recordActivity(userId, "LIKED_POST", postId, "Post", "Liked a post");
    res.json({ message: "Post liked", likesCount: updatedPost.likesCount });
  }
});

// ======= Add Comment =======
const addComment = asyncHandler(async (req, res) => {
  const { error } = createCommentSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const postId = req.params.id;

  const post = await Post.findById(postId);
  if (!post) {
    res.status(404);
    throw new Error("Post not found");
  }

  const comment = await Comment.create({
    user: req.currentUser._id,
    post: postId,
    content: req.body.content,
  });

  const populatedComment = await Comment.findById(comment._id)
    .populate("user", "_id firstName lastName email avatar");

  await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

  await recordActivity(
    req.currentUser._id,
    "COMMENT_ADDED",
    populatedComment._id,
    "Comment",
    "Commented on a post"
  );

  res.status(201).json(populatedComment);
});

// ======= Update Comment =======
const updateComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) {
    res.status(404);
    throw new Error("Comment not found");
  }

  if (comment.user.toString() !== req.currentUser._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to update this comment");
  }

  const { content } = req.body;
  if (content !== undefined) comment.content = content;

  await comment.save();

  await recordActivity(
    req.currentUser._id,
    "COMMENT_UPDATED",
    comment._id,
    "Comment",
    "Updated a comment"
  );

  res.json(comment);
});

// ======= Get Comments =======
const getComments = asyncHandler(async (req, res) => {
  const comments = await Comment.find({ post: req.params.id })
    .populate("user", "_id firstName lastName email avatar")
    .sort({ createdAt: 1 });
  res.json(comments);
});

// ======= Get Activity =======
const getActivity = asyncHandler(async (req, res) => {
  const activity = await Activity.find({ user: req.currentUser._id }).sort({
    createdAt: -1,
  });
  res.json(activity);
});

// ======= Get Posts By User Id =======
const getPostsByUserId = asyncHandler(async (req, res) => {
  const profileUserId = req.params.userId;
  const currentUserId = req.currentUser._id;
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;

  const totalCount = await Post.countDocuments({ user: profileUserId });
  const lastPage = Math.ceil(totalCount / limit);

  let posts = await Post.find({ user: profileUserId })
    .populate("user", "_id firstName lastName email avatar")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

  if (!posts.length) {
    return res.json({
      totalCount,
      lastPage,
      count: 0,
      page,
      limit,
      data: [],
    });
  }

  const postIds = posts.map((p) => p._id);

  const likes = await Like.find({
    user: currentUserId,
    post: { $in: postIds },
  });

  const likedPostIds = likes.map((l) => l.post.toString());

  posts = posts.map((post) => ({
    ...post,
    isLiked: likedPostIds.includes(post._id.toString()),
  }));

  res.json({
    totalCount,
    lastPage,
    count: posts.length,
    page,
    limit,
    data: posts,
  });
});

const buildPostResponse = async (postId, userId) => {
  let post = await Post.findById(postId)
    .populate("user", "_id firstName lastName email avatar")
    .lean();

  const isLiked = await Like.exists({
    user: userId,
    post: postId,
  });

  return {
    ...post,
    isLiked: !!isLiked,
  };
};

module.exports = {
  createPost,
  updatePost,
  getPosts,
  likePost,
  addComment,
  updateComment,
  getComments,
  getActivity,
  getPostsByUserId,
};