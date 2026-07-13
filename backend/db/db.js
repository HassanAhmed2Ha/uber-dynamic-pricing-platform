const mongoose = require('mongoose');

function connectToDb() {
    if (!process.env.DB_CONNECT) {
        console.error("CRITICAL ERROR: process.env.DB_CONNECT is undefined. Database will not connect.");
        return;
    }
    mongoose.connect(process.env.DB_CONNECT).then(() => {
        console.log("Connected to Database");
    }).catch(err => console.log(err));
}

module.exports = connectToDb;