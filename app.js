const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const ErrorHandler = require('./Controllers/errCtr');
const appError = require('./Helpers/appError');

const authRouter = require('./Routes/authRoute');

app.use(cors());
app.use(helmet());

app.use(cookieParser());
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true })); 

app.get('/', (req, res)=>{ res.send('Welcome to Home finder API') });

app.use('/api/v1/auth', authRouter);

app.all('*', (req, res, next)=>{   
    return next(new appError(`Can't find ${req.originalUrl} on this server!`, 404)) 
});

app.use(ErrorHandler);

module.exports = app;