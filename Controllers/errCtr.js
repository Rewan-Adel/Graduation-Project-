const appError = require('../Helpers/appError');

const devErrorHandler = ( res, error)=>{
    res.status(error.statusCode).json({
       status     : error.status,
       message    : error.message,
       stackTrace : error.stack
    });
};

const prodErrorHandler = (res, error)=>{
    if(error.isOperational){
        res.status(error.statusCode).json({
            status  : error.status,
            message : error.message
        });
    }else{
        console.log("Error ", error)
        res.status(500).json({
            status  : 'error',
            message : 'something went wrong!',
            error : error
        });
    }
}

const duplicateErrorHandler = (error)=>{
    const msg = error.errors[0].message;
    return new appError(msg, 400);
};
const castErrorHandler = (error)=>{
    const msg = `Invalid value ${error.value} for field ${error.path}`;
    return new appError(msg, 400);
};
const validateErrorHandler = (error)=>{
    const errorsMassages = Object.values(error.errors).map(val => val.message)
    const msg = errorsMassages.join('. ');
    return new appError(msg, 400);
};

module.exports = (error, req, res, next )=>{
    error.statusCode = error.statusCode || 500 ;
    error.status = error.status || 'error' ;

    if(process.env.NODE_ENV == 'development'){
        devErrorHandler(res, error);
    }
    else{
        if(error.name === 'CastError')       error = castErrorHandler(error);
        prodErrorHandler(res, error);
    }

};