/**
 * Created by along on 16/6/23.
 */
var agent = require('superagent');
var SSO_BASE_URL = 'https://oapi.dingtalk.com';

var Api = function(conf) {
    this.SSOSecret = conf.SSOSecret;
    this.corpid = conf.corpid;
}

Api.prototype.getSSOToken = function() {
    var self = this;
    return new Promise(function (reslove, reject) {
        agent.get(SSO_BASE_URL + '/sso/gettoken').query({
            corpid: self.corpid,
            corpsecret: self.SSOSecret
        }).end(wrapper(reslove, reject));
    })
};

//登录
Api.prototype.getSSOUserInfoByCode = function(code) {
    var self = this;
    return new Promise(function (reslove, reject) {
        self.getSSOToken().then(function (token) {
            agent.get(SSO_BASE_URL + '/sso/getuserinfo')
                .query({
                    code: code,
                    access_token: token.access_token
                })
                .end(wrapper(reslove, reject));
        });
    })
};

//生成授权链接
Api.prototype.generateAuthUrl = function(redirect_url) {
    return 'https://oa.dingtalk.com/omp/api/micro_app/admin/landing?corpid=' + this.corpid + '&redirect_url=' + redirect_url;
};

//对返回结果的一层封装，如果遇见微信返回的错误，将返回一个错误
function wrapper (resolve,reject) {
    return function (err, data) {
        if (err) {
            err.name = 'DingTalkAPI' + err.name;
            return reject(err);
        }
        data = data.body;
        if (data.errcode) {
            err = new Error(data.errmsg);
            err.name = 'DingTalkAPIError';
            err.code = data.errcode;
            return reject(err, data);
        }
        resolve(data);
    };
};

module.exports = Api;