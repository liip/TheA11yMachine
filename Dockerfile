FROM node:5

ENV NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_PROGRESS=false \
    NPM_CONFIG_SPIN=false

RUN npm install -g phantomjs-prebuilt the-a11y-machine

ENTRYPOINT ["a11ym"]
