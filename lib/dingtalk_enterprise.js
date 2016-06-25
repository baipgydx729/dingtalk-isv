/**
 * Created by along on 16/6/24.
 */

var agent = require('superagent');
var crypto = require('crypto'); 
var BASE_URL = 'https://oapi.dingtalk.com';
var TOKEN_EXPIRES_IN = 1000 * 60 * 60 * 2 - 10000 //1小时59分50秒.防止网络延迟

var Api = function(conf) {
    if (typeof conf === 'string') {
        this.token_cache = {
            value: conf,
            expires: Infinity
        };

        if(arguments[1]){
            this.jsapi_ticket_cache = {
                value: arguments[1],
                expires: Infinity
            };
        }

    } else {
        this.corpid = conf.corpid;
        this.secret = conf.secret;
        this.token_cache = null;
        this.jsapi_ticket_cache = null;
        this.getJsApiTicket = conf.getJsApiTicket || function(){ return Promise.resolve(null) };
        this.saveJsApiTicket = conf.saveJsApiTicket || function(){ return Promise.resolve(null) };

        this.getToken = conf.getToken || function(){ return Promise.resolve(this.token_cache);};
        this.saveToken = conf.saveToken || function(token) {
                this.token_cache = token;
                if (process.env.NODE_ENV === 'production') {
                    console.warn('Don\'t save token in memory, when cluster or multi-computer!');
                }
                Promise.resolve(this.token_cache);
            };
        this.token_expires_in = conf.token_expires_in || TOKEN_EXPIRES_IN;
    }
}

Api.prototype._get_access_token = function() {
    var self = this;
    return new Promise(function (resolve, reject) {
        agent.get(BASE_URL + '/gettoken')
            .query({
                corpid: self.corpid,
                corpsecret: self.secret
            }).end(wrapper(resolve, reject));
    })
};

Api.prototype.getLatestToken = function() {
    var self = this;
    if (!self.token_cache) {
        return self.getToken().then(function (token) {
            self.token_cache = token || {expires: 0};
            return self.getLatestToken();
        });
    } else {
        var now = Date.now();
        if (self.token_cache.expires <= now) {
            return self._get_access_token().then(function (token) {
                self.token_cache = {value: token.access_token, expires: now + self.token_expires_in};
                self.saveToken(self.token_cache);
                return Promise.resolve(self.token_cache);
            });
        } else {
            return Promise.resolve(self.token_cache);
        }
    }
}

//代理：get方法
Api.prototype.get = function(path, data){
    return this.getLatestToken().then(function (token) {
        data.access_token = token.value;
        return new Promise(function (resolve, reject) {
            agent.get(BASE_URL + path).query(data).end(wrapper(resolve, reject));
        })
    });
}

//代理：post方法
Api.prototype.post = function(path, data){
    return this.getLatestToken().then(function (token) {
        return new Promise(function (resolve, reject) {
            agent.post(BASE_URL + path)
                .query({access_token: token.value})
                .send(data)
                .end(wrapper(resolve, reject));
        })
    });
}

//=============================== 部门 ===============================

Api.prototype.getDepartments = function() {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.getLatestToken().then(function (token) {
            agent.get(BASE_URL + '/department/list')
                .query({access_token: token.value})
                .end(wrapper(resolve, reject));
        });
    })
}

Api.prototype.getDepartmentDetail = function(id) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.getLatestToken().then(function (token) {
            agent.get(BASE_URL + '/department/get')
                .query({id: id,access_token: token.value})
                .end(wrapper(resolve, reject));
        });
    })
}

Api.prototype.createDepartment = function(name, opts) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.getLatestToken().then(function (token) {
            if (typeof opts === 'object') {
                opts.name = name;
                opts.parentid = opts.parentid || 1;
            } else {
                opts = {
                    name: name,
                    parentid: opts
                }
            }
            agent.post(BASE_URL + '/department/create')
                .query({access_token: token.value})
                .send(opts)
                .end(wrapper(resolve, reject));
        });
    })
}

Api.prototype.updateDepartment = function(id, opts) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.getLatestToken().then(function(token) {
            if (typeof opts === 'object') {
                opts.id = id;
            } else {
                opts = {name: opts, id: id}
            }
            agent.post(BASE_URL + '/department/update')
                .query({ access_token: token.value  })
                .send(opts)
                .end(wrapper (resolve,reject));
        });
    })
}

Api.prototype.deleteDepartment = function(id) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.getLatestToken().then(function (token) {
            agent.get(BASE_URL + '/department/delete')
                .query({id: id, access_token: token.value})
                .end(wrapper(resolve, reject));
        });
    })
}

//=============================== 微应用 ===============================

Api.prototype.createMicroApp = function(data) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.getLatestToken().then(function (token) {
            agent.post(BASE_URL + '/microapp/create')
                .query({access_token: token.value})
                .send(data)
                .end(wrapper(resolve, reject));
        });
    })
};

//=============================== 消息 ===============================
//
Api.prototype.sendToConversation = function() {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.getLatestToken().then(function (token) {
            agent.post(BASE_URL + '/message/send_to_conversation')
                .query({access_token: token.value})
                .end(wrapper(resolve, reject));
        });
    })
};

Api.prototype.send = function(agentid, options) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.getLatestToken().then(function (token) {
            options.agentid = agentid + '';
            agent.post(BASE_URL + '/message/send')
                .query({ access_token: token.value })
                .send(options)
                .end(wrapper(resolve, reject));
        });
    })
};

//=============================== 用户 ===============================

Api.prototype.getDepartmentUsers = function(id) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.getLatestToken().then(function (token) {
            agent.get(BASE_URL + '/user/simplelist')
                .query({department_id: id, access_token: token.value})
                .end(wrapper(resolve, reject));
        });
    })
}

Api.prototype.getDepartmentUsersDetail = function(id) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.getLatestToken().then(function (token) {
            agent.get(BASE_URL + '/user/list')
                .query({department_id: id, access_token: token.value})
                .end(wrapper(resolve, reject));
        });
    })
}


Api.prototype.getUser = function(id) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.getLatestToken().then(function(token) {
            agent.get(BASE_URL + '/user/get')
                .query({userid: id, access_token: token.value })
                .end(wrapper (resolve,reject));
        });
    })
}

//登录
Api.prototype.getUserInfoByCode = function(code) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.getLatestToken().then(function (token) {
            agent.get(BASE_URL + '/user/getuserinfo')
                .query({code: code, access_token: token.value})
                .end(wrapper(resolve, reject));
        });
    })
};



//=============================== jsApi Ticket ===============================

Api.prototype._get_jsApi_ticket = function() {
    var self = this;
    return self.getLatestToken().then(function (token) {
        return new Promise(function (resolve, reject) {
            agent.get(BASE_URL + '/get_jsapi_ticket')
                .query({type: 'jsapi', access_token: token.value})
                .end(wrapper(resolve, reject));
        })
    })
};


Api.prototype.getLatestJsApiTicket = function() {
    var self = this;
    if (!self.jsapi_ticket_cache) {
        return self.getJsApiTicket().then(function (data) {
            self.jsapi_ticket_cache = data || {expires: 0};
            return self.getLatestJsApiTicket();
        });
    } else {
        var now = Date.now();
        if (self.jsapi_ticket_cache.expires <= now) {
            return self._get_jsApi_ticket().then(function(data) {
                self.jsapi_ticket_cache = {value: data.ticket, expires: now + self.token_expires_in};
                self.saveJsApiTicket(data);
                return self.jsapi_ticket_cache;
            })
        } else {
            return Promise.resolve(this.jsapi_ticket_cache);
        }
    }
}


var createNonceStr = function() {
    return Math.random().toString(36).substr(2, 15);
};

var raw = function (args) {
    var keys = Object.keys(args);
    keys = keys.sort();
    var newArgs = {};
    keys.forEach(function (key) {
        newArgs[key] = args[key];
    });

    var string = '';
    for (var k in newArgs) {
        string += '&' + k + '=' + newArgs[k];
    }
    return string.substr(1);
};

var sign = function(ret) {
    var string = raw(ret);
    var shasum = crypto.createHash('sha1');
    shasum.update(string);
    return shasum.digest('hex');
};



/*Api.prototype.generate = function(param, callback){
 }*/

Api.prototype.getUrlSign = function(url) {
    var self = this;
    return self.getLatestJsApiTicket().then(function (data) {
        var result = {
            noncestr: createNonceStr(),
            jsapi_ticket: data.value,
            timestamp: Date.now(),
            url: url
        }

        var signature = sign(result);
        result = {
            signature: signature,
            timeStamp: result.timestamp.toString(),
            nonceStr: result.noncestr
        }
        return result;
    });

}

//=============================== ISV Suite Ctrl ===============================

Api.fromSuite = function(newSuiteApi, conf) {
    for (var i in conf) {
        this[i] = conf[i];
    }
    this.newSuiteApi = newSuiteApi;
}

Api.fromSuite.prototype.ctrl = function(corpid, permanent_code, token_cache, jsapi_ticket_cache) {
    this.corpid = corpid;
    this.token_cache = token_cache;
    this.jsapi_ticket_cache = jsapi_ticket_cache;

    var api = new Api(this);
    var newSuiteApi = this.newSuiteApi;
    api._get_access_token = function(){
       return newSuiteApi.getCorpToken(corpid, permanent_code);
    }
    return api;
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
