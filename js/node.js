var Node = {
	socket : io.connect('http://42.121.129.32:8888'),
	enter : function(data){
		var n = 0;
		$(".contact-list li").each(function(){
			if($(this).data('uid') == data.uid){
				$(this).find(".contact-status").removeClass("offline");
				$(".last-info").text(data.nickname.substr(0,10)+" 回来了!")
				n++;
			}
		})
		if(n == 0){
			Node.tpl();
			$(".contact-list").append(Node._compiled_tpl.render({datas:{0:data}}));
			$(".last-info").text(data.nickname.substr(0,10)+" 连接至服务器!");
		}
	},
	leave : function(data){
		$(".contact-list li").each(function(){
			if($(this).data('uid') == data.uid){
				$(this).find(".contact-status").addClass("offline");
				$(".last-info").text(data.nickname.substr(0,10)+" 离开服务器!")
			}
		})
	},
	setNick : function(data){
		userInfo.nickname = $(".nick-name").val();
		localStorage.setItem("userInfo",JSON.stringify(userInfo));
		Node.socket.emit('modify', userInfo);
	},
	modify : function(data){
		$(".contact-list li").each(function(){
			if($(this).data('uid') == data.uid){
				$(this).find(".contact-name").text(data.modify.nickname)
			}
		})
	},
	chat : function(content){
		if($(".contact-list li.cur").length == 1){
			var to = $(".contact-list li.cur").data("uid");
			Node.socket.emit('PM', to, content, function(ok){});
		}else{
			$(".last-info").text("请选择私聊对象!");
		}
	},
	tpl : function(datas){
		var tpl=[
			'{@each datas as data}',
				'<li data-uid="${data.uid}">',
				'	<span class="left contact-status"></span>',
				'	<img src="/data/play/img/avatar.png" class="left">',
				'	<span class="left contact-name">${data.nickname}</span>',
				'	<div class="contact-chat left">0</div>',
				'</li>',
			'{@/each}'
		].join('\n');
		this._compiled_tpl = juicer(tpl);
	}
}
// 监听input变化
if(document.all){
	$('input[type="text"]').each(function() {
		var that=this;

		if(this.attachEvent) {
			this.attachEvent('onpropertychange',function(e) {
				if(e.propertyName!='value') return;
				$(that).trigger('input');
			});
		}
	})
}
$(function(){
	var userInfo = localStorage.getItem('userInfo');
	if(!userInfo){
		var info = {
			nickname : uuid.v1().substr(0,10),
			uid 	 : uuid.v1()
		};
		localStorage.setItem("userInfo",JSON.stringify(info));
	}
	window.userInfo = JSON.parse(localStorage.getItem('userInfo'));
	userInfo = JSON.parse(userInfo);
	$(".nick-name").val(userInfo.nickname);

	var socket = io.connect('http://42.121.129.32:8888');
	socket.on('connect', function(data) {
	    socket.emit('handshake', userInfo);
	});
	// 进入
	socket.on('enter', function (data) {
		Node.enter(data);
	});
	// 获取在线列表
	socket.on('init', function(data){
		Node.tpl();
		$(".contact-list").append(Node._compiled_tpl.render({datas:data.online_list}));	})
	// 更新信息
	socket.on('modify', function (data) {
		Node.modify(data);
	});
	// 获取私人信息
	socket.on('PM', function (from,message) {
		$(".last-info").text("@"+from+":"+message);
	});
	// 离开
	socket.on('leave', function (data) {
		Node.leave(data);
	});
	// 更新昵称
	$(".nick-name").on("input",function(){
		Node.setNick();
	})
	// 聊天对象选择
	$(".contact-list li .contact-chat").live("click",function(){
		var self = $(this).parents("li");
		if(self.hasClass("cur")){
			self.removeClass("cur");
		}else{		
			$(".contact-list li").removeClass("cur");
			self.addClass("cur");
		}
	})
	// 聊天
	$(".chat-content").keydown(function(event){
		if (event.keyCode == 13){ 
			Node.chat($(".chat-content").val());
		}
	});
	$(".chat-content").on("input",function(){
		Node.chat($(".chat-content").val());
	})
})