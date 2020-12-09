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
var resolve = require('path').resolve
const convertModule = require("./conv")


const BASE_AUDIO_PATH = "audio"
const PORT = 2000
const MAX_HOURS_FILES = 24
const VERSION = "1.4.1"

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

    convertToAudioFile(link,res,hq,range,tran,pre).then((exitoso)=>{
        console.log("-CONVERSION DE AUDIO EXITOSA:"+exitoso)
    }).catch((error) =>{
        console.log("-CONVERSION CON ERROR:"+error)
    })
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

app.get('/download',function(reg,res){

    //---Parameter file -> Parametro opcional
    let file = reg.query.file

    //---get header range
    let range = reg.headers.range
    console.log("Header_range:"+range)

    res.type('json')
    serverTransmit(res,file,range)
})

app.get('/tomp3',function(reg,res){

    //---Parameter link
    let linkforReplace1 = reg.query.link
    let linkforReplace2 = linkforReplace1.replace("-","/")
    let linkBase64 = linkforReplace2.replace("_","+")

    let buff = Buffer.from(linkBase64, 'base64')
    let link = buff.toString('ascii')

    convertModule.convert(link,res,convCache)

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
                            author:it.author.name,
                            duration:checkDuration,
                            iUrl:it.thumbnails[0].url  //---antes era: iUrl:it.video_thumbnail
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

function serverTransmit(res,file,range){
    let fileLocalPath = BASE_AUDIO_PATH + path.sep + file
    console.log("Downloadig file:"+file)
    if(fs.existsSync(fileLocalPath)){
        //creaServer(fileLocalPath,res,range)
        serveFile(fileLocalPath,res)
    }else{
        //--- no existe el archivo devuelve error
        serverError(res,"No file found")
    }
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

        //console.log("Playlist-->"+JSON.stringify(playlist)) 

        let salida = {}
        salida.id = playlist.id
        salida.url = playlist.url
        salida.title = playlist.title
        salida.items = []
        playlist.items.forEach( item =>{  
             salida.items.push({url : item.shortUrl,title:item.title,thumbnail:item.thumbnail,duration:convertTimeStrtoSeconds(item.duration),author:getAuthor(item)})
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

function checkCacheConv(){
    let forDelete = []
    let cacheTemp = Object.keys(convCache.__data__)
    cacheTemp.forEach( key =>{
        let dataCache = convCache.get(key)
        let ahora = Date.now()


        if(((ahora-dataCache.timeSet)>15000) && (dataCache.ms == 0) && (dataCache.size == 0)) forDelete.push(key)  //--15 segundos para transcoding que no avanza
        if(((ahora-dataCache.timeSet)>600000) && (dataCache.ms == 0)) forDelete.push(key) //--10 minutos de conversion para no transcoding
        if(((ahora-dataCache.timeSet)>900000) && (dataCache.ms > 0)) forDelete.push(key) //--15 minutos de conversion con transcoding max
    })
    forDelete.forEach( key =>{
        console.log("Deleting posible stuck conversion:"+key)
        delFile(convCache.get(key).file)
        convCache.del(key)
    })
}

function serverTrans(res,filtroFile){

    checkCacheConv()
    let completeList = []
    let convList = []   
    //--- debe hacer el listado
    fs.readdir(BASE_AUDIO_PATH,(err, files) => {
        if(!err){

            files.forEach( file =>{
                if(file.endsWith(".opus") || file.endsWith(".mp3")) {
                    if(!convCache.has(file)){
                        //--- ya hizo la conversión
                        if(filtroFile==undefined || filtroFile===file){
                            completeList.push(file)
                        }
                    }
                }
            })


            //--selecciona los que están en proceso de conversion
            let cacheTemp = Object.keys(convCache.__data__)
            cacheTemp.forEach( key =>{
                if(filtroFile==undefined || filtroFile===key){
                    convList.push({file:key,msconverted:convCache.get(key).ms,sizeconverted:convCache.get(key).size})
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

    console.log("hash="+hash+"   Has file:"+fs.existsSync(fileLocalPath)+" has conversion:"+ convCache.has(hash))

    checkCacheConv()

    if(!fs.existsSync(fileLocalPath) && !convCache.has(hash)){
        convCache.set(hash,{ms:0,timeSet:Date.now(),file:fileLocalPath,size:0})

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
            return new Promise((resolve,reject) => {
                let audioStream = ytdl(address,{ filter: 'audioonly' , quality: calidad})

                if(tran){
                    let convProcess = cp.spawn(ffmpeg, [
                        '-loglevel', '0', '-hide_banner',
                        '-progress', 'pipe:3',
                        '-i', 'pipe:4',
                        '-c:a','libopus','-b:a',bitRate,'-ac',canales,                        
                        '-f', 'ogg', 'pipe:5',
                    ], {
                        windowsHide: true,
                        stdio: [
                        'inherit', 'inherit', 'inherit',
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
                                resolve("OK")
                            }else{
                                console.error("Conversion with error not specified")
                                delFile(fileLocalPath)
                                //--todo pre poner de error
                                convCache.del(hash)
                                preloadResMsg(res,"error")
                                reject("error")
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
                        convCache.set(hash,{ms:args["out_time_ms"],timeSet:Date.now(),file:fileLocalPath,size:0})
    
                    })
                    audioStream.pipe(convProcess.stdio[4])
                    convProcess.stdio[5].pipe(fs.createWriteStream(fileLocalPath))
    
                }else{
                    let writeStream = fs.createWriteStream(fileLocalPath)
    
                    audioStream.on('data', (data) => {

                        //console.log("Writing conversion data avance:"+readableBytes( total ))
        
                        convCache.set(hash,{ms:0,timeSet:Date.now(),file:fileLocalPath,size:total})
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
                            resolve("OK")
                        })
                    })
    
                    audioStream.on('error',(err) =>{
                        console.error("----------------------------- error sacando del cache hash:"+hash)
                        convCache.del(hash)
                        console.error(err.message)
                        delFile(fileLocalPath)
                        if(!pre){
                            serverError(res,err)
                        }else{
                            preloadResMsg(res,"error")
                        }
                        reject("error")
                    })
                }

            })
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

    return new Promise((resolve, reject) => {
        resolve("OK")
      }) 
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


function serveFile(fileLocalPath,res){
    let ahora = moment()
    cache.set(fileLocalPath,ahora)

    let fullPath = resolve(fileLocalPath)
    console.log("Serving file:"+fullPath)
    res.sendFile(fullPath)
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