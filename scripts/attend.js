var util = require('util');
var moment = require("moment");
var mysql  = require('mysql');
var config = require('./config');

function handleDisconnect() {
  var db = config.database;
  connection = mysql.createConnection({
    host     : db.host,
    database : db.database,
    user     : db.user,
    password : db.password
  });

  connection.connect(function(err) {
    if(err) {
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000);  //接続失敗時リトライ
    }
  });

  connection.on('error', function(err) { //エラー受け取るコールバック
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') {
      handleDisconnect();    //再度接続
    } else {
      throw err;
    }
  });
}

handleDisconnect();

module.exports = function(robot) {
  //connection.connect();
  robot.hear(/hello/i, function(msg) {
    msg.send('World!');
  });

 robot.hear(/\[test\] (.*)/i,function(msg){
  item = msg.match[0];

   msg.send(msg.match[1]);
 });

 robot.hear(/\[start\] (.*)/i, function(msg){
   var user = msg.message.user.name;
     connection.query('insert into attend (user, task, end) values ("'+ user +'","WIP:' + msg.match[1] +'", CURRENT_TIMESTAMP);', function(err, result) {
        if (err) {
          msg.send(err);
        }
     });
     msg.send(user + "が" +msg.match[1]+"を始めました！");
 });
 robot.hear(/\[end\] (.*)/i, function(msg){
  //connection.connect();

   var user = msg.message.user.name;
     connection.query('select * from attend WHERE (DATE(start) = CURDATE() OR DATE(start) = DATE_SUB(CURDATE(),interval 1 day)) AND user = "'+user+'" AND task = "WIP:' +msg.match[1]+'";', function(err, result) {
       if (err) {
          msg.send(err);
        }
       if (util.inspect(result[0]) === "undefined") {
         msg.send(msg.match[1]+"は開始されてないよ!");
       }else{
         connection.query('update attend set task="'+msg.match[1]+'", end = CURRENT_TIMESTAMP WHERE (DATE(start) = CURDATE() OR DATE(start) = DATE_SUB(CURDATE(),interval 1 day)) AND user = "'+user+'" AND task = "WIP:' +msg.match[1]+'";',function(err, result) {
           if (err) {
             msg.send("ないよ");
           }
         msg.send(msg.match[1]+"が終わりました！");
       });
     }
   });

 });

 robot.hear(/\[end2\]/i, function(msg){
   var user = msg.message.user.name;
     connection.query('select * from attend WHERE (DATE(start) = CURDATE() OR DATE(start) = DATE_SUB(CURDATE(),interval 1 day)) AND user = "'+user+'" AND task LIKE "WIP:%";', function(err, result) {
       if (err) {
          msg.send(err);
        }
       if (util.inspect(result[0]) === "undefined") {
         msg.send("タスクは開始されてないよ!");
       }else{
         connection.query('update attend set task="'+msg.match[1]+'", end = CURRENT_TIMESTAMP WHERE (DATE(start) = CURDATE() OR DATE(start) = DATE_SUB(CURDATE(),interval 1 day)) AND user = "'+user+'" AND task = "WIP:' +msg.match[1]+'";',function(err, result) {
           if (err) {
             msg.send("ないよ");
           }
         //msg.send(result[0].task.replace(/WIP:/g,"")+"が終わりました！");
       });
     }
   msg.send(result[0].task.replace(/WIP:/g,""));
   });

 });


 robot.hear(/\[sum\]/i, function(msg){
	connection.query('select task, timediff(end,start) as time from attend where (DATE(start) = CURDATE() OR (DATE(end) = CURDATE() AND DATE(start) = DATE_SUB(CURDATE(),interval 1 day))) AND user = "'+msg.message.user.name+'";', function(err, result) {
        if (err) {
          msg.send(err);
        }
	for(var i in result){
         var mTask = moment(result[i].time, "HH:mm:ss");
	 if(mTask.hours()==0){
          var formatTask = mTask.format('m分s秒');
	 }else{
          var formatTask = mTask.format('H時間m分s秒');
	 }
         msg.send(result[i].task+"   "+formatTask);
	}
    	connection.query('select sum(time_to_sec(timediff(end,start))) as sumTime from attend where (DATE(start) = CURDATE() OR (DATE(end) = CURDATE() AND DATE(start) = DATE_SUB(CURDATE(),interval 1 day))) AND user = "'+msg.message.user.name+'";', function(err, sum) {
       	 if (err) {
       	   msg.send(err);
       	 }
       	 msg.send("今日の勤務時間は"+toHms(sum[0].sumTime)+"だよ！");
     });
   });
 });
function toHms(t) {
	var hms = "";
	var h = t / 3600 | 0;
	var m = t % 3600 / 60 | 0;
	var s = t % 60;

	if (h != 0) {
		hms = h + "時間" + padZero(m) + "分" + padZero(s) + "秒";
	} else if (m != 0) {
		hms = m + "分" + padZero(s) + "秒";
	} else {
		hms = s + "秒";
	}

	return hms;

	function padZero(v) {
		if (v < 10) {
			return "0" + v;
		} else {
			return v;
		}
	}
}

 robot.hear(/\[remove\] (.*)/i, function(msg){
     var user = msg.message.user.name;
     connection.query('delete from attend WHERE (DATE(start) = CURDATE() OR DATE(start) = DATE_SUB(CURDATE(),interval 1 day)) AND user = "'+user+'" AND task = "WIP:' +msg.match[1]+'";', function(err, result) {
       if (err) {
          msg.send(err);
       }
	if(result.affectedRows === 1){
          msg.send(msg.match[1]+"を取り消しました！");
        }else{
         msg.send(msg.match[1]+"は開始されてないよ!");
        }
     });
 });

 robot.hear(/休憩/i, function(msg) {
   msg.send('お疲れさま！ゆっくり休んでね');
 });


 robot.hear(/\[month\] (.*)/i, function(msg){
   var user = msg.message.user.name;
   var date = new Date();
   var searchDay = msg.match[1];
   if(searchDay.length == 1){
	searchDay = '0' + searchDay;
   }
   var searchDate = date.getFullYear() + searchDay;
     connection.query("select task, timediff(end,start) as time from attend where user = '"+ user +"' and DATE_FORMAT(start, '%Y%m') = "+ searchDate +";", function(err, result) {
        if (err) {
          msg.send(err);
        }

	for(var i in result){
         var mTask = moment(result[i].time, "HH:mm:ss");
         if(mTask.hours()==0){
          var formatTask = mTask.format('m分s秒');
         }else{
          var formatTask = mTask.format('H時間m分s秒');
         }
         msg.send(result[i].task+"   "+formatTask);
        }
     });
        connection.query("select sum(time_to_sec(timediff(end,start))) as sumTime from attend where user = '"+ user +"' and DATE_FORMAT(start, '%Y%m') = " + searchDate + ";", function(err, sum) {
         if (err) {
           msg.send(err);
         }
         msg.send(msg.match[1]+"月の勤務時間は"+toHms(sum[0].sumTime)+"だよ！");
    });
 });
}
