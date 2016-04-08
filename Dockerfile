FROM node

RUN npm install -g phantomjs
RUN npm install the-a11y-machine

ENTRYPOINT ["/node_modules/.bin/a11ym"]
