FROM node:8.14.0-alpine as basis

WORKDIR /opt/iot-agent

RUN apk add git python make bash gcc g++ zeromq-dev musl-dev zlib-dev krb5-dev --no-cache

COPY package.json .
COPY package-lock.json .

RUN npm install
COPY . .

FROM node:8.14.0-alpine
RUN apk add python py-openssl py-requests --no-cache
COPY --from=basis  /opt/iot-agent /opt/iot-agent
RUN mkdir -p /opt/iot-agent/mosca/certs/
WORKDIR /opt/iot-agent


EXPOSE 8883
EXPOSE 1883
CMD ["/opt/iot-agent/entrypoint.sh"]
