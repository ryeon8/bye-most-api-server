// const domain = 'http://192.168.0.17:8065'
// const domain = 'http://localhost:8065'

const axios = require('axios')

const ApiHelper = (domain) => {
	function headers(token) {
		return { headers: { 'Authorization': `Bearer ${token}`, pragma: 'no-cache', 'cache-control': 'no-cache' } }
	}

	function isMyPost(myId, post) {
		return post.user_id == myId
	}

	function filterMyPosts(myId, posts) {
		return Object.keys(posts)
			.map(key => posts[key])
			.filter(post => isMyPost(myId, post))
	}

	return {
		headers: headers, isMyPost: isMyPost, filterMyPosts: filterMyPosts
	}
}

const ApiFacade = (domain) => {
	const apiHelper = ApiHelper(domain)
	return {
		getAccessToken: (loginId, pwd) => {
			// return { myId: "", status: , token: "" }
			// example.
			// apiFacade.getAccessToken(inputValue.account, inputValue.pwd)
			return new Promise((resolve, reject) => {
				const params = { "login_id": loginId.trim(), "password": pwd }
				axios.post(`${domain}/api/v4/users/login`, params)
					.then((res) => resolve({ token: res.headers.token, myId: res.data.id, status: 200 }))
					.catch((e) => resolve({ error: e }))
			})
		}, getIds: async (token, usernames) => {
			// return { username: id, username: id, ... }
			// example.
			// const withUsername = 'taeseong'
			// const myInfo = await apiFacade.getAccessToken(inputValue.account, inputValue.pwd)
			// const withIdInfo = await apiFacade.getIds(myInfo.token, [withUsername])
			// OR token을 이미 가지고 있다면 아래처럼 한 줄로도 호출 가능.
			// apiFacade.getIds('7nggdm36sbnstqwg45pwyi3nxw', ['taeseong', 'ryeon530']).then((res) => console.log(res))
			return new Promise((resolve, reject) => {
				Promise.all([].concat(usernames).map((username) => axios.get(`${domain}/api/v4/users/username/${username}`, apiHelper.headers(token))))
					.then((ress) => {
						let emailAndIdMap = ress.map((res) => {
							return { [res.data.username]: res.data.id }
						}).reduce((acc, curr) => Object.assign(acc, curr), {})
						resolve(emailAndIdMap)
					}).catch((e) => {
						const failedUsername = e.config.url.substring(e.config.url.lastIndexOf('/') + 1, e.config.url.length)
						resolve({ [failedUsername]: null })
					})
			})
		}, getChannelId: (token, withIds) => {
			// return channelId
			// example)
			// apiFacade.getAccessToken(inputValue.account, inputValue.pwd)
			// 	.then((res) => apiFacade.getChannelId(res.token, 'torm8nfx7i8r8n5djo3himo4tc', 'dkkkqc1xhjnpbgahn6fot6ot1a'))
			// 	.then((res) => console.log(res))
			return new Promise((resolve, reject) => {
				if (withIds instanceof Array && withIds.length > 2) { // 3명 이상 개인 대화 채널 id 조회 api.
					axios.post(`${domain}/api/v4/channels/group`, withIds, apiHelper.headers(token))
						.then((res) => resolve(res.data.id))
						.catch((e) => resolve(null))
				} else { // 2명 이하 개인 대화 채널 id 조회 api.
					axios.post(`${domain}/api/v4/channels/direct`, withIds, apiHelper.headers(token))
						.then((res) => resolve(res.data.id))
						.catch((e) => resolve(null))
				}
			})
		}, getPostsForChannel: (token, channelId) => {
			// return [{post, post, post, ...}]
			// example.
			// const withUsername = 'taeseong'
			// const myInfo = await apiFacade.getAccessToken(inputValue.account, inputValue.pwd)
			// const withIdInfo = await apiFacade.getIds(myInfo.token, [withUsername])
			// const channelId = await apiFacade.getChannelId(myInfo.token, myInfo.myId, withIdInfo[withUsername])

			return new Promise((resolve, reject) => {
				axios.get(`${domain}/api/v4/channels/${channelId}/posts`, apiHelper.headers(token))
					.then((res) => resolve(res.data.posts))
					.catch((e) => resolve({ error: true }))
			})
		}, deletePost: (token, postId) => {
			// return { success: boolean, postId: post.id }
			// example.
			// const withUsername = 'taeseong'
			// const myInfo = await apiFacade.getAccessToken(inputValue.account, inputValue.pwd)
			// const withIdInfo = await apiFacade.getIds(myInfo.token, [withUsername])
			// const channelId = await apiFacade.getChannelId(myInfo.token, myInfo.myId, withIdInfo[withUsername])
			// const posts = await apiFacade.getPostsForChannel(myInfo.token, channelId)
			// const myPosts = apiHelper.filterMyPosts(myInfo.myId, posts)

			return new Promise((resolve, reject) => {
				axios.delete(`${domain}/api/v4/posts/${postId}`, apiHelper.headers(token))
					.then((res) => resolve({ success: true, postId: postId }))
					.catch((res) => resolve({ success: false, postId: res.postId, result: res.response?.statusText }))
			})
		}
	}
}

module.exports = { ApiHelper, ApiFacade };