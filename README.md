# DingTalk ISV
钉钉套件主动调用**API**, 自带**cache**。

##安装 
`npm install dingtalk-isv`

##ISV套件回调URL处理
express中间件。自动验证回调URL有效性。

构造函数：

```js
var DingIsv = require('dingtalk-isv');
var config = {
  token: 'xxxxxxxxx',
  encodingAESKey: 'xxxxxxxxxxxxxxxxxxx',
  suiteid: 'xxxxxxxxxxxx', //第一次验证没有不用填 
  saveTicket: function(data, callback){//可选，和主动调用API: dingtalk_suite 配合使用。
    //data:{value: ticket字符串,  expires：到期时间，钉钉回调时间戳 + 20分钟}
    //..dosomething
  } 
}

app.post('/dingtalk/isv/receive', DingIsv.SuiteCallBack(config,
  function(message, req, res, next){
    console.log('message', message);
    switch (message.EventType) {
      case 'tmp_auth_code': //企业号临时授权码
        /*企业号临时授权码,需调用接口置换永久授权码
        { AuthCode: '6b4294d637a0387eb36e6785451ff845', EventType: 'tmp_auth_code',SuiteKey: 'suitexpiycccccccccchj',TimeStamp: '1452665779818' }*/

        res.reply();
        break;

      case 'change_auth':
        /*授权变更消息*/
        res.reply();
        break;
      case 'suite_relieve':
        /*解除授权消息
        { AuthCorpId: 'ding5bfeb97afcccb984', EventType: 'suite_relieve',  SuiteKey: 'suitexpiycccccccccchj',TimeStamp: '1452665774168' }*/

        res.reply();
        break;

      case 'suite_ticket':
        /*ticket，间隔20分。如果有config.saveTicket 不会触发。
        { EventType: 'suite_ticket',  SuiteKey: 'suitexpiycccccccccchj',SuiteTicket: 'wrEooJqhQlNcWU327mtr20yzWkPtea9LOm0P8w2M3MDjRPUYY5Tu9fspDhZ8HPXeP5yzKuorHIQ0P9GSU5evAc',TimeStamp: '1452328049089'}*/

        res.reply();
        break;
      default:
       res.json({errcode: 1000, errmsg: 'error, ddtalk unknow EventType'});
    }
}));
```


##ISV套件API操作示例
构造函数：
```js
var DingIsv = require('dingtalk-isv');
var conf = {
    suiteid: 'suitexpiygdnxxxxx',
    secret: 'C1oXyeJUgH_QXEHYJS4-Um-zxfxxxxxxxxxxxxxxxxxx-6np3fXskv5dGs',
    getTicket: function(){
      //从数据库中取出Tikcet，返回的data样式为：{value: 'xxxxxxx', expires:1452735301543}
      //ticket从 dingtalk_suite_callback 处获得
      return new Promise(function(reslove,reject){
            //..dosomething
      })
    },
    
    getToken: function(){
      //从数据库中取出Token，返回的data样式为：{value: 'xxxxxxx', expires:1452735301543}
       return new Promise(function(reslove,reject){
              //..dosomething
        })
    },
    
    saveToken: function(data){
      //存储Token到数据库中，data样式为：{value: 'xxxxxxx', expires:1452735301543//过期时间}
      //..dosomething
    }
  }
var api = new DingIsv.Suite(conf);
```

##方法
#### 获取企业号永久授权码
```js
api.getPermanentCode(tmp_auth_code).then(function(result){ })
```
tmp_auth_code字符串，从DingIsv.SuiteCallBack处获得。
#### 获取企业号Token
```js
//auth_corpid和permanent_code由上面接口获得。
api.getCorpToken(auth_corpid, permanent_code).then(function(result){ })
```
#### 获取企业号信息
```js
api.getAuthInfo(auth_corpid, permanent_code).then(function(result){ })
```
#### 获取企业号应用
```js
api.getAgent(agentid, auth_corpid, permanent_code).then(function(result){ })
```
#### 激活授权套件
```js
api.activateSuite(auth_corpid, permanent_code).then(function(result){ })
```
#### 为授权方的企业单独设置IP白名单
```js
//ip_whitelist为数组格式：["1.2.3.4","5.6.*.*"]
api.setCorpIpwhitelist(auth_corpid, ip_whitelist).then(function(result){ })
```



# dingtalk sso
钉钉免登接口，ISV和企业号通用。

##示例
构造函数：
```js
var DingIsv = require('dingtalk-isv');
var conf = {
    corpid: 'dingxxxxxxxxxxxxxxx',
    SSOSecret:'C1oXyeJUgH_QXEHYJS4-Um-zxfxxxxxxxxxxxxxxxxxx-6np3fXskv5dGs'
  }
//ISV的corpid，SSOSecret在 http://console.d.aliyun.com/#/dingding/env 查看。
var api = new DingIsv.SSO(conf);

```
##方法
### 通过CODE(免登授权码)换取用户身份
```js
api.getSSOUserInfoByCode(code).then(function(result){ })
```
### 生成授权链接
```js
api.generateAuthUrl(redirect_url).then(function(result){ })
```





# dingtalk enterprise
钉钉企业号**API**,自带**cache**，并自带**ISV**套件操纵接口。
##示例
####config:
```js
var DingIsv = require('dingtalk-isv');

var config = {
  corpid : 'xxxxxxxxxxxxxxxx', //ISV套件控制的话，可不填
  secret : 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxx', //ISV套件控制的话，可不填
  getToken : function(){
    //从数据库中取出Token，返回的data样式为：{value: 'xxxxxxx', expires:1452735301543}
    //return ''
  },

  saveToken : function(data){
    //存储Token到数据库中，data样式为：{value: 'xxxxxxx', expires:1452735301543//过期时间}
    //save ...
  },

  getJsApiTicket : function(){
    //从数据库中取出JsApiTicket，返回的data样式为：{value: 'xxxxxxx', expires:1452735301543}
    //return ...
  },

  saveJsApiTicket : function(data, callback){
    //存储JsApiTicket到数据库中，data样式为：{value: 'xxxxxxx', expires:1452735301543//过期时间}
    //save ...
  }
};
```
###创建企业号API：
```js
var api = new DingIsv.Enterprise(config);
```
###用ISV套件操作企业号？OK
只需要两个参数：
```js
//newSuiteApi: 一个dingtalk_suite实例。
var dingEnterprise = new DingIsv.Enterprise.fromSuite(dingSuite);
//只需传入corpid, 和企业号的永久授权码就能控制企业号。
var api = dingEnterprise.ctrl(corpid, permanent_code);
```
如果你获取永久授权码的同时，获得了token_cache，可以加上第三个参数，这样可以省一次数据库查询。
```js
//token为Object格式 key为: value , expires
var api = dingEnterprise.ctrl(corpid, permanent_code, token_cache);
```
如果你获取永久授权码的同时，获得了token_cache和jsapi_ticket_cache，可以加上第四个参数，这样可以省两次数据库查询。
```js
//token和jsapi_ticket_cache为Object格式 key为: value , expires
var api = dingEnterprise.ctrl(corpid, permanent_code, token_cache, jsapi_ticket_cache);
```


##接口方法
###主要方法
####api.getLatestToken().then(function(result){ });
获得最新token。
```js
//例:
api.getLatestToken().then(function(token){
  //token格式为：{value: 'xxxxxxx', expires:1452735301543//过期时间}
  console.log('token',token);
});
```
####api.getUrlSign(url);
生成url授权参数，用于前端jsConfig.
```js
//例:
api.getUrlSign('http://www.test.com/path').then(function(result){
  /*
  result格式为：{
    signature: '23sadfasdfasdf',
    timeStamp:'24234234234234',
    nonceStr:'asfdasdfasdfasfdx'
  }
  */
  console.log('result',result);
});
```
####api.get(ddApiPath, opts).then(function(result){ });
代理get方法。使有此方法可调用钉钉官方企业号文档的get接口，而不用管token。
```js
//例:
//获取部门列表
//钉钉文档：http://ddtalk.github.io/dingTalkDoc/?spm=a3140.7785475.0.0.p5bAUd#获取部门列表
api.get('/department/list').then(function(result){
  console.log('result', result);
});

//获取部门详情
//钉钉文档：http://ddtalk.github.io/dingTalkDoc/?spm=a3140.7785475.0.0.p5bAUd#获取部门详情
api.get('/department/get', {id:2}).then(function(result){
  console.log('result', result);
});
```
####api.post(ddApiPath, opts).then(function(result){ });
代理post方法。使有此方法可调用钉钉官方企业号文档的post接口，而不用管token。

用法同api.get。

###其它封装的一些方法。
####部门
```js
//获得部门列表
api.getDepartments().then(function(result){ });

//获得部门详情
api.getDepartmentDetail(id).then(function(result){ });

//创建部门
api.createDepartment(name, opts).then(function(result){ });
//例
//名字，父id
api.createDepartment('部门一', 1).then(function(result){ });
//名字，详细配置
api.createDepartment('部门一', {parentid: 1, order:1}).then(function(result){ });

//更新部门
api.updateDepartment(id, opts).then(function(result){ });

//删除部门
api.deleteDepartment(id).then(function(result){ });

```
####微应用
```js
api.createMicroApp(data).then(function(result){ });

```
####消息
```js
api.sendToConversation().then(function(result){ });

api.send(agentid, msg).then(function(result){ });

```
####用户
```js
//获取部门用户
api.getDepartmentUsers(id).then(function(result){ });

//获取部门用户详细
api.getDepartmentUsersDetail(id).then(function(result){ });

//获取用户信息
api.getUser(id).then(function(result){ });

//通过code获取用户一些信息(App登录用)。
api.getUserInfoByCode(code).then(function(result){ });
