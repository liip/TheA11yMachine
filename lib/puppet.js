'use esversion: 6';

const puppeteer = require('puppeteer');
const request = require('request');
const fetch = require("node-fetch");
var Logger = require('./logger');

const authCookieName = '_benchprep_session';

var userId = '827911';
var userAuthToken = 'pyjZrvfwvsUWFNFoWs1g';
var loginUrl = 'http://act.benchprep.localhost/api/v2/sessions/companion-auth';

var logger = new Logger({verbose: true});

var authRequestBody = {
  user_id: userId,
  user_auth_token: userAuthToken
};

var login = function (userId, authToken) {
  console.log('Authenticating before starting crawl process\n');
  var loginRequestOptions = {
    url: loginUrl,
    json: true,
    jar: true,
    body: authRequestBody
  };
  var a = request.post(loginRequestOptions, function optionalCallback(err, httpResponse, body) {
    if (err) {
      return console.error('Authentication request failed:', err);
    } else if (httpResponse.statusCode !== 200) {
      return console.error('Authentication request failed:', httpResponse.statusCode)
    }

    // callback(httpResponse.headers["set-cookie"]);
    console.log('got cookie', httpResponse.headers['set-cookie'])
    return httpResponse.headers["set-cookie"];
  });
};

const parseCookies = (rc) => {
  var list = {};

  rc && rc.split(';').forEach(function (cookie) {
    var parts = cookie.split('=');
    list[parts.shift().trim()] = decodeURI(parts.join('='));
  });

  return list;
};

const fetchAuthCookie = () => {
  return fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(authRequestBody)
    })
    .then(res => res.headers.get('set-cookie'))
    .then(parseCookies);
};

(async() => {
  const authCookie = await fetchAuthCookie();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    await page.setCookie({
      'name': authCookieName,
      'value': authCookie[authCookieName],
      path: '/',
      domain: 'act.benchprep.localhost',
      'expires': Date.now() / 1000 + 10,
      'httpOnly': true
    });


    var requestOptions = {
    	waitUntil: 'networkidle0'
    };

    await page.goto('http://act.benchprep.localhost/app/act-online-prep-tm', requestOptions);
    console.log(await page.cookies('http://act.benchprep.localhost/app/act-online-prep-tm'));

    await page.evaluate(() => {
      return document.querySelector('main.wrapper').innerHTML
    });

    const bodyHandle = await page.$('body');
    const html = await page.evaluate(body => body.innerHTML, bodyHandle);
    await bodyHandle.dispose();

    logger.write(logger.colorize.cyan(html));
  } catch (err) {
    console.log('error!!!!!', err);
  } finally {
    if (browser) {
      console.log('closing browser');
      await browser.close();
    }
  }
})();