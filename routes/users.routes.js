const express = require("express");
const VerifyToken = require("../middlewares/verifyToken");
const multer  = require('multer')
const {
  getAllUsers,
  register,
    login
} = require("../controller/users.controller");
const appErrors = require("../utils/appErrors");
const { FAIL } = require("../utils/httpStatusText");
const router = express.Router();
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads')
  },
  filename: function (req, file, cb) {
    const ext = file.mimetype.split("/")[1]
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + ext)
  }
})
const fileFilter=(req, file, cb) => {
  const imgEXT = file.mimetype.split("/")[0]
  if (imgEXT === 'image') {
    cb(null, true)
  } else {
    cb(appErrors.create("only images are allowed", 400, FAIL), false)
  }
}
const upload = multer({ storage, fileFilter  })

router.route("/").get(VerifyToken,getAllUsers)
router.route("/register").post(upload.single("avatar"),register)
router.route("/login").post(login)



// router
//   .route("/:userId")
//   .get(getUserById)
//   .patch(updateUser)
//   .delete(deleteUser);

module.exports = router;
