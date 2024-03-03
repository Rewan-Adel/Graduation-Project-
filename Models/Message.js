const  mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    message: {
        text: {
            type: String,
            required: true
        },
        media: {
            type: [String],
            required: false
        }
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);