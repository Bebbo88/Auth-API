const mongoose = require('mongoose');

const postSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: {
        type: String,
        enum: ['DISCUSSION', 'CAR_BOOKING', 'OPINION'],
        required: true
    },
    content: { type: String }, // Optional if media is present
    media: { type: String }, // Path to file
    mediaType: { type: String, enum: ['IMAGE', 'VIDEO', 'NONE'], default: 'NONE' },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
