require("dotenv").config();
const mongoose = require("mongoose");
const Post = require("./models/post.model copy");
const Comment = require("./models/comment.model");

const runVerification = async () => {
    console.log("Starting Verification...");

    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("DB Connected.");

        // 1. Create Test Data
        console.log("Creating Test Posts...");
        const activePost = await Post.create({
            user: new mongoose.Types.ObjectId(), // Fake ID
            category: 'DISCUSSION',
            content: 'TEST_ACTIVE_POST_' + Date.now(),
            status: 'ACTIVE'
        });

        const hiddenPost = await Post.create({
            user: new mongoose.Types.ObjectId(), // Fake ID
            category: 'DISCUSSION',
            content: 'TEST_HIDDEN_POST_' + Date.now(),
            status: 'HIDDEN'
        });

        // 2. Test User Query (Logic copied from community.controller.js)
        console.log("Testing User Query (Should exclude HIDDEN)...");
        const userViewPosts = await Post.find({
            _id: { $in: [activePost._id, hiddenPost._id] },
            status: { $nin: ['HIDDEN', 'DELETED'] }
        });

        if (userViewPosts.length === 1 && userViewPosts[0]._id.toString() === activePost._id.toString()) {
            console.log("✅ User Query Logic Passed: Only ACTIVE post returned.");
        } else {
            console.error("❌ User Query Logic Failed:", userViewPosts);
        }

        // 3. Test Manager Query (Logic copied from community.manager.controller.js)
        console.log("Testing Manager Query (Should include ALL)...");
        const managerViewPosts = await Post.find({
            _id: { $in: [activePost._id, hiddenPost._id] }
        });

        if (managerViewPosts.length === 2) {
            console.log("✅ Manager Query Logic Passed: All posts returned.");
        } else {
            console.error("❌ Manager Query Logic Failed:", managerViewPosts.length);
        }

        // 4. Test Model Fields
        console.log("Testing Model Fields...");
        if (activePost.isPinned === false) {
            console.log("✅ Default isPinned Passed.");
        } else {
            console.error("❌ Default isPinned Failed.");
        }

        // Cleanup
        console.log("Cleaning up...");
        await Post.deleteOne({ _id: activePost._id });
        await Post.deleteOne({ _id: hiddenPost._id });
        console.log("Cleanup Done.");

    } catch (error) {
        console.error("Verification Error:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected.");
    }
};

runVerification();
