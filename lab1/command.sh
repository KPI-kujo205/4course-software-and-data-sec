#/bin/bash

docker run -it --rm \
  --platform linux/amd64 \
  -v "$(pwd):/app" \
  --env-file .env \
  snyk/snyk:node snyk test
