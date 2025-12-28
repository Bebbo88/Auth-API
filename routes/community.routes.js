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
  getComments,
  getActivity,
  getPostsByUserId,
  getPostLikers,
} = require("../controller/community.controller");
const VerifyToken = require("../middlewares/verifyToken");
const multer = require("multer");
const appErrors = require("../utils/appErrors");
const { FAIL } = require("../utils/httpStatusText");

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    const ext = file.mimetype.split("/")[1];
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + "." + ext);
  },
});
const fileFilter = (req, file, cb) => {
  const imgEXT = file.mimetype.split("/")[0];
  if (imgEXT === "image" || imgEXT === "video") {
    cb(null, true);
  } else {
    cb(appErrors.create("only images are allowed", 400, FAIL), false);
  }
};
const upload = multer({ storage, fileFilter });

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
