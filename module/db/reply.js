var mongoose = require('./connection');
var repSchema = new mongoose.Schema({
    reply:String,
    author:String,
    time:String,
})

var Reply = mongoose.model('reply',repSchema);

module.exports = Reply;