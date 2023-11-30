FROM alpine

WORKDIR /kkbot-ts

RUN apk update && apk upgrade
RUN apk add nodejs npm

RUN npm install pnpm -g

ENTRYPOINT ["pnpm","run","docker"]