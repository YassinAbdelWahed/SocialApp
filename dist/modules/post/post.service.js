"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postService = exports.PostService = exports.postAvailability = void 0;
const success_response_1 = require("../../utils/response/success.response");
const repository_1 = require("../../DB/repository");
const model_1 = require("../../DB/model");
const post_model_1 = require("../../DB/model/post.model");
const error_response_1 = require("../../utils/response/error.response");
const uuid_1 = require("uuid");
const s3_config_1 = require("../../utils/multer/s3.config");
const mongoose_1 = require("mongoose");
const cloud_multer_1 = require("../../utils/multer/cloud.multer");
const comment_repository_1 = require("../../DB/repository/comment.repository");
const model_2 = require("../../DB/model");
const gateway_1 = require("../gateway");
const graphql_1 = require("graphql");
const postAvailability = (user) => {
    return [
        { availability: post_model_1.AvailabilityEnum.public },
        { availability: post_model_1.AvailabilityEnum.onlyMe, createdBy: user?._id },
        {
            availability: post_model_1.AvailabilityEnum.friends,
            createdBy: { $in: [...(user.friends || []), user?._id] },
        },
        {
            availability: { $ne: post_model_1.AvailabilityEnum.onlyMe },
            tags: { $in: user?._id }
        },
    ];
};
exports.postAvailability = postAvailability;
class PostService {
    userModel = new repository_1.UserRepository(model_1.UserModel);
    postModel = new repository_1.PostRepository(post_model_1.PostModel);
    commentModel = new comment_repository_1.CommentRepository(model_2.CommentModel);
    constructor() { }
    createPost = async (req, res) => {
        if (req.body.tags?.length && (await this.userModel.find({ filter: { _id: { $in: req.body.tags } } })).length !== req.body.tags.length) {
            throw new error_response_1.NotFoundException("some of the mentioned users do not exist");
        }
        let attachments = [];
        let assetsFolderId = (0, uuid_1.v4)();
        if (req.files?.length) {
            attachments = await (0, s3_config_1.uploadFiles)({
                files: req.files,
                path: `users/${req.user?._id}/post/${assetsFolderId}`,
            });
        }
        const [post] = (await this.postModel.create({
            data: [{
                    ...req.body,
                    attachments,
                    assetsFolderId,
                    createdBy: req.user?._id,
                }]
        })) || [];
        if (!post) {
            if (attachments.length) {
                await (0, s3_config_1.deleteFiles)({ urls: attachments });
            }
            throw new error_response_1.BadRequestException("fail to create this post");
        }
        return (0, success_response_1.successResponse)({ res, statusCode: 201 });
    };
    updatePost = async (req, res) => {
        const { postId } = req.params;
        const post = await this.postModel.findOne({
            filter: {
                _id: postId,
                createdBy: req.user?._id,
            },
        });
        if (!post) {
            throw new error_response_1.NotFoundException("fail to find matching  result");
        }
        if (req.body.tags?.length && (await this.userModel.find({ filter: { _id: { $in: req.body.tags, $ne: req.user?._id } }, })).length !== req.body.tags.length) {
            throw new error_response_1.NotFoundException("some of mentioned account are not exists");
        }
        let attachments = [];
        if (req.files?.length) {
            attachments = await (0, s3_config_1.uploadFiles)({
                storageApproach: cloud_multer_1.StorageEnum.memory,
                files: req.files,
                path: `users/${req.user?._id}/post/${post.assetsFolderId}`,
            });
        }
        const updatedPost = await this.postModel.updateOne({
            filter: {
                _id: post._id
            },
            update: [{
                    $set: {
                        content: req.body.content,
                        allowComments: req.body.allowComments || post.allowComments,
                        availability: req.body.availability || post.availability,
                        attachments: {
                            $setUnion: [
                                {
                                    $setDifference: [
                                        "$attachments",
                                        req.body.removedAttachments || [],
                                    ],
                                },
                                attachments,
                            ]
                        },
                        tags: {
                            $setUnion: [
                                {
                                    $setDifference: [
                                        "$tags",
                                        (req.body.removedTags || []).map((tag) => {
                                            return mongoose_1.Types.ObjectId.createFromHexString(tag);
                                        }),
                                    ],
                                },
                                (req.body.tags || []).map((tag) => {
                                    return mongoose_1.Types.ObjectId.createFromHexString(tag);
                                }),
                            ],
                        },
                    },
                }],
        });
        if (!updatedPost.matchedCount) {
            if (attachments.length) {
                await (0, s3_config_1.deleteFiles)({ urls: attachments });
            }
            throw new error_response_1.BadRequestException("fail not generate this post");
        }
        else {
            if (req.body.removedAttachments?.length) {
                await (0, s3_config_1.deleteFiles)({ urls: req.body.removedAttachments });
            }
        }
        return (0, success_response_1.successResponse)({ res });
    };
    likePost = async (req, res) => {
        const { postId } = req.params;
        const { action } = req.query;
        let update = {
            $addToSet: { likes: req.user?._id }
        };
        if (action === post_model_1.LikeActionEnum.unlike) {
            update = { $pull: { likes: req.user?._id } };
        }
        const post = await this.postModel.findOneAndUpdate({
            filter: {
                _id: postId,
                $or: (0, exports.postAvailability)(req.user),
            },
            update,
        });
        if (!post) {
            throw new error_response_1.NotFoundException("invalid postId or post not exist");
        }
        if (action !== post_model_1.LikeActionEnum.unlike) {
            (0, gateway_1.getIo)().to(gateway_1.connectedSockets.get(post.createdBy.toString())).emit("likePost", { postId, userId: req.user?._id });
        }
        return (0, success_response_1.successResponse)({ res });
    };
    postList = async (req, res) => {
        let { page, size } = req.query;
        const posts = await this.postModel.paginate({
            filter: {
                $or: (0, exports.postAvailability)(req.user),
            },
            options: {
                populate: [
                    {
                        path: "comments",
                        match: {
                            commentId: { $exists: false },
                            freezedAt: { $exists: false },
                        },
                        populate: [{
                                path: "reply",
                                match: {
                                    commentId: { $exists: false },
                                    freezedAt: { $exists: false },
                                },
                                populate: [{
                                        path: "reply",
                                        match: {
                                            commentId: { $exists: false },
                                            freezedAt: { $exists: false },
                                        }
                                    }]
                            }]
                    }
                ]
            },
            page,
            size,
        });
        return (0, success_response_1.successResponse)({ res, data: { posts } });
    };
    allPosts = async ({ page, size }, authUser) => {
        const posts = await this.postModel.paginate({
            filter: {
                $or: (0, exports.postAvailability)(authUser),
            },
            options: {
                populate: [
                    {
                        path: "comments",
                        match: {
                            commentId: { $exists: false },
                            freezedAt: { $exists: false },
                        },
                        populate: [{
                                path: "reply",
                                match: {
                                    commentId: { $exists: false },
                                    freezedAt: { $exists: false },
                                },
                                populate: [{
                                        path: "reply",
                                        match: {
                                            commentId: { $exists: false },
                                            freezedAt: { $exists: false },
                                        }
                                    }]
                            }]
                    }
                ]
            },
            page,
            size,
        });
        return posts.result;
    };
    likeGraphPost = async ({ postId, action }, authUser) => {
        let update = {
            $addToSet: { likes: authUser._id }
        };
        if (action === post_model_1.LikeActionEnum.unlike) {
            update = { $pull: { likes: authUser._id } };
        }
        const post = await this.postModel.findOneAndUpdate({
            filter: {
                _id: postId,
                $or: (0, exports.postAvailability)(authUser),
            },
            update,
        });
        if (!post) {
            throw new graphql_1.GraphQLError("invalid postId or post not exist", { extensions: { statusCode: 404 } });
        }
        if (action !== post_model_1.LikeActionEnum.unlike) {
            (0, gateway_1.getIo)().to(gateway_1.connectedSockets.get(post.createdBy.toString())).emit("likePost", { postId, userId: authUser._id });
        }
        return post;
    };
}
exports.PostService = PostService;
;
exports.postService = new PostService();
