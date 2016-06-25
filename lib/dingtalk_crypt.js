/**
 * Created by along on 16/6/21.
 */
var crypto = require('crypto');

/**
 * 基于PKCS#7算法的加解密接口
 *
 */
var PKCS7Encoder = {
    /**
     * 删除解密后明文的补位字符
     *
     * @param {String} text 解密后的明文
     */
    decode: function (text) {
        var pad = text[text.length - 1];
        if (pad < 1 || pad > 32) {
            pad = 0;
        }
        return text.slice(0, text.length - pad);
    },
    /**
     * 对需要加密的明文进行填充补位
     *
     * @param {String} text 需要进行填充补位操作的明文
     */
    encode: function (text) {
        var blockSize = 32;
        var textLength = text.length;
        //计算需要填充的位数
        var amountToPad = blockSize - (textLength % blockSize);
        var result = new Buffer(amountToPad);
        result.fill(amountToPad);
        return Buffer.concat([text, result]);
    }
};


/**
 * 加解密信息构造函数
 *
 * @param {String} token          设置的Token
 * @param {String} encodingAESKey 设置的EncodingAESKey
 * @param {String} id             suiteid
 */
var DingTalkCrypt = function (token, encodingAESKey, id) {
    if (!token || !encodingAESKey || !id) {
        throw new Error('please check arguments');
    }
    this.token = token;
    this.id = id;
    var AESKey = new Buffer(encodingAESKey + '=', 'base64');
    if (AESKey.length !== 32) {
        throw new Error('encodingAESKey invalid');
    }
    this.key = AESKey;
    this.iv = AESKey.slice(0, 16);
};

/**
 * 获取签名
 *
 * @param {String} timestamp    时间戳
 * @param {String} nonce        随机数
 * @param {String} encrypt      加密后的文本
 */
DingTalkCrypt.prototype.getSignature = function(timestamp, nonce, encrypt) {
    var shasum = crypto.createHash('sha1');
    var arr = [this.token, timestamp, nonce, encrypt].sort();
    shasum.update(arr.join(''));
    return shasum.digest('hex');
};

/**
 * 对密文进行解密
 *
 * @param {String} text 待解密的密文
 */
DingTalkCrypt.prototype.decrypt = function(text) {
    // 创建解密对象，AES采用CBC模式，数据采用PKCS#7填充；IV初始向量大小为16字节，取AESKey前16字节
    var decipher = crypto.createDecipheriv('aes-256-cbc', this.key, this.iv);
    decipher.setAutoPadding(false);
    var deciphered = Buffer.concat([decipher.update(text, 'base64'), decipher.final()]);

    deciphered = PKCS7Encoder.decode(deciphered);
    // 算法：AES_Encrypt[random(16B) + msg_len(4B) + msg + $CorpID]
    // 去除16位随机数
    var content = deciphered.slice(16);
    var length = content.slice(0, 4).readUInt32BE(0);

    return {
        message: content.slice(4, length + 4).toString(),
        id: content.slice(length + 4).toString()
    };
};

/**
 * 对明文进行加密
 *
 * @param {String} text 待加密的明文
 */
DingTalkCrypt.prototype.encrypt = function (text) {
    // 算法：AES_Encrypt[random(16B) + msg_len(4B) + msg + $CorpID]
    // 获取16B的随机字符串
    var randomString = crypto.pseudoRandomBytes(16);

    var msg = new Buffer(text);

    // 获取4B的内容长度的网络字节序
    var msgLength = new Buffer(4);
    msgLength.writeUInt32BE(msg.length, 0);

    var id = new Buffer(this.id);

    var bufMsg = Buffer.concat([randomString, msgLength, msg, id]);

    // 对明文进行补位操作
    var encoded = PKCS7Encoder.encode(bufMsg);

    // 创建加密对象，AES采用CBC模式，数据采用PKCS#7填充；IV初始向量大小为16字节，取AESKey前16字节
    var cipher = crypto.createCipheriv('aes-256-cbc', this.key, this.iv);
    cipher.setAutoPadding(false);

    var cipheredMsg = Buffer.concat([cipher.update(encoded), cipher.final()]);

    // 返回加密数据的base64编码
    return cipheredMsg.toString('base64');
};

module.exports = DingTalkCrypt;



//var dingCrypt = new DingTalkCrypt('along', 'zvb9pr3w6hpol1re9sk85d37me4i7liazikiunslci8', 'suite4xxxxxxxxxxxxxxx');
//console.log('da59f9e658057569616f9fdb26f3e16ec5b6a904' === dingCrypt.getSignature('1466505128368', '3nH71pLV', 'D6vOBD1kWeyb+bzC1oJNdEzm6Owrb7HPS8P01omJXyzyk5/u/e4OfH1YXHNgJ1snZb0ZIg/4HA6aePhhl2lxtsw8nJVQKi+A9GDb3qIw0YKuUdBQGFC50gPodlqS3Rdz4FLdEkOwyS+BxNXVFfzdTqB+JrtYN1ifrrMm78qGMap59HlNNiAye3/xkGo4Kq3iZmXQPBtp4KS1YzvpmMueoQ=='));
//
//var result = dingCrypt.decrypt('D6vOBD1kWeyb+bzC1oJNdEzm6Owrb7HPS8P01omJXyzyk5/u/e4OfH1YXHNgJ1snZb0ZIg/4HA6aePhhl2lxtsw8nJVQKi+A9GDb3qIw0YKuUdBQGFC50gPodlqS3Rdz4FLdEkOwyS+BxNXVFfzdTqB+JrtYN1ifrrMm78qGMap59HlNNiAye3/xkGo4Kq3iZmXQPBtp4KS1YzvpmMueoQ==');
//console.log(JSON.parse(result.message))
//
