const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const multer = require("multer");
const path = require("path");
const axios = require("axios");

const { exec } = require('child_process');

const app = express();
app.set("view engine", "ejs")
app.use(express.static('public'));
const storage = multer.diskStorage({
  destination: './public/uploads',
  filename: (req, file, callback) => {
    callback(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, callback) => {
    const allowedFileTypes = ['image/jpeg', 'image/png'];
    if (allowedFileTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error('Only JPEG and PNG images are allowed.'));
    }
  }
});

async function getFoodInformation(foodName) {
  try {
    const response = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(foodName)}`);

    // Extract the relevant information from the response
    const { title, extract, content_urls } = response.data;

    return {
      title,
      extract,
      articleUrl: content_urls.desktop.page
    };
  } catch (error) {
    console.error('Error retrieving food information:', error);
    return null;
  }
}

async function getNutrientInformation(foodName) {
  try {
    const response = await axios.get(`https://api.edamam.com/api/food-database/v2/parser`, {
      params: {
        app_id: "7299ca24",
        app_key: "017aeb0f88d8e44d54e24214a089e140",
        ingr: foodName
      }
    });

    const { parsed } = response.data;

    if (parsed.length > 0) {
      const food = parsed[0].food;
      const { label, nutrients } = food;

      return {
        title: label,
        fat: nutrients.FAT,
        carbs: nutrients.CHOCDF,
        protein: nutrients.PROCNT,
        calories: nutrients.ENERC_KCAL
      };
    } else {
      console.error('No food information found');
      return null;
    }
  } catch (error) {
    console.error('Error retrieving nutrient information from Edamam:', error);
    return null;
  }
}

app.get("/", function (req, res) {
  res.render("home")
})

app.get("/upload", function (req, res) {
  res.render("upload")
})


app.post('/imageinfo', upload.single('foodImage'), (req, res) => {
  const imagePath = req.file.path;

  //// Running prediction ////
  const command = `python model/predict.py --imagePath ${imagePath}`;
  exec(command, async (error, stdout, stderr) => {
    if (error) {
      console.error(`Error during prediction: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Prediction script error: ${stderr}`);
      return;
    }

    const prediction = stdout.trim();

    imagename = path.basename(imagePath)
    
    const [foodInfo, nutrientInfo] = await Promise.all([
      getFoodInformation(prediction),
      getNutrientInformation(prediction)
    ]);

    fat = nutrientInfo.fat;
    carbs = nutrientInfo.carbs;
    protein = nutrientInfo.protein;
    calories = nutrientInfo.calories;

    res.render('imageinfo', { imagename, foodInfo, fat, carbs, protein, calories });
  });
});


app.get("/imageinfo", function (req, res) {
  res.render("imageinfo")
})






app.listen(3000, function () {
  console.log("Server Started!")
})