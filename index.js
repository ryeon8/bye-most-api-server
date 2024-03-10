/**
 * mattermost 대화 이력 일괄 삭제 REST API.
 * 
 * @author r3n
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const { ApiHelper, ApiFacade } = require('./assets/js/api');

const app = express();
const env = process.env.NODE_ENV || 'dev';
dotenv.config({ path: `envs/${env}.env` });

const port = process.env.PORT;
const isLive = process.env.isLive;
const serviceDomain = process.env.domain;

app.use(isLive ? cors({ origin: serviceDomain }) : cors());
app.use(bodyParser.json());

/** access token 발행. */
app.post('/mattermost/api/access/token', async (req, res) => {
  const { id, pwd, serverInfo } = req.body;
  const result = await ApiFacade(serverInfo).getAccessToken(id, pwd);
  if (result.error) console.log(result.error);
  res.json(result.error ? { error: true } : result);
});

/** username 조회. 잘못된 id가 포함된 경우 해당 id 값을 null로 반환하므로 호출부에서 검증해서 써야한다. */
app.post('/mattermost/api/get/users/id', async (req, res) => {
  const { serverInfo, token, usernames } = req.body
  const result = await ApiFacade(serverInfo).getIds(token, usernames)
  res.json(result)
})

/** 대화 상대가 모두 참석한 채널 id 조회. */
app.post('/mattermost/api/get/channel/id', async (req, res) => {
  const { serverInfo, token, withIds } = req.body
  const channelId = await ApiFacade(serverInfo).getChannelId(token, withIds)
  res.json({ channelId: channelId })
})

/** channel에 등록된 post 목록 조회. */
app.post('/mattermost/api/get/posts/in/channel', async (req, res) => {
  const { serverInfo, token, channelId } = req.body
  const result = await ApiFacade(serverInfo).getPostsForChannel(token, channelId)
  res.json(result)
})

/** 포스트 1건 삭제 처리. */
app.post('/mattermost/api/do/delete/post', async (req, res) => {
  const { serverInfo, token, postId } = req.body
  const result = await ApiFacade(serverInfo).deletePost(token, postId)
  res.json(result)
})

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
