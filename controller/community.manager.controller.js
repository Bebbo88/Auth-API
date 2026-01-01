const asyncHandler = require("express-async-handler");
const Post = require("../models/post.model");
const Comment = require("../models/comment.model");
const Report = require("../models/report.model");
const Activity = require("../models/activity.model");
const User = require("../models/user.model");

// Helper to record activity (optional scope for admin)
const recordAdminActivity = async (userId, type, targetId, description) => {
  // You might want a separate AdminActivity model, but using existing generic Activity for now if appropriate
  // Or just console log if no requirement to track Admin actions yet.
  // Requirement says: Global Activity Feed GET /admin/community/activity (Manager Scope)
  // It doesn't explicitly ask to Log Admin actions, but it's good practice.
};

// ======= Get All Posts (Admin) =======
const getAllPosts = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.userId) filter.user = req.query.userId;

  // Date Range
  if (req.query.startDate && req.query.endDate) {
    filter.createdAt = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate),
    };
  }

  const totalCount = await Post.countDocuments(filter);
  const lastPage = Math.ceil(totalCount / limit);

  const posts = await Post.find(filter)
    .populate("user", "_id firstName lastName email avatar")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

  res.json({
    totalCount,
    lastPage,
    count: posts.length,
    page,
    limit,
    data: posts,
  });
});

// ======= Hide Post =======
const hidePost = asyncHandler(async (req, res) => {
  const post = await Post.findByIdAndUpdate(
    req.params.id,
    { status: "HIDDEN" },
    { new: true }
  );
  if (!post) {
    res.status(404);
    throw new Error("Post not found");
  }
  res.json(post);
});

// ======= Activate/Restore Post =======
const activatePost = asyncHandler(async (req, res) => {
  const post = await Post.findByIdAndUpdate(
    req.params.id,
    { status: "ACTIVE" },
    { new: true }
  );
  if (!post) {
    res.status(404);
    throw new Error("Post not found");
  }
  res.json(post);
});

// ======= Delete Post (Soft Delete) =======
const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findByIdAndUpdate(
    req.params.id,
    { status: "DELETED" },
    { new: true }
  );
  if (!post) {
    res.status(404);
    throw new Error("Post not found");
  }
  res.json(post);
});

// ======= Hard Delete All Soft-Deleted Posts =======
const deleteAllDeletedPosts = asyncHandler(async (req, res) => {
  const result = await Post.deleteMany({ status: "DELETED" });
  res.json({
    message: `تم حذف ${result.deletedCount} منشور نهائياً`,
    deletedCount: result.deletedCount,
  });
});

// ======= Pin/Unpin Post =======
const togglePinPost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    res.status(404);
    throw new Error("Post not found");
  }
  post.isPinned = !post.isPinned;
  await post.save();
  res.json(post);
});

// ======= Get Comments (Admin) =======
const getComments = asyncHandler(async (req, res) => {
  const comments = await Comment.find({ post: req.params.id })
    .populate("user", "_id firstName lastName email avatar")
    .sort({ createdAt: 1 });
  res.json(comments);
});

// ======= Hide Comment =======
const hideComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findByIdAndUpdate(
    req.params.commentId,
    { status: "HIDDEN" },
    { new: true }
  );
  if (!comment) {
    res.status(404);
    throw new Error("Comment not found");
  }
  res.json(comment);
});

// ======= Activate/Restore Comment =======
const activateComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findByIdAndUpdate(
    req.params.commentId,
    { status: "ACTIVE" },
    { new: true }
  );
  if (!comment) {
    res.status(404);
    throw new Error("Comment not found");
  }
  res.json(comment);
});

// ======= Delete Comment (Soft Delete) =======
const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findByIdAndUpdate(
    req.params.commentId,
    { status: "DELETED" },
    { new: true }
  );
  if (!comment) {
    res.status(404);
    throw new Error("Comment not found");
  }
  res.json(comment);
});

// ======= Get Reports =======
const getReports = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.targetModel) filter.targetModel = req.query.targetModel;

  // Date Range
  if (req.query.startDate && req.query.endDate) {
    filter.createdAt = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate),
    };
  }

  const reports = await Report.find(filter)
    .populate("user", "firstName lastName email")
    .populate("targetId")
    .sort({ createdAt: -1 });

  res.json(reports);
});

// ======= Resolve Report =======
const resolveReport = asyncHandler(async (req, res) => {
  const report = await Report.findByIdAndUpdate(
    req.params.id,
    { status: "RESOLVED" },
    { new: true }
  );
  if (!report) {
    res.status(404);
    throw new Error("Report not found");
  }
  res.json(report);
});

// ======= Community Stats =======
const getStats = asyncHandler(async (req, res) => {
  const totalPosts = await Post.countDocuments({});
  const totalComments = await Comment.countDocuments({});
  const reportedPosts = await Report.countDocuments({ targetModel: "Post" });
  const reportedComments = await Report.countDocuments({
    targetModel: "Comment",
  });

  // Active Users (simplified: users who posted or commented is intricate to calc efficiently without aggregation)
  // Using a simpler metric: Total Users in DB or distinct users in Posts
  const distinctPostUsers = await Post.distinct("user");
  // const activeUsers = distinctPostUsers.length;

  // Fetch Total Users
  const totalUsers = await User.countDocuments({});

  // Fetch Active Stations
  const activeStations = await require("../models/StationModel").countDocuments(
    { status: "active" }
  );

  // Ensure we return the property names expected by the frontend:
  // frontend expects: totalUsers, activeStations, totalPosts, pendingReports (maybe?)

  // Check frontend code again:
  // totalUsers: stats.totalUsers
  // activeStations: stats.activeStations
  // totalPosts: stats.totalPosts
  // pendingReports: stats.pendingReports

  const pendingReports = await Report.countDocuments({ status: "PENDING" }); // Assuming 'PENDING' is the status

  res.json({
    totalPosts,
    totalComments,
    reportedPosts,
    reportedComments,
    activeUsers: distinctPostUsers.length,
    totalUsers,
    activeStations,
    pendingReports,
  });
});

// ======= Top Posts =======
const getTopPosts = asyncHandler(async (req, res) => {
  // Top 10 by likes + comments
  const posts = await Post.aggregate([
    { $match: { status: { $ne: "DELETED" } } },
    {
      $addFields: {
        score: { $add: ["$likesCount", "$commentsCount"] },
      },
    },
    { $sort: { score: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        "user.password": 0,
        "user.token": 0,
      },
    },
  ]);
  res.json(posts);
});

// ======= Global Activity =======
const getGlobalActivity = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.userId) filter.user = req.query.userId;
  if (req.query.type) filter.type = req.query.type;

  if (req.query.startDate && req.query.endDate) {
    filter.createdAt = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate),
    };
  }

  const activities = await Activity.find(filter)
    .populate("user", "firstName lastName email avatar")
    .sort({ createdAt: -1 })
    .limit(50);

  res.json(activities);
});

module.exports = {
  getAllPosts,
  hidePost,
  activatePost,
  deletePost,
  deleteAllDeletedPosts,
  togglePinPost,
  getComments,
  activateComment,
  hideComment,
  deleteComment,
  getReports,
  resolveReport,
  getStats,
  getTopPosts,
  getGlobalActivity,
};
