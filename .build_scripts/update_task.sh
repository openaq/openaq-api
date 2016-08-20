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
[ -z "$MINIMUM_HEALTHY_PERCENT" ] && { MINIMUM_HEALTHY_PERCENT=0; }

echo "Starting AWS ECS deploy for cluster $ECS_CLUSTER."

echo "Copying env variables from S3"
$aws s3 cp s3://openaq-env-variables/openaq-api/$ENV_FILE local.env

echo "Building new ECS task"
node .build_scripts/insert-env.js
$aws ecs register-task-definition --cli-input-json file://ecs-task-generated.json

# Wait a few seconds just to make sure newly registered task is active
sleep 5

echo "Updating service definition with new task"
$aws ecs update-service --service openaq-api --cluster $ECS_CLUSTER --task-definition openaq-api --desired-count $DESIRED_INSTANCE_COUNT --deployment-configuration maximumPercent=200,minimumHealthyPercent=$MINIMUM_HEALTHY_PERCENT
