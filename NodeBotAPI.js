const APIURL = 'https://api.telegram.org/bot';

var https = require('https');
var mp = require('./MessageProcessor.js');
var config = require('./config');

var TOKEN = config.TOKEN;

var ERROR_COUNT = 0;
var MAX_ERRORS = 5;

exports.getMe = function (f) {
    var body = '';
    var r;
    var botData;
    https.get(APIURL+TOKEN+'/getMe', function(res) {
        res.on('data', function (data) {
            body += data;
        });

        res.on('end', function() {
            r = JSON.parse(body);

            if (r.ok == true) {
                console.log('Creating BotData');
                botData = {
                    username: '@' + r.result.username,
                    id: r.result.id
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
    var body = '';
    var r;
    https.get(APIURL+TOKEN+'/getUpdates?offset=-1', function (res) {
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
                        body = '';
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
    var body = '';
    var r;
    var current_msg = undefined;
    var s;
    https.get(APIURL+TOKEN+'/getUpdates?offset='+offset+'&timeout=10', function (res) {
        res.on('data', function (data) {
            body += data;
        });

        res.on('end', function () {
            r = JSON.parse(body);

            if (r.ok == false) {
                console.log('getUpdates: '+r.error_code+': '+r.description);
                ERROR_COUNT++;
                if (ERROR_COUNT <= MAX_ERRORS) {
                    getUpdates(offset);
                }
                else {
                   s = 'Too many errors. Stopping getUpdates.';
                   console.log(s);
                   config.admin.forEach(function (adm_id) {
                       sendMessage(adm_id, s.toString('utf8'));
                   });
                }
            }
            else if (r.result.length == 0){
                ERROR_COUNT = 0;
                getUpdates(offset);
            }
            else {
                ERROR_COUNT = 0;
                msg_id = r.result[0].update_id;
                msg_id++;
                getUpdates(msg_id);
                if (r.result[0].hasOwnProperty('edited_message')) {
                    current_msg = r.result[0].edited_message;
                }
                else {
                    current_msg = r.result[0].message;
                }

                if (current_msg != undefined) {
                    mp.processMessage(r.result[0].update_id, current_msg);
                }
                else {
                    console.log("Not processing message " + msg_id + ".");
                }
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
