# audioextractor

AudioExtractor is an experiment/exercise to use node-ytdl-core library to have a microservice for audio extraction from video streams.

Ready to be deployed locally, in docker containers or a Kubernetes cluster.

## Local installation.

Prerequisites:
node / npm

    npm install

    node index.js
  

## Docker installation

Prerequisites:
Docker

    docker run --name myaudioextractor --rm -p 2000:2000 -d javierenrique00/audioextractor-js:1.0.1


## Kubernetes installation
Kubernetes cluster with kubectl commnand

    kubectl apply -f kube

    kubectl get services      -->(to see the external ip)

## USE

From a browser



