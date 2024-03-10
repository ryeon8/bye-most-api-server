/**
 * mattermost에서 제공하는 API 호출 facade.
 * 
 * @author r3n
 * @see https://api.mattermost.com/#tag/users/operation/Login
 * @see https://api.mattermost.com/#tag/users/operation/GetUsersByUsernames
 * @see https://api.mattermost.com/#tag/channels/operation/SearchGroupChannels
 * @see https://api.mattermost.com/#tag/channels/operation/CreateDirectChannel
 * @see https://api.mattermost.com/#tag/posts/operation/GetPostsForChannel
 * @see https://api.mattermost.com/#tag/posts/operation/DeletePost
 */

const axios = require('axios');

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
    /**
     * mattermost server access-token 조회.
     * call e.g. apiFacade.getAccessToken({로그인 계정}, {로그인 계정 비밀번호})
     * 
     * @param {string} loginId 로그인을 시도하려는 mattermost 계정
     * @param {string} pwd 계정 비밀번호
     * @return 
     *  성공: { myId: loginId의 mattermost 고유 ID, status: 통신 상태, token: access-token }
     *  실패: {error: e}
     */
    getAccessToken: (loginId, pwd) => {
      return new Promise((resolve, reject) => {
        const params = { "login_id": loginId.trim(), "password": pwd }
        axios.post(`${domain}/api/v4/users/login`, params)
          .then((res) => resolve({ token: res.headers.token, myId: res.data.id, status: 200 }))
          .catch((e) => resolve({ error: e }))
      })
    },
    /**
     * username을 이용해 mattermost 고유 ID 조회.
     * 
     * @param {string} token mattermost server access-token
     * @param {Array} usernames mattermost id를 조회하고 싶은 상대의 username 목록. (상대 태그 시 이용되는 값)
     * @returns 
     *  성공: { {[username]: mattermost id }, {}, ... }
     *  실패: { [mattermost id 조회 실패 username]: null }
     */
    getIds: async (token, usernames) => {
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
    },
    /**
     * 특정 사용자만 모두 참여한 채널 ID 조회.
     * 특정 사용자가 참여한 전체 채널이 아닌, 특정 사용자들이 '모두' 참여한 채널이므로 사용에 주의한다.
     * 
     * @param {string} token mattermost server access token
     * @param {Array<string>} withIds 대화에 참여한 전체 사용자의 mattermost id 목록. '전체' 사용자이므로 반드시 자신의 아이디도 함께 배열에 전달해야 한다.
     * @returns {string} channel id
     */
    getChannelId: (token, withIds) => {
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
    },
    /**
     * 특정 채널에 등록된 post 목록 조회. 60개씩 조회해서 반환한다.
     * 
     * @param {string} token mattermost server access token
     * @param {string} channelId mattermost channel id
     * @returns {Array} channelId에 해당하는 채널에 등록된 post 목록
     */
    getPostsForChannel: (token, channelId) => {
      return new Promise((resolve, reject) => {
        axios.get(`${domain}/api/v4/channels/${channelId}/posts`, apiHelper.headers(token))
          .then((res) => resolve(res.data.posts))
          .catch((e) => resolve({ error: true }))
      })
    },
    /**
     * mattermost 단일 포스트 삭제 처리.
     * 
     * @param {string} token mattermost server access token
     * @param {string} postId mattermost post id
     * @returns json 객체 반환 { success: boolean | 성공 여부, postId: 대화 포스트 ID }
     */
    deletePost: (token, postId) => {
      return new Promise((resolve, reject) => {
        axios.delete(`${domain}/api/v4/posts/${postId}`, apiHelper.headers(token))
          .then((res) => resolve({ success: true, postId: postId }))
          .catch((res) => resolve({ success: false, postId: res.postId, result: res.response?.statusText }))
      })
    }
  }
}

module.exports = { ApiHelper, ApiFacade };