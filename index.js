//-- Thanks to the Library: https://github.com/fent/node-ytdl-core

var express = require('express')
var app = express()
const fs = require('fs')
const path = require('path')
const ytdl = require('ytdl-core')
var crypto = require('crypto')
var moment = require('moment')
const { get } = require('http')
var MapCache = require('map-cache')
var cache = new MapCache()

const BASE_AUDIO_PATH = "audio"
const PORT = 2000
const MAX_HOURS_FILES = 24
const VERSION = "1.0.9"

app.get('/',function(req,res){
    
    //---Parameter link
    let linkforReplace1 = req.query.link
    let linkforReplace2 = linkforReplace1.replace("-","/")
    let linkBase64 = linkforReplace2.replace("_","+")

    let buff = Buffer.from(linkBase64, 'base64')
    let link = buff.toString('ascii')
    //---Parameter q   -> Calidad
    let qualityStr = req.query.q
    let hq = (qualityStr==="hq") 

    convertToAudioFile(link,res,hq)
})

app.get('/info',function(req,res){

    //---Parameter link
    let linkforReplace1 = req.query.link
    let linkforReplace2 = linkforReplace1.replace("-","/")
    let linkBase64 = linkforReplace2.replace("_","+")

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
                            duration:0})
            })
            let videoDetails = result.videoDetails
            let videoInfo = {title:videoDetails.title,
                 channel:videoDetails.ownerChannelName,
                 thumbnailUrl:videoDetails.thumbnail.thumbnails[0].url,
                 width:videoDetails.thumbnail.thumbnails[0].width,
                 height:videoDetails.thumbnail.thumbnails[0].height,
                 duration:0,
                 related:related
                 }
                 //res.setHeader('Content-Type', 'application/json')
                 res.type('json')
                 res.end(JSON.stringify(videoInfo))
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
        console.log('Asking for video:' + address)
        try {
            let convStream = ytdl(address,{ filter: 'audioonly' , quality: calidad})

            let writeStream = fs.createWriteStream(fileLocalPath)

            convStream.on('data', (data) => {
                if(total==0) {
                    writeStream = fs.createWriteStream(fileLocalPath)
                }

                writeStream.write(data)
                total = total + data.length
            })

            convStream.on('finish', () =>{
                writeStream.end()
                console.log('data converted finished:'+ readableBytes( total ))
                creaServer(fileLocalPath,res)
            })
        }catch(err){
            console.error(err.message)
            deleteFile(fileLocalPath,0)
        }
    }
    else{
        console.log('File already loaded:' + address)
        creaServer(fileLocalPath,res)
    }

    //purgueFiles(BASE_AUDIO_PATH)
}

function creaServer(fileLocalPath,res){
  
    let stat = fs.statSync(fileLocalPath)
    res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': stat.size
    });
    fs.createReadStream(fileLocalPath).pipe(res);
    purgueFiles(BASE_AUDIO_PATH,fileLocalPath)
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

function purgueFiles(directory,nodelete){
    let ahora = moment()
    cache.set(nodelete,ahora)

    console.log("purging directory:"+directory)
    fs.readdir(directory,(err, files) => {
        if(!err){
            files.forEach( file => {
                let filePath = directory + path.sep +file

                if(cache.has(filePath)){
                    let cacheDurTime = moment.duration(ahora.diff(cache.get(filePath)))
                    if(cacheDurTime.as('hours')>MAX_HOURS_FILES){

                    }
                }else{
                    //--- no está en el cache y por tanto hay que mirar la hora de escritura
                    fs.stat(filePath,function(err,stats){
                        if(!err){
                            let fileCreation = moment(stats.mtime)
                            let durTime = moment.duration(ahora.diff(fileCreation))
                            if(durTime.as('hours')>MAX_HOURS_FILES){
                                deleteFile(filePath,durTime)
    
                            }
                            //---borrar archivos en cero o muy pequeños
                            if((stats.size<1000)&&(stats.size>=0)){
                                deleteFile(filePath,durTime)
                            }
    
                        }
                    })

                }
    
            })
        }

    })
}

function deleteFile(path,durTime){
    fs.unlink(path, (err) => {
        if(!err){
            console.log("Deleted file:" + path + " Duration (Hours):" + durTime.as('hours'))
            //--- trata de sacarlo del cache
            cache.del(path)
        }
    })
}