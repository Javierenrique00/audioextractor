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

    docker run --name myaudioextractor --rm -p 2000:2000 -d javierenrique00/audioextractor-js:1.0.8


## Kubernetes installation
Kubernetes cluster with kubectl commnand

    kubectl apply -f kube     -->(To install)

    kubectl get services      -->(to see the external ip)

## EXTRACTING AUDIO

1- Install audioextractor server.
2- In the browser type: http://<SERVER_IP>:2000/?link=BASE64ENCODED_VIDEO_URL_PATH***&q=QUALITY

__***Important Encoded64 is replacing the / and + characteres for - and _ characters because / character can mixed with a url path.__
        
        Example: http://192.168.0.68:2000/?link=aHR0cHM6Ly93d3cueW91dHViZS5jb20vd2F0Y2g-dj1SZFNyc09salZtbw==&q=lq
        where Base64("https://www.youtube.com/watch?v=RdSrsOljVmo") = aHR0cHM6Ly93d3cueW91dHViZS5jb20vd2F0Y2g-dj1SZFNyc09salZtbw==
        
        QUALITY could be [lq,hq] to low quality and hq for high quality

3- The browser shows a player with the audio.

![Img](/doc/imgs/img1.jpg)

## EXTRACTING VIDEO INFO AND RELATED VIDEOS

1- With the server installed and running goes to the info Route:  http://<SERVER_IP>:2000/info?link=BASE64ENCODED_VIDEO_URL_PATH
2- You receive a Json data with the following information.

        {
        "title":"We fixed Windows 10 - Microsoft will HATE this!",
        "channel":"Linus Tech Tips",
        "thumbnailUrl":"https://i.ytimg.com/vi/nwkiU6GG-YU/hqdefault.jpg?sqp=-oaymwEiCKgBEF5IWvKriqkDFQgBFQAAAAAYASUAAMhCPQCAokN4AQ==&rs=AOn4CLDXmkGZTBOjmYkBxGABrat8viNZrA",
        "width":168,
        "height":94,
        "duration":"1016",
        "related":[
            {
                "id":"Lzf1Pg9kfu4",
                "title":"Game Theory: Dear Fall Guys, I Fixed Your Game!",
                "author":"The Game Theorists",
                "duration":1009
            },
            {
                "id":"ntXj6EJgh0c",
                "title":"Confused about NVIDIA’s new video cards? You’re not alone",
                "author":"JayzTwoCents",
                "duration":1271
            },
                ...
                ...
                
        ]
        }



## Android App

There is a small free android App that you can use to invoque the audioextractor server.

see:
https://github.com/Javierenrique00/grabwaves
