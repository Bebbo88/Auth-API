const { validationResult } = require("express-validator");
const Course = require("../models/courses.model");
const { SUCCESS, FAIL, ERROR } = require("../utils/httpStatusText");
const asyncWrapper = require("../middlewares/asyncWrapper");
const appErrors = require("../utils/appErrors");

const getAllCourses = asyncWrapper(async (req, res) => {
  const limit = req.query.limit || 10;
  const page = req.query.page || 1;
  const skip = (page - 1) * limit;
  const courses = await Course.find({}, { __v: false }).limit(limit).skip(skip);
  res.json({ status: SUCCESS, data: { courses } });
});

const getCourseById = asyncWrapper(async (req, res, next) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) {
    const err = appErrors.create("course not found", 404, FAIL);
    return next(err);
  }
  return res.json({ status: SUCCESS, data: { course } });
});

const addCourse = asyncWrapper(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = appErrors.create(errors.array(), 400, FAIL);
    return next(err);
  }
  const newCourse = new Course(req.body);
  await newCourse.save();
  res.status(201).json({ status: SUCCESS, data: { course: newCourse } });
});

const updateCourse = asyncWrapper(async (req, res) => {
  let updatedCourse = await Course.updateOne(
    { _id: req.params.courseId },
    {
      $set: { ...req.body },
    }
  );

  res.status(200).json({ status: SUCCESS, data: { course: updatedCourse } });
});

const deleteCourse = asyncWrapper(async (req, res) => {
  await Course.deleteOne({ _id: req.params.courseId });
  res.status(200).json({ status: SUCCESS, data: null });
});

module.exports = {
  getAllCourses,
  getCourseById,
  addCourse,
  updateCourse,
  deleteCourse,
};
