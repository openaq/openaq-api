#!/bin/bash
set -e

if [ -f $HOME/docker/openaq_api.tar ]
then
  echo "Loading cached worker image"
  docker load < $HOME/docker/openaq_api.tar
fi

touch local.env
docker-compose --project openaq build

mkdir -p $HOME/docker
echo "Caching openaq_api docker image."
docker save openaq_api > $HOME/docker/openaq_api.tar
