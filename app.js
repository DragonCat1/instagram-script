"use strict"
let fs = require('fs')
let request = require("request")
let random = require("random-js")
let config = require("./config.json")

let log = function(m){
	console.log(`${(new Date()).toLocaleTimeString()}`,m)
}
let ran = new random(random.engines.mt19937().autoSeed())
let headers = {
	"Cookie":config.cookie,
	"Origin":"https://www.instagram.com",
	"Referer":"https://www.instagram.com/",
	"X-Csrftoken":config.token,
	"x-instagram-ajax":"1",
	"x-requested-with":"XMLHttpRequest",
	"user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36"
}
let {cursor,tag} = config
let likeList = []
let like = function(){
	let formData = {}
	if(cursor == ''){
		formData = {q:`ig_hashtag(${tag}){media.first(50){count,nodes{__typename,caption,code,comments{count},comments_disabled,date,dimensions{height,width},display_src,id,is_video,likes{count,viewer_has_liked},owner{id},thumbnail_src,video_views},page_info}}`}
	}
	else{
		formData = {q:`ig_hashtag(${tag}){media.after(${cursor},50){count,nodes{__typename,caption,code,comments{count},comments_disabled,date,dimensions{height,width},display_src,id,is_video,likes{count,viewer_has_liked},owner{id},thumbnail_src,video_views},page_info}}`}
	}
	request({
		method:'POST',
		url:'https://www.instagram.com/query/',
		json:true,
		headers:headers,
		form:formData
	},function(e,r,b){
		if(!e&&r.statusCode===200){
			cursor = b.media.page_info.end_cursor?b.media.page_info.end_cursor:""
			config.cursor = cursor
			fs.writeFile("config.json",JSON.stringify(config))
			let count = 0
			for(let n of b.media.nodes){
				if(!n.likes.viewer_has_liked){
					likeList.push(n.id)
					count++
				}
			}
			log(`Pushed ${count} in preLike list Last cursor is ${cursor} List size is ${likeList.length}`)
			if(likeList.length){
				doLike()
			}
			else{
				setTimeout(like,2000)
			}
		}
		else if(e){
			console.log(e)
			setTimeout(like,900000)
		}
		else{
			console.log(b)
			setTimeout(like,900000)
		}
	})
}
let likedCount = 0
let totalLikedCount = 0
let sTime = (new Date()).getTime()
let doLike = function(){
	if(likeList.length){
		request({
			method:'POST',
			url:`https://www.instagram.com/web/likes/${likeList[0]}/like/`,
			json:true,
			headers:headers
		},function(e,r,b){
			if(!e&&r.statusCode===200){
				if(b.status=='ok'){
					likedCount++
					totalLikedCount++
					log(`Liked:${likeList[0]} List size is ${likeList.length-1} Speed ${(totalLikedCount/((new Date()).getTime()-sTime)*1000*60*60).toFixed(3)}/hour`)
					likeList.shift()
				}
				else{
					log(b)
				}
				if(likedCount>300){
					likedCount = 0
					log(`中场休息...`)
					setTimeout(doLike,120000)
				}
				else{
					setTimeout(doLike,ran.integer(15000,60000))
				}
			}
			else if(e){
				console.log(e)
				setTimeout(doLike,900000)
			}
			else{
				console.log(b)
				setTimeout(doLike,900000)
			}
		})
	}
	else{
		like()
	}
}
let followList = []
let followCount = 0
let totalFollowCount = 0
let followCursor = ''
let follow = function(){
	let formData
	if(followCursor == ''){
		formData = {q:`ig_hashtag(${tag}){media.first(50){count,nodes{owner{id,followed_by_viewer}},page_info}}`}
	}
	else{
		formData = {q:`ig_hashtag(${tag}){media.after(${followCursor},50){count,nodes{owner{id,followed_by_viewer}},page_info}}`}
	}
	request({
		method:'POST',
		url:'https://www.instagram.com/query/',
		json:true,
		headers:headers,
		form:formData
	},function(e,r,b){
		if(!e&&r.statusCode===200){
			followCursor = b.media.page_info.end_cursor?b.media.page_info.end_cursor:''
			let count = 0
			for(let n of b.media.nodes){
				if(!n.owner.followed_by_viewer){
					followList.push(n.owner.id)
					count++
				}
			}
			log(`Pushed ${count} in preFollow List Size is ${followList.length}`)
			if(followList.length){
				doFollow()
			}
			else{
				setTimeout(follow,2000)
			}
		}
		else if(e){
			console.log(e)
			setTimeout(follow,900000)
		}
		else{
			console.log(b)
			setTimeout(follow,900000)
		}
	})
}
let doFollow = function(){
	if(followList.length){
		request({
			method:'POST',
			url:`https://www.instagram.com/web/friendships/${followList[0]}/follow/`,
			json:true,
			headers:headers
		},function(e,r,b){
			if(!e&&r.statusCode===200){
				if(b.status=='ok'&&b.result=='following'){
					followCount++
					totalFollowCount++
					config.follows.push(followList[0])
					fs.writeFile("config.json",JSON.stringify(config))
					log(`Followed:${followList[0]} List size is ${followList.length-1} Speed ${(totalFollowCount/((new Date()).getTime()-sTime)*1000*60*60).toFixed(3)}/hour`)
					followList.shift()
				}
				else{
					console.log(b)
				}
				if(followCount>300){
					followCount = 0
					log(`中场休息...`)
					setTimeout(doFollow,1000000)
				}
				else{
					setTimeout(doFollow,ran.integer(260000,460000))
				}
			}
			else if(e){
				console.log(e)
				setTimeout(doFollow,460000)
			}
			else{
				console.log(b)
				setTimeout(doFollow,460000)
			}
		})
	}
	else{
		follow()
	}
}
let totalUnfollowCount = 0
var unFollow = function(){
	if(config.follows.length){
		request({
			method:'POST',
			url:`https://www.instagram.com/web/friendships/${config.follows[0]}/unfollow/`,
			json:true,
			headers:headers
		},function(e,r,b){
			if(!e&&r.statusCode===200){
				if(b.status=='ok'){
					totalUnfollowCount++
					log(`Unfollowed:${config.follows[0]} Followed size is ${config.follows.length-1} Speed ${(totalUnfollowCount/((new Date()).getTime()-sTime)*1000*60*60).toFixed(3)}/hour`)
					config.follows.shift()
					fs.writeFile("config.json",JSON.stringify(config))
				}
				else{
					console.log(b)
				}
				setTimeout(unFollow,ran.integer(260000,460000))
			}
			else if(e){
				console.log(e)
				setTimeout(unFollow,460000)
			}
			else{
				console.log(b)
				console.log(config.follows[0])
				setTimeout(unFollow,460000)
			}
		})
	}
}
like()
follow()
//unFollow()
