const request = require("request");
const logger = console;

var default_post_headers = {
    "content-type": "application/json;charset=utf-8",
};

var agentOptions = {
    keepAlive: true,
    maxSockets: 256,
};

exports.get = function (url, options) {
    return new Promise((resolve, reject) => {
        options = options || {};
        var httpOptions = {
            url: url,
            method: "get",
            timeout: options.timeout || 3000,
            headers: options.headers || default_post_headers,
            proxy: options.proxy || "",
            agentOptions: agentOptions,
        };
        request
            .get(httpOptions, function (err, res, body) {
                if (err) {
                    reject(err);
                } else {
                    if (res.statusCode == 200) {
                        resolve(body);
                    } else {
                        reject(body);
                    }
                }
            })
            .on("error", logger.error);
    });
};

exports.post = function (url, postdata, options) {
    // console.log(`${moment().format()} HttpPost: ${url}`)
    return new Promise((resolve, reject) => {
        options = options || {};
        var httpOptions = {
            url: url,
            body: JSON.stringify(postdata),
            method: "post",
            timeout: options.timeout || 3000,
            headers: options.headers || default_post_headers,
            proxy: options.proxy || "",
            agentOptions: agentOptions,
        };
        request(httpOptions, function (err, res, body) {
            if (err) {
                reject(err);
            } else {
                if (res.statusCode == 200) {
                    resolve(body);
                } else {
                    reject(body);
                }
            }
        }).on("error", logger.error);
    });
};
exports.delete = function (url, payload, options) {
    // console.log(`${moment().format()} HttpPost: ${url}`)
    return new Promise((resolve, reject) => {
        options = options || {};
        var httpOptions = {
            url: url,
            body: payload,
            method: "delete",
            timeout: options.timeout || 3000,
            headers: options.headers || default_post_headers,
            proxy: options.proxy || "",
            agentOptions: agentOptions,
        };
        request(httpOptions, function (err, res, body) {
            if (err) {
                reject(err);
            } else {
                if (res.statusCode == 200) {
                    resolve(body);
                } else {
                    reject(body);
                }
            }
        }).on("error", logger.error);
    });
};
exports.form_post = function (url, postdata, options) {
    // console.log(`${moment().format()} HttpFormPost: ${url}`)
    return new Promise((resolve, reject) => {
        options = options || {};
        var httpOptions = {
            url: url,
            form: postdata,
            method: "post",
            timeout: options.timeout || 3000,
            headers: options.headers || default_post_headers,
            proxy: options.proxy || "",
            agentOptions: agentOptions,
        };
        request(httpOptions, function (err, res, body) {
            if (err) {
                reject(err);
            } else {
                if (res.statusCode == 200) {
                    resolve(body);
                } else {
                    reject(res.statusCode);
                }
            }
        }).on("error", logger.error);
    });
};
