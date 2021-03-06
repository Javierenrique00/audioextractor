var express = require('express')
var app = express()
const ytdl = require('ytdl-core')
var ffmpeg = require('ffmpeg-static')
const cp = require('child_process')
const path = require('path')
const fs = require('fs')
const fetch = require('node-fetch')
const MP3Tag = require('mp3tag.js')
var crypto = require('crypto')

const BASE_AUDIO_PATH = "audio"
const BASE_IMG_PATH = "thumbnail"

   
exports.convert = function(address,res,convCache){
    let hash = createHash(address) + ".mp3"
    if(convCache.has(hash)){
        sendMsg(res,"inprocess")
    }else if(fileExist(hash)) {
        sendMsg(res,"ready")
    }else{
        sendMsg(res,"inprocess")
        getBasicInfo(address,res,convCache,hash)
    }
}

function fileExist(hash){
    createDir(BASE_AUDIO_PATH)
    let fileLocalPath = BASE_AUDIO_PATH + path.sep + hash
    return (fs.existsSync(fileLocalPath))
}

function sendMsg(res,resp){
    res.end(resp)
}

function convertToAudioFile(address,res,videoInfo,thumbnailFileName,convCache){

    let hash = createHash(address) + ".mp3"
    let fileLocalPath = BASE_AUDIO_PATH + path.sep + hash
    let thumbnailPath = BASE_IMG_PATH + path.sep + thumbnailFileName

    console.log("thumbnail in:"+thumbnailPath)

    calidad = 'highestaudio'
        
    console.log('Asking for video:' + address)
            
    let audioStream = ytdl(address,{ filter: 'audioonly' , quality: calidad})
            
    //---pipe:3->progress  pipe:4->audioDeYoutube  pipe:5->out. 
    let convProcess = cp.spawn(ffmpeg, [
        '-loglevel', '0', '-hide_banner',
        '-progress', 'pipe:3',
        '-i', 'pipe:4',
        '-f', 'mp3', 'pipe:5',
    ], {
        windowsHide: true,
        stdio: [
        'inherit', 'inherit', 'inherit',
        'pipe', 'pipe', 'pipe',
        ],
    })
    
    convProcess.on('close',()=>{
        convCache.del(hash)
    })
   
    convProcess.stdio[3].on('data', chunk => {
        let lines = chunk.toString().trim().split('\n');
        let args = {};
        for (const l of lines) {
          let [key, value] = l.trim().split('=');
          args[key] = value;
        }
        convCache.set(hash,{ms:args["out_time_ms"],timeSet:Date.now(),file:fileLocalPath,size:0})
    })
    
    audioStream.pipe(convProcess.stdio[4])

    let mp3Stream = fs.createWriteStream(fileLocalPath)
    convProcess.stdio[5].pipe(mp3Stream)

    mp3Stream.on('finish',function (){
        mp3Stream.close(addMetadata(fileLocalPath,thumbnailPath,videoInfo))
    })
}

function addMetadata(fileLocalPath,thumbnailPath,videoInfo){

    fs.readFile(thumbnailPath,function (err,data){
        if(err){
            console.log("Error reading thumbnail file:"+thumbnailPath)
        }else{
            let imgBuffer = Buffer.from(data)

            let format = formatImg(thumbnailPath)

            console.log("thumbnail:"+ thumbnailPath +"  format:"+format)
        
            //let buffer = fs.readFileSync(fileLocalPath)
            fs.readFile(fileLocalPath,function(error,buffer){
                if(error){
                    console.log("Error reading music file:"+fileLocalPath)
                }else{
                    let mp3tag = new MP3Tag(buffer,false)
                    mp3tag.read({
                        id3v1: false // Ignore ID3v1 tags when reading
                      })
                    //console.log(mp3tag.tags)
                
                    mp3tag.tags.title = videoInfo.title
                    mp3tag.tags.artist = videoInfo.channel
                    mp3tag.tags.comment = 'Cover (front)'
                

                    mp3tag.tags.v2.APIC = [{
                        "format": format,
                        type: 3,
                        description: 'Cover',
                        data: imgBuffer
                        }]
                
                    mp3tag.save({
                        strict: true, // Strict mode, validates all inputs against the standards. See id3.org
                        // ID3v2 Options
                        id3v2: { padding: 4096 }
                      })
                    if(mp3tag.errorCode > -1){
                        console.log("-----------error writting Metadata")
                    }else{
                        let metadataPath = fileLocalPath
                        fs.writeFile(metadataPath,Buffer.from(mp3tag.buffer),function(err){
                            if(err){
                                console.log("-----------error writting file metadata")
                            }
                        })
                    }
                }
            })

        }
    })
}

function formatImg(thumbnailPath){
    let format = "image/"
 
    switch(getFileExtension(thumbnailPath)){
        case "jpg":
            format = "image/jpeg"
        break;
        case "jpeg":
            format = "image/jpeg"
        break;
        case "png":
            format = "image/png"
        break;
    }
    return format
}


function getBasicInfo(address,res,convCache,hash){
    let fileLocalPath = BASE_AUDIO_PATH + path.sep + hash
    convCache.set(hash,{ms:0,timeSet:Date.now(),file:fileLocalPath,size:0})
    let info = ytdl.getBasicInfo(address)
    
    info.then(
        result =>{
            let videoDetails = result.videoDetails
            let duracionSeg = parseInt( videoDetails.lengthSeconds)
            if(isNaN(duracionSeg)) duracionSeg = 0 //--asegurarse que es un numero
            let videoInfo = {title:videoDetails.title.slice(0,30),  //--debe ser menor a 30
                 channel:videoDetails.ownerChannelName.slice(0,30),
                 thumbnailUrl:videoDetails.thumbnail.thumbnails[0].url,
                 duration:duracionSeg}
                 
            console.log("videoInfo="+JSON.stringify(videoInfo))
            let ext = getFileExtension(videoInfo.thumbnailUrl)
            let addExt = ".jpg"
            if(ext.includes("png")) addExt = ".png"
            let thumbnailFileName = createHash(address) + addExt
        
            loadThumbnail(videoInfo.thumbnailUrl,thumbnailFileName,function (){
                convertToAudioFile(address,res,videoInfo,thumbnailFileName,convCache)
            })
        }
    )
}

function loadThumbnail(url,file,cb){
    let fullFilename = BASE_IMG_PATH + path.sep + file
    createDir(BASE_IMG_PATH)
    
    fetch(url)
    .then(out => {
        console.log("Writting thumbnail:"+fullFilename)
        const dest = fs.createWriteStream(fullFilename)
        out.body.pipe(dest)

        dest.on('finish',function (){
            dest.close(cb)
        })
    })
}


const createDir = (dirPath) => {
    fs.mkdirSync(process.cwd() + path.sep + dirPath, { recursive: true}, (error) => {
        if(error) {
            console.error('Error creating directory:'+dirPath)
        } else{
            console.log('Audio directory created:'+dirPath)
        }

    })
}

function getFileExtension(fileName){
    return fileName.split('.').pop().toLowerCase()
}

function createHash(data){
    return crypto.createHash('md5').update(data).digest("hex")

}
