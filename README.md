# audioextractor

AudioExtractor is an experiment/exercise to use node-ytdl-core library to have a microservice for extraction audio from video streams.

Audio extractor is ready to be deployed locally, in Docker containers or a Kubernetes cluter.

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


