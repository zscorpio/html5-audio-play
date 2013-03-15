
/**
 * Module dependencies.
 */

var express = require('express')
	, routes = require('./routes')
	, user = require('./routes/user')
	, trans = require('./routes/trans')
	, http = require('http')
	, path = require('path');

/**
 * 在线列表
 */
var WebSockets = {};

var app = express();

app.configure(function(){
	app.set('port', process.env.PORT || 8888);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
	app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/users', user.list);
app.get('/trans', trans.index)

var server = http.createServer(app)
	, io = require('socket.io').listen(server);

server.listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
});

io.sockets.on('connection', function (socket) {
	// 进入
	socket.on('handshake', function(userInfo) {
		socket.nickname = userInfo.nickname;
		socket.uid = userInfo.uid;
		userInfo.id = socket.id;
		if(!WebSockets[socket.uid]){
			WebSockets[socket.uid] = socket;
		}
        socket.broadcast.emit("enter", userInfo);
		var online_list = [];
		for(i in io.sockets.sockets){
			if(socket.uid != io.sockets.sockets[i].uid){			
				var data = {
					nickname 	: io.sockets.sockets[i].nickname,
					uid			: io.sockets.sockets[i].uid,
					id 			: io.sockets.sockets[i].id
				};
				online_list.push(data);
			}
		}
		socket.emit("init", {online_list:online_list});
    })

	// 修改信息
	socket.on('modify', function (data) {
		socket.nickname = data.nickname;
		socket.broadcast.emit("modify", {
			uid 	: data.uid,
			modify 	: {
				nickname : data.nickname
			}
		});
	});

	// 私信
	socket.on('PM',function(to, msg, fn){
		var target = WebSockets[to];
		target.emit('PM', socket.nickname, msg);
	});

	// 离开
	socket.on('disconnect', function (data) {
		var userInfo = {
			nickname 	: socket.nickname,
			uid			: socket.uid,
			id 			: socket.id
		}
		socket.broadcast.emit("leave", userInfo);
	});
});

