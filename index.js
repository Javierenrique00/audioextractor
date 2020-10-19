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
var convCache = new MapCache()
const ytsr = require('ytsr')
const { doesNotThrow } = require('assert')
const { stringify } = require('querystring')
const ytpl = require('ytpl')
var ffmpeg = require('ffmpeg-static')
const cp = require('child_process')


const BASE_AUDIO_PATH = "audio"
const PORT = 2000
const MAX_HOURS_FILES = 24
const VERSION = "1.3.3"

app.get('/',function(req,res){
    
    //---Parameter link
    let linkforReplace1 = req.query.link
    let linkforReplace2 = linkforReplace1.replace("-","/")
    let linkBase64 = linkforReplace2.replace("_","+")

    let buff = Buffer.from(linkBase64, 'base64')
    let link = buff.toString('ascii')
    //---Parameter q   -> Calidad
    let qualityStr = req.query.q
    let hq = (qualityStr==="hq")  //--- por defecto es lq
    
    //---Parameter tran -> Transcoding
    let transStr = req.query.tran
    let tran = (transStr==="true") //--- por defecto es false

    //---Parameter pre -> preload
    let preStr = req.query.pre
    let pre = (preStr==="true") //--- por defecto es false
    
    //---get header range
    let range = req.headers.range
    console.log("Header_range:"+range)

    convertToAudioFile(link,res,hq,range,tran,pre)
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

app.get('/search',function(req,res){

    //---Parameter question 
    let linkforReplace1 = req.query.question
    let linkforReplace2 = linkforReplace1.replace("-","/")
    let linkBase64 = linkforReplace2.replace("_","+")

    //---Parameter limit
    let limit = req.query.limit

    let buff = Buffer.from(linkBase64, 'base64')
    let question = buff.toString('ascii')

    res.type('json')
    getSearch(question,limit,res)

})

app.get('/pl',function(req,res){
//---Parameter list
let listLinkUrlEncoded = req.query.link
let linkforReplace2 = listLinkUrlEncoded.replace("-","/")
let linkBase64 = linkforReplace2.replace("_","+")

let buff = Buffer.from(linkBase64, 'base64')
let link = buff.toString('ascii')

res.type('JSON')
getPlayList(link,res)

})

app.get('/check',function(reg,res){
    res.end("ok")
})

app.get('/converted',function(reg,res){

    //---Parameter file -> Parametro opcional
    let file = reg.query.file

    res.type('json')
    serverTrans(res,file)
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
                let checkDuration = it.length_seconds
                if(isNaN(checkDuration)) checkDuration = 0
                related.push({id:it.id,
                            title:it.title,
                            author:it.author,
                            duration:checkDuration,
                            iUrl:it.video_thumbnail
                        })
            })
            let videoDetails = result.videoDetails
            let duracionSeg = parseInt( videoDetails.lengthSeconds)
            if(isNaN(duracionSeg)) duracionSeg = 0 //--asegurarse que es un numero
            let videoInfo = {title:videoDetails.title,
                 channel:videoDetails.ownerChannelName,
                 thumbnailUrl:videoDetails.thumbnail.thumbnails[0].url,
                 width:videoDetails.thumbnail.thumbnails[0].width,
                 height:videoDetails.thumbnail.thumbnails[0].height,
                 duration:duracionSeg,
                 related:related
                 }
                 //res.setHeader('Content-Type', 'application/json')
                 res.type('json')
                 res.end(JSON.stringify(videoInfo))
        }
    )
}

function getSearch(question,limit,res){

    ytsr.getFilters(question).then(async filters1 => {
        filter1 = filters1.get('Type').find(o => o.name === 'Video')

        const options = {
            limit: limit,
            nextpageRef: filter1.ref
          }
        let promise = ytsr(null,options)
    
        promise.then( results =>{

            let salida = {}
            salida.query = results.query
            salida.currentRef = results.currentRef
            salida.results = results.results
            salida.nextpageRef = results.nextpageRef
            salida.items = []
            let items = results.items
            items.forEach( item =>{
                if(item.type=="video") salida.items.push(item)
            })

            res.send(JSON.stringify(salida))

            //res.send(JSON.stringify(results))
            console.log("Search:"+question+ " Limit:"+limit)
        }).catch((reason)=>{
            console.error("Promise error:"+reason)
        }).finally(()=>{
            res.end()
        })

    }).catch ( err =>{
        console.error(err)
    })
}

function getPlayList(link,res){
    console.log("Finding Playlist:"+link)
    ytpl(link,{limit:Infinity}).then( playlist => {
        let salida = {}
        salida.id = playlist.id
        salida.url = playlist.url
        salida.title = playlist.title
        salida.items = []
        playlist.items.forEach( item =>{  
             salida.items.push({url : item.url_simple,title:item.title,thumbnail:item.thumbnail,duration:convertTimeStrtoSeconds(item.duration),author:getAuthor(item)})
        })
        salida.total_items = playlist.items.length
        salida.error = false
        res.end(JSON.stringify(salida))
    }).catch( err => {
        console.error("Error playlist:"+err)
        let error = {error:true,items:[],total_items:0}
        res.end(JSON.stringify(error))
    })

}

function getAuthor(item){
    try{
        return item.author.name
    }
    catch(err){
        return ""
    }
}

function convertTimeStrtoSeconds(timeStr){
    try{
        let fragments = timeStr.split(':')
        let s = 0
        let m = 1
        while (fragments.length > 0) {
            s += m * parseInt(fragments.pop(), 10)
            m *= 60
        }
        if(isNaN(s)) s =0
        return s

    }catch(err){
        return 0
    }

}

function serverTrans(res,filtroFile){

    let completeList = []
    let convList = []   
    //--- debe hacer el listado
    fs.readdir(BASE_AUDIO_PATH,(err, files) => {
        if(!err){

            files.forEach( file =>{
                if(file.endsWith(".opus")) {
                    if(!convCache.has(file)){
                        //--- ya hizo la conversión
                        if(filtroFile==undefined || filtroFile===file){
                            completeList.push(file)
                        }
                    }
                }
            })

            //--- mira los que es
            let cacheTemp = Object.keys(convCache.__data__)
            cacheTemp.forEach( key =>{
                if(filtroFile==undefined || filtroFile===key){
                    convList.push({file:key,msconverted:convCache.get(key)})
                }
            })

            //--- Transmite los que ha convertido
            res.end(JSON.stringify({complete:completeList,conversion:convList}))

        }else{
            //--- transmitevacio
            res.end(JSON.stringify({complete:[],conversion:[]}))
        }
    })

}

function convertToAudioFile(address,res,hq,range,tran,pre){
    createDir(BASE_AUDIO_PATH)
    let hash = createHash(address) + (hq ? "hq" : "lq") + (tran ? "t" : "f") +".opus"
    let fileLocalPath = BASE_AUDIO_PATH + path.sep + hash

    console.log("Has file:"+fs.existsSync(fileLocalPath)+" has conversion:"+ convCache.has(hash))


    if(!fs.existsSync(fileLocalPath) && !convCache.has(hash)){
        convCache.set(hash,0)

        let total = 0
        let calidad = 'lowestaudio'
        let bitRate = '32k'
        let canales = '1'
        if(hq) {
            calidad = 'highestaudio'
            bitRate = '256k'
            canales = '2'
        }
        console.log('Asking for video:' + address)
        try {
            let audioStream = ytdl(address,{ filter: 'audioonly' , quality: calidad})

            if(tran){
                let convProcess = cp.spawn(ffmpeg, [
                    // Remove ffmpeg's console spamming
                    '-loglevel', '0', '-hide_banner',
                    // Redirect/enable progress messages
                    '-progress', 'pipe:3',
                    // Audio pipe es el 4
                    '-i', 'pipe:4',
                    // Choose some fancy codes  '-c:a','aac','-b:a','64k',      //--- aac
                    // Choose some fancy codes  '-c:a','copy',                  //--- solo copia
                    // Choose some fancy codes  '-c:a','libopus','-b:a','8k',  //--- con opus
                    '-c:a','libopus','-b:a',bitRate,'-ac',canales,                        
                    // Define output container es el pipe5
                    '-f', 'ogg', 'pipe:5',
                ], {
                    windowsHide: true,
                    stdio: [
                    /* Standard: stdin, stdout, stderr */
                    'inherit', 'inherit', 'inherit',
                    /* Custom: pipe:3, pipe:4, pipe:5 */
                    'pipe', 'pipe', 'pipe',
                    ],
                })

                convProcess.on('close',()=>{
                    //--- checkea que se haya creado el archivo

                    waitFileExists(fileLocalPath,200,function(){

                        convCache.del(hash)
                        let stat = fs.statSync(fileLocalPath)
                        let partialSize = stat.size
                        if(partialSize>100){
                            console.log("Conversion finish ->"+readableBytes(partialSize))
                            if(!pre){
                                creaServer(fileLocalPath,res,range)
                            }else{
                                //--todo pre poner mensaje de confirmacion de archivo creado
                                preloadResMsg(res,"ready")
                            }
                            
                        }else{
                            console.error("Conversion with error not specified")
                            delFile(fileLocalPath)
                            //--todo pre poner de error
                            convCache.del(hash)
                            preloadResMsg(res,"error")
                        }

                    })

                })
                convProcess.stdio[3].on('data', chunk => {
                    //console.log("Avance conversion:"+chunk)
                    let lines = chunk.toString().trim().split('\n');
                    let args = {};
                    for (const l of lines) {
                      let [key, value] = l.trim().split('=');
                      args[key] = value;
                    }
                    convCache.set(hash,args["out_time_ms"])

                })
                audioStream.pipe(convProcess.stdio[4])
                convProcess.stdio[5].pipe(fs.createWriteStream(fileLocalPath))

            }else{
                let writeStream = fs.createWriteStream(fileLocalPath)

                audioStream.on('data', (data) => {
                    if(total==0) {
                        writeStream = fs.createWriteStream(fileLocalPath)
                    }
    
                    writeStream.write(data)
                    total = total + data.length
                })
    
                audioStream.on('finish', () =>{
                    writeStream.end()
                    writeStream.on('finish', ()=>{
                        console.log('data converted finished:'+ readableBytes( total ))
                        convCache.del(hash)
                        if(!pre){
                            creaServer(fileLocalPath,res,range)
                        }else{
                            //--todo pre poner mensaje de confirmacion de archivo creado
                            preloadResMsg(res,"ready")
                        }
                        
                    })
                })

                audioStream.on('error',err =>{
                    convCache.del(hash)
                    console.error(err.message)
                    delFile(fileLocalPath)
                    if(!pre){
                        serverError(res,err)
                    }else{
                        preloadResMsg(res,"error")
                    }
                })
            }

        }catch(err){
            convCache.del(hash)
            console.error(err.message)
            delFile(fileLocalPath)
            if(!pre){
                serverError(res,err)
            }else{
                preloadResMsg(res,"error")
            }
        }
    }
    else{

        if(!convCache.has(hash)){
            console.log('File already loaded:' + address)
            if(!pre){
                creaServer(fileLocalPath,res,range)
            }else{
                //--- todo pre, pone mensaje de archivo listo
                preloadResMsg(res,"ready")
            }
            
        }
        else{
            console.log('Conversion in process, please wait' + address)
            if(!pre){
                requestInProcess(fileLocalPath,res)
            }else{
                //--- todo pre, pone mensaje de archivo in conversion in process
                preloadResMsg(res,"inprocess")
            }
            
        }
    }
}

function preloadResMsg(res,resp){
    res.end(resp)
}


function requestInProcess(fileLocalPath,res){
    res.writeHead(100, {
        'Content-Type': 'audio/mpeg'
    })
    res.end("Processing "+fileLocalPath)
}

function serverError(res,msgError){
    res.writeHead(500)
    res.end(msgError)
}

//--check interval en ms
function waitFileExists(path, periodCheck,executefile) {
    let timeout = setInterval(function() {

        let file = path;
        let fileExists = fs.existsSync(file);

        console.log('Checking for: ', file);
        console.log('Exists: ', fileExists);

        if (fileExists) {
            clearInterval(timeout);
            executefile()
        }
    }, periodCheck);
};


function creaServer(fileLocalPath,res,range){
    //--- lo pone para no borrarlo mientras se envía
    let ahora = moment()
    cache.set(fileLocalPath,ahora)


    let stat = fs.statSync(fileLocalPath)
    let total = stat.size
    if(range){
        try{
            let parts = range.replace(/bytes=/, '').split('-')
            let partialStart = parts[0]
            let partialEnd = parts[1]

            let start = parseInt(partialStart,10)
            let end = partialEnd ? parseInt(partialEnd, 10) : total - 1
            let chunksize = (end - start) + 1
            
            let rstream = fs.createReadStream(fileLocalPath, {start: start, end: end})
            console.log("Pipe from file:"+fileLocalPath + " Partial Download init Byte:"+readableBytes(start)+ " Chunksize:"+readableBytes( chunksize))
            res.writeHead(206, {
                'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
                'Accept-Ranges': 'bytes', 'Content-Length': chunksize,
                'Content-Type': 'audio/mpeg'
            })
            rstream.pipe(res)
            
        }catch(err){
            console.error("ERROR partial message:"+err.message)
        }
        
    }else{
    
        console.log("Pipe from file:"+fileLocalPath + " Complete, size:"+ readableBytes(total))
        res.set("Accept-Ranges","bytes")
        res.writeHead(200, {
            'Content-Type': 'audio/mpeg',
            'Content-Length': total
        });
        fs.createReadStream(fileLocalPath).pipe(res)
    }

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

    //console.log("purging directory:"+directory)
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

function delFile(path){
    fs.unlink(path, (err) => {
        if(!err){
            console.log("Deleted file:" + path)
        }
    })
}