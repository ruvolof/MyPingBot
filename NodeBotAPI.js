const APIURL = 'https://api.telegram.org/bot';

var https = require('https');
var mp = require('./MessageProcessor.js');
//var config = require('./config');

//var TOKEN = config.TOKEN;

var TOKEN = process.env.MYPINGBOT_TOKEN;

exports.getMe = function (f) {
    https.get(APIURL+TOKEN+'/getMe', function(res) {
        var body = '';
        var r;

        res.on('data', function (data) {
            body += data;
        });

        res.on('end', function() {
            r = JSON.parse(body);

            if (r['ok'] == true) {
                console.log('Creating BotData');
                var botData = {
                    username: '@' + r['result']['username'],
                    id: r['result']['id']
                };
                f(botData);
            } else {
                console.log('getMe: '+r.error_code+': '+r.description);
                return false;
            }
        })
    })
};

var msg_id = 0;

function emptyUpdates() {
    https.get(APIURL+TOKEN+'/getUpdates?offset=-1', function (res) {
        var body = '';
        var r;
        res.on('data', function (data) {
            body += data;
        });

        res.on('end', function () {
            r = JSON.parse(body);
            if (r.ok == false) {
                console.error('getUpdates: '+r.error_code+': '+r.description);
            }
            else {
                if (r.result.length == 0) {
                    console.log("Backlog empty.");
                }
                else {
                    msg_id = r.result[0].update_id;
                    msg_id++;
                    https.get(APIURL+TOKEN+'/getUpdates?offset='+msg_id, function (res) {
                        var body = '';
                        var r;
                        res.on('data', function (data) {
                            body += data;
                        });

                        res.on('end', function () {
                            r = JSON.parse(body);
                            if (r.ok == false) {
                                console.error('emptyUpdates: '+r.error_code+': '+r.description);
                            }
                            else {
                                console.log("Message backlog is now empty.");
                            }
                        });
                    })
                }
            }
            getUpdates(msg_id);
        })
    })
}

function getUpdates(offset) {
    https.get(APIURL+TOKEN+'/getUpdates?offset='+offset+'&timeout=10', function (res) {
        var body = '';
        var r;

        res.on('data', function (data) {
            body += data;
        });

        res.on('end', function () {
            r = JSON.parse(body);

            if (r.ok == false) {
                console.log('getUpdates: '+r.error_code+': '+r.description);
            }
            else if (r.result.length == 0){
                getUpdates(offset);
            }
            else {
                msg_id = r.result[0].update_id;
                msg_id++;
                getUpdates(msg_id);
                var current_msg = r.result[0].message;
                mp.processMessage(r.result[0].update_id, current_msg);
            }
        })
    })
}

exports.startUpdatesLoop = function () {
    emptyUpdates();
};

exports.sendMessage = function (chat, text, keyboard, web_preview) {
    if (web_preview == undefined) {
        web_preview = true;
    }

    if (keyboard == undefined) {
        https.get(APIURL+TOKEN+'/sendMessage?chat_id='+chat+'&text='+encodeURIComponent(text)+'&disable_web_page_preview='+web_preview);
    } else {
        https.get(APIURL+TOKEN+'/sendMessage?chat_id='+chat+'&text='+encodeURIComponent(text)+'&reply_markup='+encodeURIComponent(keyboard)+'&disable_web_page_preview='+web_preview);
    }
};
