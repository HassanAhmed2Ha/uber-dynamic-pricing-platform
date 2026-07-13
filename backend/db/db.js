const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDb() {
    if (!process.env.DB_CONNECT) {
        console.error("CRITICAL ERROR: process.env.DB_CONNECT is undefined.");
        throw new Error("DB_CONNECT is missing");
    }

    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    if (!cached.promise || mongoose.connection.readyState !== 1) {
        const opts = {
            bufferCommands: false, // Don't buffer commands in serverless
            serverSelectionTimeoutMS: 5000,
        };

        cached.promise = mongoose.connect(process.env.DB_CONNECT, opts).then((mongoose) => {
            console.log("Connected to Database (Serverless)");
            return mongoose;
        });
    }
    
    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }
    
    return cached.conn;
}

module.exports = connectToDb;