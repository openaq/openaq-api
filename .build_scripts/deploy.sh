#!/bin/bash
set -e

docker login -e="$DOCKER_EMAIL" -u="$DOCKER_USERNAME" -p="$DOCKER_PASSWORD"

echo "Pushing image: developmentseed/openaq-api:$TRAVIS_COMMIT"
docker tag openaq_api flasher/openaq-api:$TRAVIS_COMMIT
docker push flasher/openaq-api:$TRAVIS_COMMIT

# Only push to latest if this is production branch
if [[ $TRAVIS_BRANCH == ${PRODUCTION_BRANCH} ]]; then
  echo "Also pushing as :latest"
  docker tag openaq_api flasher/openaq-api:latest
  docker push flasher/openaq-api:latest

  # And set some vars for the update_task script
  export ECS_CLUSTER="default"
  export ENV_FILE="production.env"
  export DESIRED_INSTANCE_COUNT=2
fi

echo "Installing aws cli"
sudo pip install awscli

echo "Running the update_task script"
sh .build_scripts/update_task.sh
