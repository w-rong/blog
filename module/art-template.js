var artTem = require('art-template');
var artTemRenderEngine = require('express-art-template');

// 设置模板文件目录
artTem.defaults.root = './views';

// 修改模板文件的后缀名
artTem.defaults.extname = '.html';

function artTemEngine(app) {
    // 设置模板渲染引擎
    app.engine('html',artTemRenderEngine);
    // 辅助在调用render函数是不再添加 .html后缀
    app.set('view engine','html');
}
module.exports = artTemEngine;
