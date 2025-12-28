const express = require("express");
const {
  createPost,
  updatePost,
  getPosts,
  likePost,
  addComment,
  updateComment,
  getComments,
  getActivity,
  getPostsByUserId,
  getPostLikers,
} = require("../controller/community.controller");
const VerifyToken = require("../middlewares/verifyToken");
const upload = require("../middlewares/upload");

// Posts
router.post("/posts", VerifyToken, upload.single("media"), createPost);
router.put("/posts/:id", VerifyToken, upload.single("media"), updatePost);
router.get("/posts", VerifyToken, getPosts);
router.get("/users/:userId/posts", VerifyToken, getPostsByUserId);
router.post("/posts/:id/like", VerifyToken, likePost);
router.get("/posts/:id/likes", VerifyToken, getPostLikers);

// Comments
router.post("/posts/:id/comments", VerifyToken, addComment);
router.put("/comments/:commentId", VerifyToken, updateComment);
router.get("/posts/:id/comments", VerifyToken, getComments);

// User activity
router.get("/activity", VerifyToken, getActivity);

module.exports = router;
