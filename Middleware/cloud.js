const cloudinary = require('../config/cloudinary');

const upload_image_to_cloud = async(data, file)=>{
    try{
        const img = await cloudinary.uploader.upload(file)
        data.image.url       = img.secure_url;
        data.image.public_id = img.public_id;
        
        return img;
    }catch(err){
        console.log(err);
        return null;
    }
};
const delete_image_from_cloud = async(public_id)=>{
    try{
        const img = await cloudinary.uploader.destroy(public_id);
        return img;
    }catch(err){
        console.log(err);
        return null;
    }
};
const upload_msg_images_to_cloud= async(newMessage, filesPath)=>{
    try{
        const img = await cloudinary.uploader.upload(filesPath)
        
        newMessage.message.image.push({
            url: img.secure_url,
            public_id: img.public_id
        });
        
        return newMessage.message.image;
    }catch(err){
        console.log(err);
        return null;
    }
};

module.exports = {
    upload_image_to_cloud,
    delete_image_from_cloud,
    upload_msg_images_to_cloud
};

