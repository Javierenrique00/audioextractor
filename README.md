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

    docker run --name myaudioextractor --restart always -p 2000:2000 -d javierenrique00/audioextractor-js:1.2.7


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

## SEARCHING FOR VIDEOS BY DESCRIPTION OR CHANNEL

With the server running go to thr following route: http://<SERVER_IP>:2000/search/?question=BASE64ENCODED_VIDEO_URL_PATH&limit=XX

        "query": "Queenxxx",
        "currentRef": "https://www.youtube.com/results?search_query=cggggggEgIQAQ%253D%253D",
        "items": [
            {
            "type": "video",
            "live": false,
            "title": "XXXXX TITLE",
            "link": "https://www.youtube.com/watch?v=LjhgggNtRIYxsI",
            "thumbnail": "https://i.ytimg.com/vi/LjhNtRhhhhsI/hqdefault.jpg?sqp=-oaymwEjCPYBEIoBSFrhhhhpAxUIARUAAAAAGAElAADIQj0AgKJDeAE=&rs=AOn4CLDUoqxWsW5f9Cr4e5L3BZPZFr_96Q",
            "author": {
                "name": "YYYYYYY",
                "ref": "https://www.youtube.com/channel/UCYxixhfkXxp2hhhqJyg",
                "verified": false
            },
            "description": "xxxxxx: ...",
            "views": 39622,
            "duration": "16:22",
            "uploaded_at": "1 year ago"
            },
            {
            "type": "video",
            "live": false,
            "title": " fdfffffffto",
            .....
            .....
            .....
        "results": "0",
        "filters": [
            {
            "ref": null,
            "name": "Video",
            "active": true
            },
            {
            "ref": null,
            "name": "Relevance",
            "active": true
            }
        ],
        "nextpageRef": "/results?search_query=cxxxxxxxgIQAQ%253D%253D&page=2"
        }

## GETTING PLAYLIST DATA

To get playlist data go to the following route: http://<SERVER_IP>:2000/pl?link=BASE64ENCODED_PLAYLIST_URL

For example:  http://XX.XX.XX.XX:2000/pl?link=aHR0cHM6Ly93d3cueW91dHViZS5jb20vcGxheWxpc3Q/bGlzdD1QTDJKdHZ5a3JpZVV5S2ZFc0lMT20xS0wwMlRaeVVCVGRI

The response is:

        {
        "id": "PL2JtvykrieUyKfEsILOm1KL02TZyUBTdH",
        "url": "https://www.youtube.com/playlist?list=PL2JtvykrieUyKfEsILOm1KL02TZyUBTdH",
        "title": "ADELE - 19",
        "total_items": 4,
        "items": [
            {
            "url": "https://www.youtube.com/watch?v=08DjMT-qR9g",
            "title": "Adele - Chasing Pavements",
            "thumbnail": "https://i.ytimg.com/vi/08DjMT-qR9g/hqdefault.jpg",
            "duration": 221,
            "author": "Adele"
            },
            {
            "url": "https://www.youtube.com/watch?v=BW9Fzwuf43c",
            "title": "Adele - Hometown Glory",
            "thumbnail": "https://i.ytimg.com/vi/BW9Fzwuf43c/hqdefault.jpg",
            "duration": 216,
            "author": "Adele"
            },
            {
            "url": "https://www.youtube.com/watch?v=0put0_a--Ng",
            "title": "ADELE - 'Make You Feel My Love'",
            "thumbnail": "https://i.ytimg.com/vi/0put0_a--Ng/hqdefault.jpg",
            "duration": 247,
            "author": "XL Recordings"
            },
            {
            "url": "https://www.youtube.com/watch?v=uGwH-x4VoH8",
            "title": "ADELE - 'Cold Shoulder'",
            "thumbnail": "https://i.ytimg.com/vi/uGwH-x4VoH8/hqdefault.jpg",
            "duration": 192,
            "author": "XL Recordings"
            }
        ]
        }

## Android App

There is a free android App that you can use to invoque the audioextractor server.

see:
https://github.com/Javierenrique00/grabwaves
