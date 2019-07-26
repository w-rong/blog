var express = require('express');

var bodyParser = require('body-parser');
var fs = require('fs')

var app = express();
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
// 导入表
var Regist = require('./module/db/regist');
var Publish = require('./module/db/publish');
var Reply = require('./module/db/reply');
// 导入模板
var artTemplate = require('./module/art-template');
artTemplate(app);
var tools = require('./module/tools');
// 会话闪存模块
var flash = require('connect-flash');
app.use(flash());
// md5加密
var md5 = require('md5');
// 会话模块
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
app.use(session({
    secret: 'mylogin',
    resave: true,
    saveUninitialized: true,
    rolling: true,
    cookie: {
        // 缓存一小时
        maxAge: 1000 * 60 * 60,
    },
    store: new MongoStore({
        // 连接数据库
        url: 'mongodb://127.0.0.1/blog'
    }),
}));
// 首页
app.get('/', (req, res) => {
    var condition = {};
    if (req.query.username) {
        condition.username = req.query.username
    }
    var page = (req.query.page || 1) * 1;
    var show_count = 5;

    Publish.find(condition)
        .sort({ time: -1 })
        .skip((page - 1) * show_count) //调过去几条 
        .limit(show_count) //查询几条
        .exec((err, msg) => {
            console.log(msg)
            if (err) {
                console.log('未找到')
            } else {
                var msgs = JSON.parse(JSON.stringify(msg))
                Publish.countDocuments((err, count) => {
                    // 所有的页数
                    var allPages = Math.ceil(count / show_count);
                    res.render('index', {
                        msgs,
                        page,
                        allPages,
                        show_count,
                        data: req.session.user
                    });
                });
            }
        })
})
// 登录
app.get('/login', (req, res) => {
    var error = req.flash('error').toString();
    res.render('login', { error });
})
app.post('/login', (req, res) => {
    Regist.findOne({ username: req.body.username }, (err, data) => {
        if (!data) {
            req.flash('error', '用户名不存在');
            res.redirect('/login');
        } else {
            if (md5(req.body.password) == data.password) {
                req.session.user = data;
                res.redirect('/');
            } else {
                req.flash('error', '密码错误');
                res.redirect('/login');
            }
        }
    })
})
// 注册
app.get('/regist', (req, res) => {
    // 从flash暂存器中取出error的值
    var error = req.flash('error').toString();
    res.render('regist', { error });
})
app.post('/regist', (req, res) => {
    Regist.findOne({ username: req.body.username }, (err, data) => {
        if (data) {
            req.flash('error', '用户名已注册');
            res.redirect('/regist');
        } else {
            // 对密码和确认密码进行加密 并判断两次输入的密码是否一致
            if (md5(req.body.password) != md5(req.body.repassword)) {
                req.flash('error', '密码不一致');
                res.redirect('/regist');
                // console.log('密码不一致')
            } else {
                req.body.password = md5(req.body.password);
                req.body.repassword = md5(req.body.repassword);
                var reg = new Regist(req.body);
                console.log(reg)
                reg.save(err => {
                    res.redirect('/login')
                })
            }
        }
    })
})
// 退出登录
app.get('/logout', (req, res) => {
    req.session.user = null;
    res.redirect('/');
})
app.use(function (req, res, next) {
    app.locals.data = req.session.user;
    next();
})
// 发布
app.get('/publish', (req, res) => {
    // res.render('publish')
    var condition = {};
    if (req.body.username) {
        condition.username = req.body.username
    }
    Publish.find(condition, (err, msg) => {
        if (err) {
            console.log('未找到')
        } else {
            var msgs = JSON.parse(JSON.stringify(msg))
            // console.log(msgs + '00----------')
            res.render('publish', {
                msgs
            });
        }
    })
})
app.post('/publish', (req, res) => {
    var editContent = new Publish({
        time: tools.dateFormat(new Date()),
        author: req.session.user.username,
        title: req.body.title,
        label: req.body.label,
        content: req.body.content,
        count: 0,
        reply: []
    })
    editContent.save((err) => {
        if (err) {
            console.log('保存失败')
        } else {
            console.log('保存成功');
            res.redirect('/')
        }
    })
})
// // 未登录 发布界面返回登录界面
// app.get('/no/publish',(req,res)=>{
//     res.render('login')
// })
// 跳转到编辑界面
app.get('/edit/:_id', (req, res) => {
    console.log(req.params._id)

    Publish
        .find({ _id: req.params._id })
        .populate("reply")
        .exec((err, msgs) => {
            // console.log(msgs[0].count+'678=======');
            // msgs[0].count = msgs[0].count+1;
            console.log('--------学习---------');
            // console.log(msgs)
            Publish.updateOne({ _id: req.params._id }, { count: msgs[0].count + 1 }, (err, data) => {
            })
            res.render('edit', {
                msgs,
                data: req.session.user,
            });
        });
});
// 评价
app.post('/reply', (req, res) => {
    var reply = new Reply({
        reply: req.body.content,
        author: req.session.user.username,
        time: tools.dateFormat(new Date()),
    })
    // console.log(req.body._id);
    // console.log(reply);
    reply.save(err => {
        if (err) {
            console.log(err);
            console.log('保存失败');
        } else {
            console.log('保存成功');
            Publish.findOne({ _id: tools.idFormat(req.body._id) }, (err, data) => {
                // console.log('------===--------')
                // console.log(data);
                data.reply.push(reply._id);
                data.save(err => {
                    if (err) {
                        console.log('保存失败');
                    } else {
                        console.log('保存成功');
                        res.redirect('/edit/' + tools.idFormat(req.body._id))
                    }
                })
            })
        }
    })
})
// 删除
app.get('/delete/:_id', (req, res) => {
    console.log(req.params._id)
    Publish.findByIdAndDelete({ _id: tools.idFormat(req.params._id) }, err => {
        if (err) {
            console.log(err)
            res.send('删除失败');
        } else {
            res.redirect('/');
        }
    });
});
// 编辑
app.get('/editMsg/:_id', (req, res) => {
    Publish.findOne({ _id: tools.idFormat(req.params._id) }, (err, data) => {
        if (err) {
            console.log(err)
            res.send('编辑失败');
        } else {
            var msgs = JSON.parse(JSON.stringify(data))
            res.render('editMsg', { msgs });
        }
    });
});
// 编辑切换
app.post('/editMsgs/:_id', (req, res) => {
    Publish.updateOne({ _id: req.params._id }, {
        title: req.body.title,
        label: req.body.label,
        content: req.body.content
    }, err => {
        res.redirect('/')
    })
})
// 点击作者切换
// 点击标签切换
app.get('/label/:_id', (req, res) => {
    var page = (req.query.page || 1) * 1;
    var show_count = 5;

    Publish
        .find({
            $or: [
                { author: req.params._id },
                { label: req.params._id }]
        })
        .sort({ time: -1 })
        .skip((page - 1) * show_count) //调过去几条 
        .limit(show_count) //查询几条
        .exec((err, data) => {
            // console.log(data);
            var msgs = JSON.parse(JSON.stringify(data))
            // console.log(msgs)
            Publish.countDocuments((err, count) => {
                // 所有的页数
                var allPages = Math.ceil(count / show_count);
                res.render('index', {
                    msgs,
                    page,
                    allPages,
                    show_count,
                    data: req.session.user
                });
            })
        })
})
// 搜索
app.post('/search', (req, res) => {
    // Publish.find({
    //     // 多条件模糊查询
    //     $or: [
    //         { author: { $regex: req.body.search, $options: '$i' } },
    //         { label: { $regex: req.body.search, $options: '$i' } },
    //         { title: { $regex: req.body.search, $options: '$i' } }
    //     ]
    // }).exec((err, data) => {
    //     var msgs = JSON.parse(JSON.stringify(data))
    //     res.render('searchResult', { msgs });
    // });
    var page = (req.query.page || 1) * 1;
    var show_count = 5;
    Publish
        .find({
            // 多条件模糊查询
            $or: [
                { author: { $regex: req.body.search, $options: '$i' } },
                { label: { $regex: req.body.search, $options: '$i' } },
                { title: { $regex: req.body.search, $options: '$i' } },
                { content: { $regex: req.body.search, $options: '$i' } }
            ]
        })
        .sort({ time: -1 })
        .skip((page - 1) * show_count) //调过去几条 
        .limit(show_count) //查询几条
        .exec((err, data) => {
            // console.log(data);
            var msgs = JSON.parse(JSON.stringify(data))
            // console.log(msgs)
            Publish.countDocuments((err, count) => {
                // 所有的页数
                var allPages = Math.ceil(count / show_count);
                res.render('searchResult', {
                    msgs,
                    page,
                    allPages,
                    show_count,
                    data: req.session.user
                });
            });
        });
});
// 标签
app.get('/label', (req, res) => {
    // res.render('label')
    var label = [];
    Publish
        .find()
        .exec((err, msgs) => {
            console.log('--------学习---------');
            for (var i = 0; i < msgs.length; i++) {
                var msg = msgs[i];
                // console.log(msg.label)
                for (var j = 0; j < msg.label.length; j++) {
                    label.push(msgs[i].label[j]);
                }
            }
            // console.log(label)
            var labels = tools.arrFormat(label);
            // console.log(labels)
            res.render('label', {
                msgs,
                labels,
                data: req.session.user
            });
        });
});
// 存档
app.get('/file', (req, res) => {
    // res.render('file');
    var condition = {};
    if (req.body.username) {
        condition.username = req.body.username
    }
    var page = (req.query.page || 1) * 1;
    var show_count = 5;
    Publish.find(condition)
        .sort({ time: -1 })
        .skip((page - 1) * show_count) //调过去几条 
        // .limit(show_count) //查询几条
        .exec((err, msg) => {
            console.log(msg)
            if (err) {
                console.log('未找到')
            } else {
                var msgs = JSON.parse(JSON.stringify(msg));
                // console.log(msgs.time)
                var Year = [];
                for (var i = 0; i < msgs.length; i++) {
                    msgs[i].index = i;
                    var years = msgs[i].time.slice(0, 5);
                    Year.push(years);
                    var num = years.indexOf(year);
                    // console.log(num)
                }
                var year = tools.arrFormat(Year);
                console.log(typeof year);
                console.log(msgs + '56789--------------')
                Publish.countDocuments((err, count) => {
                    // 所有的页数
                    var allPages = Math.ceil(count / show_count);
                    res.render('file', {
                        msgs,
                        page,
                        allPages,
                        show_count,
                        data: req.session.user,
                        year
                    });
                });
            }
        })
})






















app.listen(3000, () => {
    console.log('node running');
})