var crypto = require('crypto')

const BASE_AUDIO_PATH_CONST = "audio"

const YOUTUBE_ARRAY = ["youtube.com","youtu.be","y2u.be"]

//---https://gist.github.com/kitek/1579117
exports.createHash = function (data){
    return crypto.createHash('md5').update(data).digest("hex")

}

exports.base_audio_path_const = function(){
    return BASE_AUDIO_PATH_CONST
}

exports.isYoutubeLink = function(url){
    let isYoutube = false
    YOUTUBE_ARRAY.forEach( item =>{
        if(url.includes(item)) isYoutube = true
    })
    return isYoutube
}