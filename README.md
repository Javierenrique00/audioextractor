# audioextractor

AudioExtractor is a server that uses [node-ytdl-core](https://github.com/fent/node-ytdl-core) for playing videos in only audio mode, [node-ytsr](https://github.com/fent/node-ytdl-core) for youtube searchs and [node-ytpl](https://github.com/TimeForANinja/node-ytpl) for youtube playlist. The objetive is to have a microservice for audio extraction from video streams. It has a functional and usefull Android client called [Grabwaves](https://github.com/Javierenrique00/grabwaves).

Audioextractor can force transcoding of audio with the ffmpeg library using [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static)

Ready to be deployed locally, in docker containers or a Kubernetes cluster.

## Error in search videos / fixed playlist

- Playlist is fixed in version 1.4.0 -> update library node-ytpl to version 2.0.0-alpha.3
- Search is not working because a faulty library node-ytsr.

## Local installation.

Prerequisites:
node / npm

    npm install

    node index.js
  

## Docker installation

See docker hub: https://hub.docker.com/repository/docker/javierenrique00/audioextractor-js
Prerequisites:
Docker

    docker run --name myaudioextractor --restart always -p 2000:2000 -d javierenrique00/audioextractor-js:1.4.0


## Kubernetes installation
Kubernetes cluster with kubectl commnand

    kubectl apply -f kube     -->(To install)

    kubectl get services      -->(to see the external ip)

## EXTRACTING AUDIO

1- Install audioextractor server.
2- In the browser type: http://<SERVER_IP>:2000/?link=BASE64ENCODED_VIDEO_URL_PATH***&q=QUALITY&tran=BOOLEAN&PRE=BOOLEAN

__***Important Encoded64 is replacing the / and + characteres for - and _ characters because / character can mixed with a url path.__
        
        Example: http://192.168.0.68:2000/?link=aHR0cHM6Ly93d3cueW91dHViZS5jb20vd2F0Y2g-dj1SZFNyc09salZtbw==&q=lq&tran=false


        where Base64("https://www.youtube.com/watch?v=RdSrsOljVmo") = aHR0cHM6Ly93d3cueW91dHViZS5jb20vd2F0Y2g-dj1SZFNyc09salZtbw==
        
        - q -> QUALITY could be [lq,hq] to low quality and hq for high quality (default lq, opional)
        - tran -> TRANSCODE could be [true,false] for transcoding in the server. (default false, optional)
        - pre -> PRELOAD could be [true,false] for preloading. (default false, optional)

**Notes about transcoding:**
The obtained files without transcoding have better audio quality because comes from the origin without any manipulation, and also are available in the server faster because do not require local processing, but sometimes these files are not syncronic and you can not make partial downloads with the client (Grabwaves)

With transcoding, the files obtained are with some audio quality loss because are changed from the original format, takes more time in the server to be ready but are more compatible in some clients like Grabwaves.


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


## GETTING CONVERTED AUDIOFILES AND IN CONVERSION STATUS

To get the status of the conversions avalaible in the servers: http://<SERVER_IP>:2000/converted?file=FILEPARAMETER

Because the list of files could be large, the list can be filtered with the optional paramer file.

The response is a JSON with:

        {
        "complete": [
            "06298aad9d02fff5244d12c366120ca2lqt.opus",
            "402540b7942d6fae04ac40dbddad9a8fhqt.opus",
            "402540b7942d6fae04ac40dbddad9a8flqt.opus",
            "f3c93bb7d05a7f86e95a8c9cdd3c23b5lqf.opus",
            "f8f890052849dcf95cbe1cb12e40c96alqf.opus"
        ],
        "conversion": [{
            file:"06298aad9d02fff5244d12c366120ca2lqt.opus",
            msconverted: 13320500,
            sizeconverted: 0
            }]
        }

If the transcoding is in progress the sizeconverted is allways 0, and if no transcoding only give the size converted.

The file in the server has the following format:

        XXXXXXXXXXXXXQQT.opus

Where:

XXXXXXXXXXXXX is the MD5 hash in HEX of the url of the audio.

QQ -> can be "lq" or "hq" is the quality, low quality or hight quality of the audio available.

T -> Is transcoding active, could be "t"-> true or "f"-> false

**Parameter file**
Filter the list of complete files, but does not filter the list of conversion files. It´s useful for look for changes in the state of conversion advance wihout waste bandwith.

and all the files are encoded in .opus format.

Note: Files get purged 24 hours after the creation by default, you can change in the server file index.js in the contant: MAX_HOURS_FILES


## CONVERTING A FILE TO MP3

For compatibility a we can convert to mp3 format. Is not so optimal in size and quality but it works inmost of the devices. It adds metadata to title, artist and picture.

In the browser type: http://<SERVER_IP>:2000/tomp3?link=BASE64ENCODED_VIDEO_URL_PATH

To know if the conversion is complete check the conversion state to know if conversión is finish.



## GETTING A CONVERTED FILE

To get a converted file you only have to ask http://<SERVER_IP>:2000/download?file=FILEPARAMETER

FILEPARAMETER is not optional.

If the file is not found it returns "No file found" and 500 status message in the header.


## Android App

There is a free android App that you can use to use all the features of audioextractor server. You can play a playlist from youtube with only the link.

see:
https://github.com/Javierenrique00/grabwaves
