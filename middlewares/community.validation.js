const Joi = require('joi');

const createPostSchema = Joi.object({
    content: Joi.string().allow('').optional(),
    mediaType: Joi.string().valid('IMAGE', 'VIDEO', 'NONE').optional(),
    category: Joi.string()
        .valid('DISCUSSION', 'CAR_BOOKING', 'OPINION')
        .required(),
});

const createCommentSchema = Joi.object({
    content: Joi.string().required(),
});

module.exports = { createPostSchema, createCommentSchema };
