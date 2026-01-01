const express = require("express");
const {
  getAllPosts,
  hidePost,
  activatePost,
  deletePost,
  deleteAllDeletedPosts,
  togglePinPost,
  getComments,
  hideComment,
  activateComment,
  deleteComment,
  getReports,
  resolveReport,
  getStats,
  getTopPosts,
  getGlobalActivity,
} = require("../controller/community.manager.controller");

const VerifyToken = require("../middlewares/verifyToken");
const allowedTo = require("../middlewares/allowedTo");

const router = express.Router();

// Middleware for all admin routes
router.use(VerifyToken, allowedTo("MANAGER"));

// Posts Management
router.get("/posts", getAllPosts);
router.patch("/posts/:id/hide", hidePost);
router.patch("/posts/:id/activate", activatePost);
router.delete("/posts/deleted", deleteAllDeletedPosts);
router.delete("/posts/:id", deletePost);
router.patch("/posts/:id/pin", togglePinPost);

// Comments Management
router.get("/posts/:id/comments", getComments);
router.patch("/comments/:commentId/hide", hideComment);
router.patch("/comments/:commentId/activate", activateComment);
router.delete("/comments/:commentId", deleteComment);

// Reports Management
router.get("/reports", getReports);
router.patch("/reports/:id/resolve", resolveReport);

// Analytics & Activity
router.get("/stats", getStats);
router.get("/top-posts", getTopPosts);
router.get("/activity", getGlobalActivity);

module.exports = router;
