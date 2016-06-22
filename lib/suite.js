/**
 * Created by along on 16/6/22.
 */
var agent = require('superagent');
var BASE_URL = 'https://oapi.dingtalk.com/service';
var TICKET_EXPIRES_IN = 1000 * 60 * 20 //20分钟
var TOKEN_EXPIRES_IN = 1000 * 60 * 60 * 2 - 10000 //1小时59分50秒.防止网络延迟


var Api = function(conf) {
    this.suite_key = conf.suiteid;
    this.suite_secret = conf.secret;
    this.ticket_expires_in = TICKET_EXPIRES_IN;
    this.token_expires_in = conf.token_expires_in || TOKEN_EXPIRES_IN;

    this.getTicket = conf.getTicket;
    this.getToken = conf.getToken;
    this.saveToken = conf.saveToken;

    this.ticket_cache = {
        expires: 0,
        value: null
    };
    this.token_cache = null;

}

Api.prototype.getLatestTicket = function() {
    var now = Date.now();
    if (this.ticket_cache.expires <= now) {
        return this.getTicket();
    } else {
        return Promise.resolve(this.ticket_cache);
    }
}

Api.prototype._get_access_token = function(callback) {
    var self = this;
    return this.getLatestTicket().then(function(ticket) {
        var data = {
            suite_key: self.suite_key,
            suite_secret: self.suite_secret,
            suite_ticket: ticket.value
        };
        return new Promise(function (resolve, reject) {
            agent.post(BASE_URL + '/get_suite_token').send(data).end(wrapper(resolve, reject));
        })
    });
};

Api.prototype.getLatestToken = function () {
    var self = this;
    if (!self.token_cache) {
        return self.getToken().then(function (token) {
            self.token_cache = token;
            return self.getLatestToken();
        });
    } else {
        var now = Date.now();
        if (self.token_cache.expires <= now) {
            return self._get_access_token().then(function (token) {
                self.token_cache = {
                    value: token.suite_access_token,
                    expires: now + self.token_expires_in
                };
                self.saveToken(self.token_cache);
                return self.token_cache;
            });
        } else {
            return Promise.resolve(this.token_cache);
        }
    }
}

Api.prototype.getPermanentCode = function(tmp_auth_code) {
    var self = this;
    return self.getLatestToken().then(function (token) {
        return new Promise(function (resolve, reject) {
            agent.post(BASE_URL + '/get_permanent_code').query({suite_access_token: token.value}).send({tmp_auth_code: tmp_auth_code}).end(wrapper(resolve, reject));
        })
    });
}

Api.prototype.getCorpToken = function(auth_corpid, permanent_code) {
    var self = this;
    return self.getLatestToken().then(function(token){
        return new Promise(function (resolve, reject) {
            agent.post(BASE_URL + '/get_corp_token').query({suite_access_token: token.value}).send({
                auth_corpid: auth_corpid,
                permanent_code: permanent_code
            }).end(wrapper(resolve, reject));
        })
    });
}

Api.prototype.getAuthInfo = function(auth_corpid, permanent_code) {
    var self = this;
    return self.getLatestToken().then(function(token) {
        return new Promise(function (resolve, reject) {
            agent.post(BASE_URL + '/get_auth_info')
                .query({suite_access_token: token.value})
                .send({suite_key: self.suite_key, auth_corpid: auth_corpid, permanent_code: permanent_code})
                .end(wrapper(resolve, reject));
        })
    });
}

Api.prototype.getAgent = function(agentid, auth_corpid, permanent_code) {
    var self = this;
    return self.getLatestToken().then(function (token) {
        return new Promise(function (resolve, reject) {
            agent.post(BASE_URL + '/get_agent')
                .query({suite_access_token: token.value})
                .send({
                    suite_key: self.suite_key,
                    auth_corpid: auth_corpid,
                    permanent_code: permanent_code,
                    agentid: agentid
                })
                .end(wrapper(resolve, reject));
        })
    });
}

Api.prototype.activateSuite = function(auth_corpid, permanent_code) {
    var self = this;
    return self.getLatestToken().then(function (token) {
        return new Promise(function (resolve, reject) {
            agent.post(BASE_URL + '/activate_suite')
                .query({suite_access_token: token.value})
                .send({suite_key: self.suite_key, auth_corpid: auth_corpid, permanent_code: permanent_code})
                .end(wrapper(resolve, reject));
        })
    });
}

Api.prototype.setCorpIpwhitelist = function(auth_corpid, ip_whitelist) {
    var self = this;
    return self.getLatestToken().then(function (token) {
        return new Promise(function (resolve, reject) {
            agent.post(BASE_URL + '/set_corp_ipwhitelist')
                .query({suite_access_token: token.value})
                .send({suite_key: self.suite_key, auth_corpid: auth_corpid, ip_whitelist: ip_whitelist})
                .end(wrapper(resolve, reject));
        })
    });
}

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