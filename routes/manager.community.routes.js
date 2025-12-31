const express = require("express");
const {
  getAllPosts,
  hidePost,
  deletePost,
  togglePinPost,
  getComments,
  hideComment,
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
// router.delete("/posts/deleted", deleteAllDeletedPosts);
router.delete("/posts/:id", deletePost);
router.patch("/posts/:id/pin", togglePinPost);

// Comments Management
router.get("/posts/:id/comments", getComments);
router.patch("/comments/:commentId/hide", hideComment);

// Reports Management
router.get("/reports", getReports);
router.patch("/reports/:id/resolve", resolveReport);

// Analytics & Activity
router.get("/stats", getStats);
router.get("/top-posts", getTopPosts);
router.get("/activity", getGlobalActivity);

module.exports = router;
