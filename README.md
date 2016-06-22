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
### 获取企业号永久授权码
```js
api.getPermanentCode(tmp_auth_code, callback)
```
tmp_auth_code字符串，从DingIsv.SuiteCallBack处获得。
### 获取企业号Token
```js
//auth_corpid和permanent_code由上面接口获得。
api.getCorpToken(auth_corpid, permanent_code, callback)
```
### 获取企业号信息
```js
api.getAuthInfo(auth_corpid, permanent_code, callback)
```
### 获取企业号应用
```js
api.getAgent(agentid, auth_corpid, permanent_code, callback)
```
### 激活授权套件
```js
api.activateSuite(auth_corpid, permanent_code, callback)
```
### 为授权方的企业单独设置IP白名单
```js
//ip_whitelist为数组格式：["1.2.3.4","5.6.*.*"]
api.setCorpIpwhitelist(auth_corpid, ip_whitelist, callback)
```

