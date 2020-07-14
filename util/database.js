const mongodb = require('mongodb')
const MongoClient = mongodb.MongoClient;
const uri = "";
let db;
// const client = new MongoClient(uri, {
//     useNewUrlParser: true
// });
// client.connect(err => {
//     const collection = client.db("test").collection("devices");
//     // perform actions on the collection object
//     client.close();
// });

const mongoConnect = (callback) => {
    MongoClient.connect(uri)
        .then(client => {
            console.log('Connected');
            db = client.db();
            callback();
        })
        .catch(err => {
            console.log(err);
        })
}

const getDb = () => {
    if(db){
        return db;
    }
    throw 'No Database Found!'
}

exports.mongoConnect = mongoConnect;
exports.getDb = getDb;
