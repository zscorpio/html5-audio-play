// TODO 歌曲居中显示 单曲循环
window.audioDb || (window.audioDb = {});
var audioDb = TAFFY();
audioDb.store("songList");

var Audio = {
	song : null,
	cur  : null,
	init : function(){
		this.renderList('');
	},
	// 生成歌曲列表
	list: function(){
		if(audioDb().get().length == 0){
			Kugou.search("苏打绿","add");
		}
		return audioDb().get();
	},
	// 添加歌曲
	add : function(songs){
		audioDb.insert(songs);
	},
	// 删除歌曲
	delete : function(hash){
		console.log(hash);
		audioDb().filter({hash:hash}).remove();
	},
	// 播放
	play : function(){
		$(".play").removeClass("play").addClass("pause");
		var songData = Song.cur().data("song");
		if(Audio.song){
			Audio.song.stop();
		}
		if(!Audio.cur || Audio.cur.data("song").hash != songData.hash){
			Audio.song = new buzz.sound("php/songProxy.php?url="+songData.url);
			Kugou.lrc(songData.fileName, songData.timeLength, songData.hash);
		}
		// 设置歌词
		Audio.setLrc(songData.hash);
		Audio.cur = Song.cur();
		Audio.setIndex();
		Audio.song.play()
		.bind( "timeupdate", function() {
			Audio.setProgress(songData.hash);
		})
		.bind("ended", function(e) {
			Audio.nextSong();
		});
	},
	// 暂停
	pause : function(){
		$(".pause").removeClass("pause").addClass("play");
		Audio.song.pause();
	},
	// 静音
	mute : function(){
		if ( Audio.song.isMuted() ) {
			Audio.song.unmute();
		}else{
			Audio.song.mute();
		}
	},
	// 设置音量
	setVolume : function(volume){
		Audio.song.setVolume(volume);
	},
	// 搜索结果
	search : function(songs){
		this.renderList(songs);
	},
	// 渲染界面
	renderList : function(data){
		var type = 'trash';
		if(!data){
			data = this.list();
		}else{	
			type = 'add'; 
		}
		var html = '';
		for(i in data){
			var songInfo = Widget.formatSong(data[i].fileName);
			html += [
				"<li data-song='"+JSON.stringify(data[i])+"'>",
				"	<h3>"+songInfo[1]+"</h3>",
				"	<p class='singer-name' title='"+songInfo[0]+"'>"+songInfo[0]+"</p>",
				"	<img src='/data/play/img/"+type+".png' class='"+type+" hide' data-hash='"+data[i].hash+"'>",
				"</li>",
			].join("\n")
		}
		$(".song-list").html(html);
	},
	// 设置歌词
	setLrc : function(hash){
		lrcData = audioDb().filter({hash:hash}).first().lrc;
		var words = lrcData.words, times = lrcData.times, data = lrcData.data;
		var len = times.length,i = 0,str='',top = "50";
		for(;i<len;i++){
			var t = times[i],w = words[t];
			str += '<p data-lrctime="'+t+'" data-lrctop="'+top+'">'+w+'</p>';
			top-=20;
		}
		$(".lrcContent").html(str);
	},
	// 设置进度
	setProgress : function(hash){
		var timer = buzz.toTimer( Audio.song.getTime() );
		var time     = Audio.song.getTime(),
			duration = Audio.song.getDuration(),
			percent  = buzz.toPercent( time, duration, 2 );
		$(".progress").css("width",percent)
		$(".allTime").text(Widget.formatTime(duration));
		$(".curTime").text(timer);
		var lrcData = audioDb().filter({hash:hash}).first().lrc;
		var words = lrcData.words, 
			times = lrcData.times,
			len = times.length, 
			i = 0,
			curTime = time*1e3|0;
		for(;i<len;i++){
			var t = times[i]; 
			if (curTime > t && curTime < times[i + 1]) {
				$(".lrcContent p").removeClass("cur");
				$("title").text($('p[data-lrctime="'+t+'"]').text());
				$('p[data-lrctime="'+t+'"]').addClass("cur");
				$('.lrcContent').css("margin-top",$('.lrcContent p.cur').data('lrctop')+"px");
			}
		}
	},
	// 设置歌曲居中显示
	setIndex : function(){
		var index = $("li.cur").index(),
			height = 120+index*(-40);
		if( index >=3 ){
			$(".jspPane").css("top",height+"px");
		}else{
			$(".jspPane").css("top","0px");
		}
	},
	// 下一首
	nextSong : function(){
		console.log($(".play-mode.active").data("mode"));
		if($(".play-mode.active").data("mode") == "order"){
			Song.next().click();
		}
		if($(".play-mode.active").data("mode") == "loop"){
			Audio.song.loop()
		}
		if($(".shuffle.active").data("mode") == "shuffle"){
			Song._random().click();
		}
	}
}
var Kugou = {
	search :function(keyword,type){
		$(".search").addClass("load");
		var songs = [];
		$.ajax({
			type: "get",
			async: false,
			url: "http://mobilecdn.kugou.com/new/app/i/search.php?cmd=300&outputtype=jsonp&callback=returnSearchDataMore&keyword="+keyword,
			dataType: "jsonp",
			success: function(data){
				for(i in data.data){
					$.ajax({
						type 	: "get",
						async 	: false,
						dataType: "json",
						url 	: 'php/urlProxy.php',
						data 	: {
							url : 'http://m.kugou.com/app/i/getSongInfo.php',
							cmd : 'playInfo',
							hash: data.data[i].hash
						},
						success: function(info){
							info.hash = data.data[i].hash;
							info.lrc  = '';
							songs.push(info);
						}
					})
					$(".search").removeClass("load");
				}
				if(type == "add"){
					Audio.add(songs);
				}
				if(type == "search"){
					Audio.search(songs);
				}

			},
		});
	},
	lrc : function(keyword,length,hash){
		$.ajax({
			type 	: "get",
			async 	: false,
			url 	: 'php/urlProxy.php',
			data 	: {
				url 		: 'http://m.kugou.com/app/i/krc.php',
				cmd 		: '100',
				keyword 	: keyword,
				timelength 	: length*1000
			},
			success: function(info){
				audioDb().filter({hash:hash}).update("lrc",Widget.parseLrc(info))
			}
		})
	}
}
var Widget = {
	/**
	 * 分钟格式转换，传入的是秒数
	 */
	formatTime : function (time){
		var min = '00' + (time / 60 | 0), sec = time % 60;
		sec = '00' + (sec | 0);
		return [min.substr(-2), sec.substr(-2)].join(':');
	},
	/**
	 * 歌曲名字分割 
	 */
	formatSong : function(song){
		if(song){
			return song.split(" - ");
		}else{
			return ['',''];
		}
	},
	/**
	 * 解析lrc
	 * @param {Object} lrc
	 */
	parseLrc : function(lrc) {
		var arr = lrc.split(/[\r\n]/), 
			len = arr.length, 
			words = {}, 
			times = [], i = 0;
		var musicData = {ti:'',ar:'',al:''};
		for (; i < len;) {
			var temp,doit = true,
				str = unescape(arr[i]), 
				word = str.replace(/\[\d*:\d*((\.|\:)\d*)*\]/g, '');
			'ti ar al'.replace(/\S+/g,function(a){
				if (doit && musicData[a] === '') {
					temp = str.match(new RegExp('\\[' + a + '\\:(.*?)\\]'));
					if (temp && temp[1]) {
						doit = false;
						musicData[a] = temp[1];
					}
				}
			});
			if(word.length===0){
				word = '…… ……';
			}
			str.replace(/\[(\d*):(\d*)([\.|\:]\d*)*\]/g, function() {
				var min = arguments[1] | 0, 
					sec = arguments[2] | 0, 
					time = min * 60 + sec,
					p = times.push(time * 1e3);
				words[times[--p]] = word.trim();
			});
			i++;
		}
		times.sort(function(a, b) {
			return a - b;
		});
		return {
			words: words,
			times: times,
			data:musicData
		};
	}
}
var Song = {
	// 选中音乐
	cur : function(){
		var cur = $(".song-list li.cur")
		if(cur.length == 0){
			cur = $(".song-list li").eq("0");
			$(".song-list li").eq("0").addClass("cur");
		}
		return cur;
	},
	// 下一首歌曲
	next : function(){	
		var cur = $(".song-list li.cur");
		if(cur.length == 0){
			cur = $(".song-list li").eq("0");
			$(".song-list li").eq("0").addClass("cur");
		}else{
			cur = $(".song-list li.cur").next("li")
			if(cur.length==0){
				cur = $(".song-list li").eq("0");
			}
		}
		return cur;
	},
	// 随机
	_random : function(){
		var n = parseInt(Math.random()*32);
		var cur = $(".song-list li").eq(n);
		console.log(cur);
		return cur;
	}
}
var Ctrl = {
	init : function(){
		// 滚动条实现
		$("#songContainer").perfectScrollbar();
		// 点击播放按钮
		$("#header").on("click", ".play",function(event){
			Audio.play();
		});
		// 点击暂停按钮
		$("#header").on("click", ".pause", function(event){
			Audio.pause();
		});
		// 点击下一首
		$("#header").on("click", ".next", function(event){
			Audio.nextSong();
		})
		// 点击静音
		$(".volume").click(function(){
			$(this).toggleClass("mute");
			Audio.mute();
		})
		// 修改音量
		$(".range").change(function(){
			Audio.setVolume($(this).val());
		})
		// 点击歌词按钮
		$(".lrc").click(function(){
			$("#lrcContainer,#songContainer").toggleClass("hide");
		})
		// 点击歌名
		$(".song-list").on("click", "li", function(event){
			$(".song-list li").removeClass("cur");
			$(this).addClass("cur");
			Audio.play();
		});
		// 点击进度
		$(".progress-bar b").click(function(e){
			var offset = $(".progress-bar b").offset(),
				width = e.pageX - offset.left,
				percent = width / 100,
				percent = percent.toFixed(2)*100;
			$(".progress").css("width",percent)
			// Audio.song.setPercent(percent);不支持
		});
		// 歌曲悬浮显示删除
		$(".song-list").on("mouseover","li",function(){
			$(this).find("p").hide();
			$(this).find("img").show();
		})
		$(".song-list").on("mouseout","li",function(){
			$(this).find("p").show();
			$(this).find("img").hide();
		})
		// 删除歌曲
		$(".song-list").on("click","img.trash",function(event){
			Audio.delete($(this).data("hash"));
			$(this).parent("li").remove();
			event.stopPropagation();
		})
		// 添加歌曲
		$(".song-list").on("click","img.add",function(event){
			Audio.add($(this).parent("li").data("song"));
			$(this).parent("li").remove();
			event.stopPropagation();
		})
		// 搜索歌词
		$(".search").keydown(function(event){
			if (event.keyCode == 13){ 
				$(".back").show();
				Kugou.search($(".search").val(),"search");
			}
		});
		// 回到首页
		$(".back").click(function(){
			Audio.init();
			$(".back").hide();
		})
		// 模式选择
		$(".play-mode").click(function(){
			$(this).siblings(".play-mode").removeClass("active");
			$(this).addClass("active");
		})
	}
}
$(function(){
	Audio.init();
	Ctrl.init();
})