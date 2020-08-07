const PORT = 3000;
const app = require('express')();
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/region', {useNewUrlParser: true, useUnifiedTopology: true});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error'));

const regionSchema = new mongoose.Schema({
    code: String,
    name: String
});

const secretKeySchema = new mongoose.Schema({
    name: String,
    email: String,
    key: String,
    expired: Date
});

const region = mongoose.model('Region', regionSchema);
const secretKey = mongoose.model('SecretKey', secretKeySchema);

app.get('/', (req, res) => {
    function sendError() {
        res.send({error: "Request rejected, please provide a valid secret key and region code"});
    }

    if (! req.query.key) {
        sendError();
    } else {
        const codeLengths = [2, 4, 6, 10];
        
        secretKey.where('key').equals(req.query.key).findOne((err, result) => {
            if (! result) sendError();
            if (! req.query.code) res.send({error: "Please provide a region code"});
            else {
                const code = req.query.code;
                const codeIndex = codeLengths.findIndex(item => item == code.length);
                const index = codeLengths[codeIndex + 1];

                function getParentType(codeLength) {
                    switch (codeLength) {
                        case 2:
                            return "province";
                        case 4:
                            return "city";
                        case 6:
                            return "disctrict";
                        case 10:
                            return "village";
                        default:
                            return "Unknown";
                    }
                }

                region.findOne({code: code}, {_id: 0}).exec((err, result) => {
                    if (err) sendError();
                    else {
                        const parent = result;

                        region.find({code: {$regex: new RegExp(`^${code}[0-9]{${index - code.length}}$`)}}, {_id: 0}).exec((err, result) => {
                            if (err) sendError();
                            res.send({
                                parent,
                                childern: result,
                                parent_type: getParentType(code.length)
                            });
                        })
                    }
                });
            }
        });
    }
});

app.post('/create_key', (req, res) => {
    const { name, email } = req.query;
    function generateKey(length) {
        let string = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let key = "";

        for (i = 0; i < length; i++)
            key += string[ Math.floor(Math.random() * (string.length - 1)) + 1  ];

        return key;
    }

    let newKey = new secretKey({name, email, key: generateKey(32), expired: Date.now()});

    newKey.save((err, result) => {
        res.send(newKey);

    });

});

app.listen(PORT, () => {
    console.log("Server running on port " + PORT); 
});