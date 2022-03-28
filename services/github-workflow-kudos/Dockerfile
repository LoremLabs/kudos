# Container image that runs your code
FROM alpine:latest
RUN apk add --no-cache jq

# Copies your code file from your action repository to the filesystem path `/` of the container
COPY kudos.sh /kudos.sh

# Code file to execute when the docker container starts up (`entrypoint.sh`)
ENTRYPOINT ["/kudos.sh"]
