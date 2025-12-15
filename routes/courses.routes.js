const express = require("express");
const {
  getAllCourses,
  getCourseById,
  addCourse,
  updateCourse,
  deleteCourse,
} = require("../controller/courses.controller");
const { validationShcema } = require("../middlewares/validationSchema");
const VerifyToken = require("../middlewares/verifyToken");
const userRoles = require("../utils/userRoles");
const allowedTo = require("../middlewares/allowedTo");

const router = express.Router();

router.route("/").get(getAllCourses).post(VerifyToken,allowedTo(userRoles.ADMIN,userRoles.MANAGER),validationShcema, addCourse);
router
  .route("/:courseId")
  .get(getCourseById)
  .patch(VerifyToken,allowedTo(userRoles.ADMIN,userRoles.MANAGER),updateCourse)
  .delete(VerifyToken,allowedTo(userRoles.MANAGER,userRoles.ADMIN),deleteCourse);

module.exports = router;
