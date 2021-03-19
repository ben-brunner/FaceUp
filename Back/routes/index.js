var express = require('express');
var router = express.Router();
const uniqid = require('uniqid');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const request = require('sync-request');

cloudinary.config({
  cloud_name: `${process.env.CLOUD_NAME}`,
  api_key: `${process.env.CLOUD_KEY}`,
  api_secret: `${process.env.CLOUD_SECRET}`
});


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// Upload a photo
router.post('/upload', async (req, res) => {

  const path = '/tmp/'+uniqid()+'.jpg';

  const resultCopy = await req.files.pic.mv(path);

  const cloud = await cloudinary.uploader.upload(path);

  fs.unlinkSync(path);

  // Visage API
  const subscriptionKey = `${process.env.API_SUB_KEY}`;
  const uriBase = 'https://westcentralus.api.cognitive.microsoft.com/face/v1.0/detect';

  const params = {
  returnFaceId: 'true',
  returnFaceLandmarks: 'false',
  returnFaceAttributes: 'age,gender,smile,facialHair,glasses,emotion,hair',
  };

  const options = {
  qs: params,
  body: `{"url": "${cloud.url}" }`,
  headers: {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key' : subscriptionKey
  }
  };

  const resultVisionRaw = await request('POST', uriBase, options);
  let resultVision = await resultVisionRaw.body;
  resultVision = await JSON.parse(resultVision);
  console.log(resultVision[0].faceAttributes);

  let beard;
  if (resultVision[0].faceAttributes.facialHair.beard > 0.5) {
    beard = true;
  } else {
    beard = false;
  };

  let smile;
  if (resultVision[0].faceAttributes.smile > 0.7) {
    smile = true;
  } else {
    smile = false;
  };


  if (cloud && resultVision) {
    res.json({result: true, url: cloud.url, gender: resultVision[0].faceAttributes.gender, age : resultVision[0].faceAttributes.age, glasses: resultVision[0].faceAttributes.glasses, beard, smile, hairColor: resultVision[0].faceAttributes.hair.hairColor[0].color })
  } else {
    res.json({result: false, message: resultCopy})
  };

});

module.exports = router;
