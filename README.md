# audioextractor

AudioExtractor is an experiment/exercise to use node-ytdl-core library to have a microservice for audio extraction from video streams.

Ready to be deployed locally, in docker containers or a Kubernetes cluster.

## Local installation.

Prerequisites:
node / npm

    npm install

    node index.js
  

## Docker installation

See docker hub: https://hub.docker.com/repository/docker/javierenrique00/audioextractor-js
Prerequisites:
Docker

    docker run --name myaudioextractor --rm -p 2000:2000 -d javierenrique00/audioextractor-js:1.0.1


## Kubernetes installation
Kubernetes cluster with kubectl commnand

    kubectl apply -f kube     -->(To install)

    kubectl get services      -->(to see the external ip)

## USE

1- Install audioextractor server.
2- In the browser type: http://<SERVER_IP>:2000/?link=<BASE64ENCODED_VIDEO_URL_PATH>
        
        Example: http://192.168.0.68:2000/?link=aHR0cHM6Ly93d3cueW91dHViZS5jb20vd2F0Y2g/dj1SZFNyc09salZtbw==
        where Base64("https://www.youtube.com/watch?v=RdSrsOljVmo") = aHR0cHM6Ly93d3cueW91dHViZS5jb20vd2F0Y2g/dj1SZFNyc09salZtbw==
        
3- The browser shows a player with the audio.

![Img](/doc/imgs/img1.jpg)


## Android App

There is a small free android App that you can use to invoque the audioextractor server.

see:
https://github.com/Javierenrique00/grabwaves
