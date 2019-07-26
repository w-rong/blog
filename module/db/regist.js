// 创建表
var mongoose = require('./connection');

var regSchema = new mongoose.Schema({
    username:String,
    mailbox:String,
    password:String,
    repassword:String,
    age:Number,
    sex:String,
    major:String,
    hobby:Array
});

var Regist = mongoose.model('regist',regSchema);

module.exports = Regist;