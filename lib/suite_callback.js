/**
 * Created by along on 16/6/21.
 */
var DingTalkCrypt = require('./dingtalk_crypt');


//钉钉文档：http://ddtalk.github.io/dingTalkDoc/?spm=a3140.7785475.0.0.p5bAUd#2-回调接口（分为五个回调类型）
module.exports = function(config, callback) {
    var dingCrypt = new DingTalkCrypt(config.token, config.encodingAESKey, config.suiteid || 'suite4xxxxxxxxxxxxxxx');

    var TICKET_EXPIRES_IN = config.ticket_expires_in || 1000 * 60 * 20 //20分钟
    return function(req, res, next) {

        var signature = req.query.signature;
        var timestamp = req.query.timestamp;
        var nonce = req.query.nonce;
        var encrypt = req.body.encrypt;

        if (signature !== dingCrypt.getSignature(timestamp, nonce, encrypt)) {
            return res.status(401).end('Invalid signature');
        }

        var result = dingCrypt.decrypt(encrypt);
        var message = JSON.parse(result.message);

        if (message.EventType === 'check_update_suite_url' || message.EventType === 'check_create_suite_url') { //创建套件第一步，验证有效性。
            var Random = message.Random;
            result = _jsonWrapper(timestamp, nonce, Random);
            res.json(result);

        } else {
            res.reply = function() { //返回加密后的success
                result = _jsonWrapper(timestamp, nonce, 'success');
                res.json(result);
            }

            if (config.saveTicket && message.EventType === 'suite_ticket') {
                var data = {
                    value: message.SuiteTicket,
                    expires: Number(message.TimeStamp) + TICKET_EXPIRES_IN
                }
                config.saveTicket(data, function(err) {
                    if (err) {
                        return next(err);
                    } else {
                        res.reply();
                    }
                });
            }else{
                callback(message, req, res, next);
            }
        };
    }


    function _jsonWrapper(timestamp, nonce, text) {
        var encrypt = dingCrypt.encrypt(text);
        var msg_signature = dingCrypt.getSignature(timestamp, nonce, encrypt); //新签名
        return {
            msg_signature: msg_signature,
            encrypt: encrypt,
            timeStamp: timestamp,
            nonce: nonce
        };
    }

}

