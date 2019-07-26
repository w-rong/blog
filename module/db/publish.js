var mongoose = require('./connection');
var pubSchema = new mongoose.Schema({
    label:Array,
    content:String,
    title:String,
    author:String,
    time:String,
    count:Number,
    reply:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'reply'
    }]
})

var Publish = mongoose.model('publish',pubSchema);

module.exports = Publish;