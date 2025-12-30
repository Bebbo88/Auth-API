const asyncHandler = require("express-async-handler");
const Report = require("../models/report.model");
const Joi = require("joi");

const reportSchema = Joi.object({
    targetId: Joi.string().required(),
    targetModel: Joi.string().valid('Post', 'Comment').required(),
    reason: Joi.string().min(3).required()
});

const createReport = asyncHandler(async (req, res) => {
    const { error } = reportSchema.validate(req.body);
    if (error) {
        res.status(400);
        throw new Error(error.details[0].message);
    }

    const { targetId, targetModel, reason } = req.body;

    const report = await Report.create({
        user: req.currentUser._id,
        targetId,
        targetModel,
        reason,
        status: 'PENDING'
    });

    res.status(201).json(report);
});

module.exports = {
    createReport
};
