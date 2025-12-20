const mongoose = require('mongoose');

const activitySchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true }, // e.g., 'POST_CREATED', 'COMMENT_ADDED', 'LIKED_POST'
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    targetModel: { type: String, required: true }, // 'Post', 'Comment'
    description: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
