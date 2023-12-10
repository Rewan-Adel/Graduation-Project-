const asyncHandler = require('express-async-handler');
const appError     = require('../Helpers/appError');
const cloudinary  = require('../config/cloudinary');
require('dotenv').config(); 
let data;

exports.getAll = (Model)=> asyncHandler(async(req, res)=>{
    data = await Model.find({});
    res.json({
        status: 'success',
        data
    });
});

exports.getOne = (Model)=> asyncHandler(async(req, res, next)=>{
    data = await Model.findById(req.body.id);
    
    if(!data) 
       return next(new appError('Not found!', 404))

    res.json({
        status: 'success',
        data
    })
});

exports.createOne = (Model)=> asyncHandler(async(req, res, next)=>{
    data = await Model.create(req.body);

    res.json({
        status: 'success',
        data
    })
});

exports.update = (Model)=> asyncHandler(async(req, res, next)=>{
    data = await Model.findByIdAndUpdate(req.body.id, req.body);
    
    if(!data) 
       return next(new appError('Not found!', 404))

    res.json({
        status: 'success',
        data
    })
});

exports.deleteOne = (Model)=> asyncHandler(async(req, res, next)=>{
    data = await Model.findByIdAndRemove(req.body.id, req.body);
    
    res.json({
        status: 'success',
        data
    });
});

exports.deleteAll = (Model)=> asyncHandler(async(req, res, next)=>{
    data = await Model.deleteMany(req.body);
    
    res.json({
        status: 'success',
        data
    });
});
 
exports.uploadImage = (Model)=>asyncHandler( async(req, res, next) =>{  
     if(req.body.id)
         data = await Model.findById(req.body.id);
     else  
        data = await Model.findById(req.user._id);

    if(!data)
       return next(new appError('Not found', 404));

    if(! req.file)
        return next(new appError("Please upload an image", 400));
    try{

        const img  = await cloudinary.uploader.upload(req.file.path);
        data.image.url       = img.secure_url;
        data.image.public_id = img.public_id;
    
        await data.save();
        return res.status(200).json({
            status: 'success',
            image : data.image
        });
    }catch(err){
        console.log(err);
        return next(new appError("Can't upload the image", 500));
    }
 });