//-- Thanks to the Library: https://github.com/fent/node-ytdl-core

var express = require('express')
var app = express()
const fs = require('fs')
const path = require('path')
const ytdl = require('ytdl-core')
var crypto = require('crypto')
var moment = require('moment')
const { get } = require('http')

const BASE_AUDIO_PATH = "audio"
const PORT = 2000
const MAX_HOURS_FILES = 24
const VERSION = "1.0.4"

app.get('/',function(req,res){
    
    //---Parameter link
    let linkBase64 = req.query.link
    let buff = Buffer.from(linkBase64, 'base64')
    let link = buff.toString('ascii')
    //---Parameter q   -> Calidad
    let qualityStr = req.query.q
    let hq = (qualityStr==="hq") 

    convertToAudioFile(link,res,hq)
})

app.get('/info',function(req,res){

    //---Parameter link
    let linkBase64 = req.query.link
    let buff = Buffer.from(linkBase64, 'base64')
    let link = buff.toString('ascii')
    getBasicInfo(link,res)
})



console.log("--- audioextractor ---")
console.log("Version:"+VERSION)
console.log("Listening port:"+PORT)
console.log("Purge files older than: "+MAX_HOURS_FILES + " Hours")
console.log("----------------------")
var server = app.listen(PORT,function(){ })


function getBasicInfo(address,res){
    let info = ytdl.getBasicInfo(address)
    
    info.then(
        result =>{
            let related = []
            let relacionados = result.related_videos
            relacionados.forEach( it =>{
                related.push({id:it.id,
                            title:it.title,
                            author:it.author,
                            duration:it.length_seconds})
            })
            let videoDetails = result.videoDetails
            let videoInfo = {title:videoDetails.title,
                 channel:videoDetails.ownerChannelName,
                 thumbnailUrl:videoDetails.thumbnail.thumbnails[0].url,
                 width:videoDetails.thumbnail.thumbnails[0].width,
                 height:videoDetails.thumbnail.thumbnails[0].height,
                 duration:videoDetails.lengthSeconds,
                 related:related
                 }
                 res.send(JSON.stringify(videoInfo))
        }
    )
}


function convertToAudioFile(address,res,hq){

    createDir(BASE_AUDIO_PATH)
    let hash = createHash(address) + (hq ? "hq" : "lq") + ".mp3"
    let fileLocalPath = BASE_AUDIO_PATH + path.sep + hash

    if(!fs.existsSync(fileLocalPath)){
        let total = 0
        let calidad = 'lowestaudio'
        if(hq) calidad = 'highestaudio'
        let convStream = ytdl(address,{ filter: 'audioonly' , quality: calidad})

        let writeStream = fs.createWriteStream(fileLocalPath)

        convStream.on('data', (data) => {
            writeStream.write(data)
            total = total + data.length
        })

        convStream.on('finish', () =>{
            writeStream.end()
            console.log('data converted finished:'+ readableBytes( total ))
            creaServer(fileLocalPath,res)
        })
    }
    else{
        console.log('File already loaded:' + address)
        creaServer(fileLocalPath,res)
    }

    purgueFiles(BASE_AUDIO_PATH)
}

function creaServer(fileLocalPath,res){
  
    let stat = fs.statSync(fileLocalPath)
    res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': stat.size
    });
    fs.createReadStream(fileLocalPath).pipe(res);
  }


//--- https://levelup.gitconnected.com/use-node-js-to-to-create-directories-and-files-734063ce93ec
const createDir = (dirPath) => {
    fs.mkdirSync(process.cwd() + path.sep + dirPath, { recursive: true}, (error) => {
        if(error) {
            console.error('Error creating directory:'+dirPath)
        } else{
            console.log('Audio directory created:'+dirPath)
        }

    })
}

//---https://gist.github.com/kitek/1579117
function createHash(data){
    return crypto.createHash('md5').update(data).digest("hex")

}

//----https://ourcodeworld.com/articles/read/713/converting-bytes-to-human-readable-values-kb-mb-gb-tb-pb-eb-zb-yb-with-javascript
function readableBytes(bytes) {
    var i = Math.floor(Math.log(bytes) / Math.log(1024)),
    sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    return (bytes / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + sizes[i];
}

function purgueFiles(directory){
    let ahora = moment()
    console.log("purging directory:"+directory)
    fs.readdir(directory,(err, files) => {
        if(!err){
            files.forEach( file => {
                let filePath = directory + path.sep +file
                fs.stat(filePath,function(err,stats){
                    if(!err){
                        let fileCreation = moment(stats.mtime)
                        let durTime = moment.duration(ahora.diff(fileCreation))
                        if(durTime.as('hours')>MAX_HOURS_FILES){
                            deleteFile(filePath,durTime)

                        }
                    }
                })
    
            })
        }

    })
}

function deleteFile(path,durTime){
    fs.unlink(path, (err) => {
        if(!err){
            console.log("Deleted file:" + path + " Duration (Hours):" + durTime.as('hours'))
        }
    })
}