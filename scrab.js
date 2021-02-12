const fetch = require('node-fetch')
const HTMLParser = require('node-html-parser')
//const ffprobe = require('ffprobe')
const ffprobeStatic = require('ffprobe-static')
const cp = require('child_process')
const dns = require('dns')


const VIDEOPRESS_DOWNLOAD = "https://videopress.com/v/"

exports.parseBitChute = function(url,res){
    console.log("bitchute url:"+url)
    fetch(url)
    .then(respuesta => respuesta.text())
    .then(text => {
    try {
        parseBitChuteService(text,res)
    } catch (e) {
        console.log("-- Error parsing data")
        res.end("error")
    }
    })
}

function parseBitChuteService(text,res){
    const root = HTMLParser.parse(text)
    const videoNode = root.querySelector("video")
    const urlPoster = videoNode.getAttribute("poster")
    const sourceNode = videoNode.querySelector("source")
    const urlVideo = sourceNode.getAttribute("src")
    const typeVideo = sourceNode.getAttribute("type")
    const titleNode = root.querySelector("h1")
    const titleAtt = titleNode.getAttribute("id")
    let title = ""
    if(titleAtt=="video-title"){
      title = titleNode.text
    }
    let channel = ""
    let channelNode = root.querySelector(".channel-banner")
    channel = channelNode.querySelector(".name").querySelector("a").text
  
    showDataColected(urlPoster,urlVideo,title,channel,res)
  }


exports.parseAyltv = function(url,res){
    console.log("AyL.tv url:"+url)
    fetch(url)
    .then(respuesta => respuesta.text())
    .then(text => {
    try {
        parseAyLTvService(text,res)
    } catch (e) {
        console.log("-- Error parsing data")
        res.end("error")
    }
    })
}

function parseAyLTvService(text,res){
    const root = HTMLParser.parse(text)
    let title = ""
    let titleNode = root.querySelector("h1")
    title = titleNode.text
    const iframe = root.querySelector("iframe")
    const iframeSrc = iframe.getAttribute("src")
    console.log("iframeSrc="+iframeSrc)
    let videoPressUrl = VIDEOPRESS_DOWNLOAD + getVideoPressId(iframeSrc)
    console.log("videoPressUrl="+videoPressUrl)
  
    //--download videopress page
    fetch(videoPressUrl)
    .then(respuesta => respuesta.text())
    .then(text => {
      try {
        parseVideoPress(text,title,res)
      } catch (e) {
        console.log("-- Error parsing videopress data")
      }
    })
}

function parseVideoPress(text,title,res){
    let root = HTMLParser.parse(text)
    let head = root.querySelector("head")
    let metaArray = head.querySelectorAll("meta")
  
    let urlVideo = ""
    let urlPoster = ""
  
  
    metaArray.forEach(ele =>{
    
      let property = ele.getAttribute("property")
      let content = ele.getAttribute("content")
      
      if(property=="og:video:url"){
        urlVideo = content
      } else if(property=="og:image"){
        urlPoster = content
      }
  
    })
    showDataColected(urlPoster,urlVideo,title,"Adoración y Liberación",res)
}


function getVideoPressId(url){
    let parts = url.split("/")
    let lastIndex = parts.length
    let last = parts[lastIndex-1]
    return last
    }

function showDataColected(urlPoster,urlVideo,title,channel,res){
    console.log("Poster:"+urlPoster)
    console.log("Video:"+urlVideo)
    console.log("Title:"+title)
    console.log("Channel:"+channel)
    console.log("ffprovepath: "+ffprobeStatic.path)
    // ffprobe(urlVideo,{path: ffprobeStatic.path},function (err, info){
    //   if (err){
    //     console.log("error with video info:"+err)
    //     res.end("error")
    //     return
    //   }
    //   let duracion = getDuracionFromFFProbe(info)
      
    //   console.log("Duration:"+duracion)

    //   let videoInfo = {title:title,
    //     channel:channel,
    //     thumbnailUrl:urlPoster,
    //     width:10,
    //     height:10,
    //     duration:duracion,
    //     urlVideo:urlVideo,
    //     related:[]
    //     }
    //     res.type('json')
    //     res.end(JSON.stringify(videoInfo))
    // })


    let serverUrl = new URL(urlVideo)
    console.log("Hostname:"+serverUrl.hostname)
    console.log("PathName:"+serverUrl.pathname)

    dns.lookup(serverUrl.hostname, function(err, ipFound) {
      if(err){
        res.end("error")
        return
      }
      console.log("IP:"+ipFound)
      let newUrl = urlVideo.replace(serverUrl.hostname,ipFound)
      console.log("UrlReplaced:"+newUrl)
      //--- para la diración de un video: https://linuxcommandlibrary.com/man/ffprobe
      const ffProbeProcess = cp.spawn(ffprobeStatic.path,['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',urlVideo])

      ffProbeProcess.stdout.on('data', duracion => {
          console.log("Duration:"+duracion)
          console.log("-------------------------")

          let videoInfo = {title:title,
          channel:channel,
          thumbnailUrl:urlPoster,
          width:10,
          height:10,
          duration:parseInt(duracion),
          urlVideo:urlVideo,
          related:[]
          }
          res.type('json')
          res.end(JSON.stringify(videoInfo))

      })

      ffProbeProcess.stderr.on('data', data => {
        console.error(`stderr: ${data}`)
        res.end("error")
      })
    
    
    
    })
}



// function getDuracionFromFFProbe(info){
//   let duracion = 1
//   info.streams.forEach(st =>{
//     if(st.duration>duracion) duracion = st.duration
//   })
//   return parseInt(duracion)
// }