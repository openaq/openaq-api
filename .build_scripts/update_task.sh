#!/bin/bash
set -e

# Generate the appropriate command to use local env vars or a named AWS profile
# passed like sh .build_scripts/update_task.sh openaq (to be used locally)
aws="aws"
if [ ! -z "$1" ]
    then
        aws="aws --profile $1"
fi

# Use defaults if not set elsewhere
[ -z "$ECS_CLUSTER" ] && { ECS_CLUSTER="staging"; }
[ -z "$ENV_FILE" ] && { ENV_FILE="staging.env"; }
[ -z "$DESIRED_INSTANCE_COUNT" ] && { DESIRED_INSTANCE_COUNT=1; }

echo "Starting AWS ECS deploy for cluster $ECS_CLUSTER."
# This should be updated to check for running revision, not necessarily latest revision
RUNNING_SERVICE=$($aws ecs describe-services --services openaq-api --cluster $ECS_CLUSTER | jq '.services[0].taskDefinition' | grep -o "openaq-api:[0-9]\+")
TOTAL_VERSIONS=$($aws ecs describe-task-definition --task-definition openaq-api | jq '.taskDefinition.revision')
NEW_VERSION=$(($TOTAL_VERSIONS + 1))
# Grab the hash for the running service in case we don't have a new commit hash
# to use later.
CURRENT_HASH=$($aws ecs describe-task-definition --task-definition $RUNNING_SERVICE | jq '.taskDefinition.containerDefinitions[0].image' | tr -d '"')
export CURRENT_HASH=$CURRENT_HASH
echo "Current revision of ECS task is $RUNNING_SERVICE"
echo "New revision of ECS task will be $NEW_VERSION"
echo "Current Docker image is $CURRENT_HASH"

DESIRED_MINUS_ONE=$(($DESIRED_INSTANCE_COUNT - 1))
echo "Scaling current task down to $DESIRED_MINUS_ONE"
$aws ecs update-service --service openaq-api --cluster $ECS_CLUSTER --task-definition $RUNNING_SERVICE --desired-count $DESIRED_MINUS_ONE

echo "Waiting for down scaling to finish"
$aws ecs wait services-stable --services openaq-api --cluster $ECS_CLUSTER

echo "Copying env variables from S3"
$aws s3 cp s3://openaq-env-variables/openaq-api/$ENV_FILE local.env

echo "Building new ECS task"
node .build_scripts/insert-env.js
$aws ecs register-task-definition --cli-input-json file://ecs-task-generated.json

echo "Deploying 1 new ECS task "
$aws ecs update-service --service openaq-api --cluster $ECS_CLUSTER --task-definition openaq-api:$NEW_VERSION --desired-count 1

echo "Waiting for new task to be scaled up"
$aws ecs wait services-stable --services openaq-api --cluster $ECS_CLUSTER

echo "Bring new task up to full scaling"
$aws ecs update-service --service openaq-api --cluster $ECS_CLUSTER --task-definition openaq-api:$NEW_VERSION --desired-count $DESIRED_INSTANCE_COUNT

echo "Waiting for up scaling of all new tasks to finish"
$aws ecs wait services-stable --services openaq-api --cluster $ECS_CLUSTER
