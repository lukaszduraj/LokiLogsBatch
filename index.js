import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

// Load configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.resolve(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const url = 'https://grafana-supervisor.z-dn.net/api/ds/query?ds_type=loki&requestId=explore_Vvt_1';
const rotateTokenUrl = 'https://grafana-supervisor.z-dn.net/api/user/auth-tokens/rotate';
let headers = {
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'no-cache',
  'content-type': 'application/json',
  'pragma': 'no-cache',
  'priority': 'u=1, i',
  'sec-ch-ua': '"Not/A)Brand";v="8", "Chromium";v="126"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'x-datasource-uid': 'PDA402C47918A135E',
  'x-grafana-device-id': 'dcc179ad5149ffa78d2bebe6f0385434',
  'x-grafana-org-id': '1',
  'x-panel-id': 'undefined',
  'x-plugin-id': 'loki',
  'x-query-group-id': '1eeb2caa-8ffc-4c9f-ba55-e391c30280d3',
  'cookie': config.cookie,
};

const logFilePath = path.resolve(__dirname, config.outputFileName);
const stateFilePath = path.resolve(__dirname, 'state.json');

const saveState = (state) => {
  fs.writeFileSync(stateFilePath, JSON.stringify(state));
};

const loadState = () => {
  if (fs.existsSync(stateFilePath)) {
    const state = fs.readFileSync(stateFilePath);
    return JSON.parse(state);
  }
  return null;
};

const parseCookie = (cookieString, cookieName) => {
  const match = cookieString.match(new RegExp(`(^| )${cookieName}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
};

const setCookiesFromHeaders = (setCookieHeaders) => {
  const cookies = setCookieHeaders.map(header => header.split(';')[0]).join('; ');
  headers['cookie'] = cookies;
};

const rotateAuthTokens = async () => {
  try {
    const response = await fetch(rotateTokenUrl, {
      method: 'POST',
      headers: headers,
    });

    if (!response.ok) {
      throw new Error('Failed to rotate auth tokens');
    }

    const setCookieHeaders = response.headers.raw()['set-cookie'];
    setCookiesFromHeaders(setCookieHeaders);
  } catch (error) {
    console.error('Error rotating auth tokens:', error);
    throw error;
  }
};

const checkSessionExpiry = async () => {
  const cookie = headers['cookie'];
  const sessionExpiry = parseCookie(cookie, 'grafana_session_expiry');
  if (!sessionExpiry) {
    throw new Error('grafana_session_expiry cookie is missing. Check your cookie in config.json.');
  }
  const expiryTime = parseInt(sessionExpiry, 10);
  const currentTime = Math.floor(Date.now() / 1000);
  if (expiryTime < currentTime) {
    throw new Error('grafana_session_expiry expired. Check your cookie in config.json.');
    // TODO rotation of the token is  not working as it returns 401
    // await rotateAuthTokens();
  }
};

const fetchData = async (from, to) => {
  await checkSessionExpiry();

  const body = JSON.stringify({
    'queries': [
      {
        'datasource': {
          'type': 'loki',
          'uid': 'PDA402C47918A135E',
        },
        'editorMode': 'builder',
        'expr': config.expr,
        'queryType': 'range',
        'refId': 'A',
        'maxLines': config.maxLines,
      },
    ],
    'from': `${from}`,
    'to': `${to}`,
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body,
    });
    const data = await response.json();
    if (data?.message === 'Unauthorized') {
      throw new Error('Unauthorized request. Please check your headers.');
    }
    const logs = data.results.A.frames[0].data.values[0].map(element => `${element.json_loggedAt}: ${element.json_message}`).flat();

    // Write logs to logs.txt
    fs.appendFileSync(logFilePath, logs.join('\n'));
    console.log(`Logs from ${new Date(from).toISOString()} to ${new Date(to).toISOString()} saved!`);
  } catch (error) {
    console.error('Error fetching data:', error);
    if (error.message === 'Unauthorized request. Please check your headers.') {
      throw error;
    }
  }
};

const fetchLogsInIntervals = async () => {
  let state = loadState();
  let from, to, currentTime, interval, startTime;

  if (state) {
    from = state.from;
    to = state.to;
    currentTime = state.currentTime;
    interval = state.interval;
  } else {
    currentTime = Date.now();
    interval = config.interval;
    startTime = new Date(config.startTime).getTime();
    from = startTime;
    to = from + interval;
  }

  while (from < currentTime) {
    await fetchData(from, to);
    from = to;
    to += interval;
    if (to > currentTime) {
      to = currentTime;
    }
    saveState({from, to, currentTime, interval});
  }

  console.log(`Finished fetching logs since ${config.startTime}.`);
};

const foo = async () => {
  try {
    await fetchLogsInIntervals();
  } catch (e) {
    console.error(e);
  }
};

foo();