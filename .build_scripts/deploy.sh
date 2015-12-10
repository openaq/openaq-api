#!/bin/bash
set -e

if [[ $TRAVIS_PULL_REQUEST == "false" && $TRAVIS_BRANCH == ${PRODUCTION_BRANCH} ]]; then
  docker login -e="$DOCKER_EMAIL" -u="$DOCKER_USERNAME" -p="$DOCKER_PASSWORD"

  echo "Pushing image: developmentseed/openaq-api:$TRAVIS_COMMIT"
  docker tag openaq_api flasher/openaq-api:$TRAVIS_COMMIT
  docker push flasher/openaq-api:$TRAVIS_COMMIT
  echo "Also pushing as :latest"
  docker tag openaq_api flasher/openaq-api:latest
  docker push flasher/openaq-api:latest

  echo "Installing aws cli"
  sudo pip install awscli

  echo "Getting the revision of the old task"
  # This should be updated to check for running revision, not necessarily latest revision
  OLD_VERSION=$(aws ecs describe-task-definition --task-definition openaq-api | sed -n "/revision/p" | grep -o "[0-9]\+")
  NEW_VERSION=$(($OLD_VERSION + 1))
  echo "Current revision of ECS task is $OLD_VERSION"

  echo "Scaling current task down to 1"
  aws ecs update-service --service openaq-api --task-definition openaq-api:$OLD_VERSION --desired-count 1

  echo "Waiting for down scaling to finish"
  aws ecs wait services-stable --services openaq-api

  echo "Copying env variables from S3"
  aws s3 cp s3://openaq-env-variables/openaq-api/production.env local.env

  echo "Building new ECS task"
  node .build_scripts/insert-env.js
  aws ecs register-task-definition --cli-input-json file://ecs-task-generated.json

  echo "Deploying 1 new ECS task "
  aws ecs update-service --service openaq-api --task-definition openaq-api:$NEW_VERSION --desired-count 1

  echo "Waiting for new task to be scaled up"
  aws ecs wait services-stable --services openaq-api

  echo "Bring new task up to full scaling"
  aws ecs update-service --service openaq-api --task-definition openaq-api:$NEW_VERSION --desired-count 2

  echo "Waiting for up scaling of all new tasks to finish"
  aws ecs wait services-stable --services openaq-api
else
  echo "Not a push; nothing to do"
fi
